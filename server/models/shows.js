"use strict";

var mongoose = require('mongoose'),
    models = require('../models'),
    Schema = mongoose.Schema,
    async = require('async'),
    util = require('util'),
    _ = require('lodash'),
    moment = require('../moment-timezone'),
    Types = Schema.Types;

var schema = new Schema({
    title: String,
    description: { type: Types.Text },
    channel: [{ type: Types.ObjectId, ref: 'channels', required: true}],
    status: { type: String, enum: ['draft', 'on-air', 'archived'], default: 'draft'},
    archive_url: String,
    start_time: {type: Types.Time},
    end_time: {type: Types.Time},
    date: { type: Date },
    picture: { type: Types.Filepicker, widget: 'FilepickerPictureWidget' },
    broadcaster: [
        { type: Types.ObjectId, ref: 'users'}
    ],
    default_info_item: {
        title: String,
        text: Types.Text,
        image: { type: Types.Filepicker, widget: 'FilepickerPictureWidget' },
        url: String
    },
    lineup: [{
        lineupItem: { type: Types.ObjectId, ref: 'infoItems', socket: true },
        timestamp: String
    }],
    url: String,
    old_id: Number,
    date_utc: { type: Date }
});

schema.methods.toString = function () {
    return this.title;
};

schema.pre('validate', function(next, done) {
    if (!this.channel || this.channel.length === 0) {
        console.error("show %s has no channel", this.title);

        return done(new Error("Missing channel!"));
    }

    var url = this.url;

    if (!url) {
        url = '/' + this.title;
    }

    url = url.replace(/[\?\'\"\@\!\#\$\%\^\&\*\(\)\+\=\_\~\{\}\[\]\\\|\,\;\:]/g, "")
        .replace(/ +/g, "-")
        .replace(/\-+/g, '-')
        .replace(/(?:^\-|\-$)/g, '');

    if (url.substr(0,1) !== '/')
        url = '/' + url;

    this.url = url.toLowerCase();

    if (this.start_time && this.date) {
        var parts = this.start_time.split(":"),
            israelDate = moment.tz(this.date, "Israel"),
            year = israelDate.year(),
            month = israelDate.month(),
            date = israelDate.date();

        this.date_utc = moment.tz(
            {
                year: year,
                month: month,
                date: date,
                hour: +parts[0],
                minute: +parts[1]
            }, "Israel").toDate();
    }

    function validateLineupTiming(show) {
        if (show.lineup.length === 0) {
            return null;
        }

        var lastDuration = show.lineup[0].timestamp;

        for (var i=1;i<show.lineup.length;i++) {
            var currentTimestamp = show.lineup[i].timestamp;
            if (currentTimestamp < lastDuration) {
                return show.lineup[i].timestamp;
            }

            if (show.start_time && show.end_time) {
                var endTime = moment.duration(show.end_time),
                    startTime = moment.duration(show.start_time),
                    isMidnight = endTime < startTime;

                if (isMidnight) {
                    endTime = endTime.add('days', 1);
                }

                var showDuration = endTime.subtract(startTime),
                    currentDuration = moment.duration(currentTimestamp);

                if (currentDuration >= showDuration) {
                    return "Show length is shorter then " + show.lineup[i].timestamp;
                }
            }

            lastDuration = currentTimestamp;
        }

        return null;
    }

    var errMsg = validateLineupTiming(this);

    if (errMsg) {
        console.log("%s %s", this.title, errMsg);

        var err = new Error();
        err.errors = {lineup: new Error("Lineup timing is screwy!")};
        err.name = util.format("Lineup timing is screwy! (%s)", errMsg);

        return done(err);
    }

    next();
});

schema.path('url').validate(function(v, callback){
    var self = this;
    async.each(['posts', 'shows', 'navigation', 'channels', 'users'], function(item, cb){
        var query = self.db.model(item).findOne().where('url', self.url);

        if('shows' == item) {
            query.ne('_id', self._id);
        }

        query.exec(function(err, url){
            cb(err || url);
        });

    }, function(err){
        callback(!err);
    });
}, 'url already exists');

schema.statics.lastShow = function (callback) {
    var shows = this,
        currentTime = new Date();


    shows.findOne()
        .populate('broadcaster')
        .populate('channel')
        .populate('lineup.lineupItem')
        .sort({ date_utc: -1})
        .where({ date_utc: { $lte:  currentTime}})
        .where({ $or : [{'status': 'archived', archive_url: { "$ne": ''}}, {'status': 'on-air'}]})
        .lean()
        .exec(function (err, show) {
            if (err) {
                throw err;
            }
            parseShowData(show, function(err, results){
                shows.findPrevAndNext(results, function(err, prev_next){
                    if (results) {
                        results.prev_next = prev_next;
                    }
                    callback(err, results);
                });
            });
        });
};

schema.statics.firstShow = function (channel_id, callback) {
    var shows = this;
    shows.findOne()
        .sort({ date_utc: 1})
        .where('channel', channel_id)
        .where({'status': 'archived', archive_url: { "$ne": ''}})
        .lean()
        .exec(function (err, show) {
            callback(err, show);
        });
};

schema.statics.showById = function (id, callback) {
    var shows = this;
    shows
        .findById(id)
        .populate('lineup.lineupItem')
        .populate('broadcaster')
        .populate('channel')
        .exec(function (err, res_show) {
            if (err) {
                throw err;
            }

            if(res_show.url) {
                parseShowData(res_show.toObject(), function(err, results){
                    shows.findPrevAndNext(results, function(err, prev_next){
                        results.prev_next = prev_next;
                        callback(err, results);
                    });
                });
            } else {
                res_show.save(function(err, show){
                    var new_show = res_show.toObject();
                    new_show.url = show.url;
                    parseShowData(new_show, function(err, results){
                        shows.findPrevAndNext(results, function(err, prev_next){
                            results.prev_next = prev_next;
                            callback(err, results);
                        });
                    });
                });
            }
        });
};

schema.statics.showByUrl = function (url, callback) {
    var shows = this;
    shows
        .findOne()
        .where('url', '/' + url)
        .populate('lineup.lineupItem')
        .populate('broadcaster')
        .populate('channel')
        .lean()
        .exec(function (err, res_show) {
            if (err) {
                throw err;
            }
            parseShowData(res_show, function(err, results){
                shows.findPrevAndNext(results, function(err, prev_next){
                    if (!results) {
                        return callback(err, results);
                    }

                    results.prev_next = prev_next;
                    callback(err, results);
                });
            });
        });
};

schema.statics.findPrevAndNext = function(show, callback) {
    if (!show) {
        return callback();
    }

    var shows = this,
        curr_show = show,
        base_query = shows
            .findOne()
            .where({ $or : [{'status': 'archived', archive_url: { "$ne": ''}}, {'status': 'on-air'}]})
            .populate('broadcaster')
            .populate('channel')
            .populate('lineup.lineupItem')
            .lean();

    var q1 = base_query.toConstructor();

    async.parallel(
        [
            function(callback) {
                q1().where({ date_utc: { $gt: curr_show.date_utc }}).sort({ date_utc: 1}).exec(function(err, show) {
                    if (show) {
                        show = show._id;
                    }

                    callback(err, show);
                });
            },
            function(callback) {
                q1().where({ date_utc: { $lt: curr_show.date_utc }}).sort({ date_utc: -1}).exec(function(err, show) {
                    if (show) {
                        show = show._id;
                    }

                    callback(err, show);
                });
            }
        ],
        function(err, shows) {
            if (err) {
                return callback(err);
            }

            return callback(null, {next_show: shows[0], prev_show: shows[1]});
        });
};

schema.statics.recentShows = function (cbk) {
    var shows = this,
        current_date = Date.now();

    shows
        .find()
        .populate('broadcaster')
        .populate('channel')
        .where({ $or : [{'status': {$in: ['archived']}, archive_url: { "$ne": ''}}, {'status': 'on-air'}]})
        .sort({date_utc: -1})
        .where({ date_utc: { $lt: current_date }})
        .lean()
        .exec(function (err, res) {
            shows.setShowPicture(res, function(results){
                cbk(err, results);
            });
        });
};

schema.statics.showsByChannel = function (channel_id, limit) {
    return this
        .find()
        .where('channel', channel_id)
        .populate('channel')
        .populate('broadcaster')
        .where({ $or : [{'status': {$in: ['archived']}, archive_url: { "$ne": ''}}, {'status': 'on-air'}]})
        .limit(limit)
        .sort({date_utc: -1})
        .lean()
        .exec();
};

schema.statics.showsByBroadcaster = function (broadcaster_id, limit) {
    return this
        .find()
        .where('broadcaster', broadcaster_id)
        .populate('channel')
        .populate('broadcaster')
        .where({ $or : [{'status': {$in: ['archived']}, archive_url: { "$ne": ''}}, {'status': 'on-air'}]})
        .limit(limit)
        .sort({date_utc: -1})
        .lean()
        .exec();
};

schema.statics.setShowPicture = function(shows, cbk){
    var config;
    models.config.getConfig(function(conf){
        config = conf;
        _.each(shows, function(show){
            if (!show) {
                return;
            }

            var channel = show.channel[0] ? show.channel[0] : show.channel;
            var default_image = channel && channel.default_info_item && channel.default_info_item.image && channel.default_info_item.image !== "" ? channel.default_info_item.image : config.default_picture;
            if(show.default_info_item){
                if(!show.default_info_item.picture || show.default_info_item.picture === "" ) {
                    show.default_info_item.image = default_image;
                }
            } else {
                show.default_info_item = {
                    picture : default_image
                };
            }

            if (show.status == "on-air") {
                show.archive_url = config.default_live_url;
                show.archive_aac_url = config.default_live_aac_url;
            }

            if(!show.picture || show.picture === "") {
                show.picture = channel.picture;
            }
        });

        cbk(shows);
    });
};

function fakeShowData() {
    var show2 = {
        "_id":"54ac32f4aee290617c006039",
        "title":"NADAV132",
        "description":"",
        "archive_url":"http://pod.icast.co.il/4dfafc9f-905c-48cb-9b06-8383f9939a93.icast.mp3",
        "date":"2015-01-06T13:00:00.000Z",
        "start_time":"15:00",
        "end_time":"18:00",
        "picture":{
            "url":"https://www.filepicker.io/api/file/cCgS99ouSCmaTWTeHktq"
        },
        "url":"/nadav132",
        "lineup":[
            {
                "lineupItem":{
                    "_id":"53736ffc0158183811c06eed",
                    "artist":"Kelis",
                    "label":"Ninja Tune",
                    "title":"Jerk Ribs",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "timestamp":"00:01:30",
                "_id":"54dc9ab74c30d700008ab2d5"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f3aee290617c006031",
                    "artist":"Pixies",
                    "label":"4AD",
                    "title":"Stormy Weather",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "timestamp":"00:03:30",
                "_id":"54dc9ab74c30d700008ab2d4"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f3aee290617c006032",
                    "artist":"The Go! Team",
                    "label":"Memphis Industries",
                    "title":"T.O.R.N.A.D.O.",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "timestamp":"00:08:40",
                "_id":"54dc9ab74c30d700008ab2d3"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f4aee290617c006033",
                    "artist":"Jamie Lidell",
                    "label":"Warp",
                    "title":"Hurricane",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "timestamp":"00:10:40",
                "_id":"54dc9ab74c30d700008ab2d2"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f4aee290617c006034",
                    "artist":"Shuggie Otis",
                    "label":"Epic",
                    "title":"Hurricane",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "timestamp":"00:14:05",
                "_id":"54dc9ab74c30d700008ab2d1"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f4aee290617c006035",
                    "artist":"Charles Bradley",
                    "label":"Daptone/Dunham Records",
                    "title":"Hurricane",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "timestamp":"00:16:10",
                "_id":"54dc9ab74c30d700008ab2d0"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f4aee290617c006036",
                    "artist":"Carol Douglas",
                    "label":"Midland International Records",
                    "title":"A Hurricane Is Coming Tonite",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "timestamp":"00:19:30",
                "_id":"54dc9ab74c30d700008ab2cf"
            },
            {
                "lineupItem":{
                    "_id":"54ac3185aee290617c004d51",
                    "artist":"Gloria Jones",
                    "label":"Capitol",
                    "title":"Windstorm",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "timestamp":"00:23:34",
                "_id":"54dc9ab74c30d700008ab2ce"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f4aee290617c006037",
                    "artist":"Bob James",
                    "label":"CTI Records",
                    "title":"Storm King",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "timestamp":"00:27:25",
                "_id":"54dc9ab74c30d700008ab2cd"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f4aee290617c006038",
                    "artist":"Gnarls Barkley",
                    "label":"Downtown/Atlantic",
                    "title":"Storm Coming",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "timestamp":"00:30:19",
                "_id":"54dc9ab74c30d700008ab2cc"
            },
            {
                "lineupItem":{
                    "_id":"537370020158183811c0b4ec",
                    "artist":"Django Django",
                    "label":"Because",
                    "title":"Storm",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "timestamp":"00:33:35",
                "_id":"54dc9ab74c30d700008ab2cb"
            },
            {
                "lineupItem":{
                    "_id":"53736ffd0158183811c0786c",
                    "artist":"Hot Chip",
                    "label":"Domino",
                    "title":"Dark and Stormy",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "timestamp":"00:37:18",
                "_id":"54dc9ab74c30d700008ab2ca"
            }
        ],
        "default_info_item":{
            "image":{
                "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
            }
        },
        "broadcaster":[
            {
                "_id":"531ccf0c46f0de0b004f9408",
                "first_name":"נדב",
                "last_name":"רביד",
                "picture":{
                    "url":"https://www.filepicker.io/api/file/2feJVrZuTROS3LeG5CE0"
                },
                "url":"/nadav-ravid"
            }
        ],
        "status":"archived",
        "prev_next":{
            "next_show":null,
            "prev_show":"54ac32f3aee290617c00602f"
        }
    };

    var show3 = {
        "_id":"54ac32f4aee290617c006039",
        "title":"NADAV132",
        "description":"",
        "archive_url":"http://pod.icast.co.il/4dfafc9f-905c-48cb-9b06-8383f9939a93.icast.mp3",
        "date":"2015-01-06T13:00:00.000Z",
        "start_time":"15:00",
        "end_time":"18:00",
        "picture":{
            "url":"https://www.filepicker.io/api/file/cCgS99ouSCmaTWTeHktq"
        },
        "url":"/nadav132",
        "lineup":[
            {
                "lineupItem":{
                    "_id":"53736ffc0158183811c06eed",
                    "__v":0,
                    "artist":"Kelis",
                    "label":"Ninja Tune",
                    "title":"Jerk Ribs",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "_id":"54dc9ab74c30d700008ab2d5"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f3aee290617c006031",
                    "artist":"Pixies",
                    "label":"4AD",
                    "title":"Stormy Weather",
                    "__v":0,
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "_id":"54dc9ab74c30d700008ab2d4"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f3aee290617c006032",
                    "artist":"The Go! Team",
                    "label":"Memphis Industries",
                    "title":"T.O.R.N.A.D.O.",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "_id":"54dc9ab74c30d700008ab2d3"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f4aee290617c006033",
                    "artist":"Jamie Lidell",
                    "label":"Warp",
                    "title":"Hurricane",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "_id":"54dc9ab74c30d700008ab2d2"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f4aee290617c006034",
                    "artist":"Shuggie Otis",
                    "label":"Epic",
                    "title":"Hurricane",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "_id":"54dc9ab74c30d700008ab2d1"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f4aee290617c006035",
                    "artist":"Charles Bradley",
                    "label":"Daptone/Dunham Records",
                    "title":"Hurricane",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "_id":"54dc9ab74c30d700008ab2d0"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f4aee290617c006036",
                    "artist":"Carol Douglas",
                    "label":"Midland International Records",
                    "title":"A Hurricane Is Coming Tonite",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "_id":"54dc9ab74c30d700008ab2cf"
            },
            {
                "lineupItem":{
                    "_id":"54ac3185aee290617c004d51",
                    "artist":"Gloria Jones",
                    "label":"Capitol",
                    "title":"Windstorm",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "_id":"54dc9ab74c30d700008ab2ce"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f4aee290617c006037",
                    "artist":"Bob James",
                    "label":"CTI Records",
                    "title":"Storm King",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "_id":"54dc9ab74c30d700008ab2cd"
            },
            {
                "lineupItem":{
                    "_id":"54ac32f4aee290617c006038",
                    "artist":"Gnarls Barkley",
                    "label":"Downtown/Atlantic",
                    "title":"Storm Coming",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "_id":"54dc9ab74c30d700008ab2cc"
            },
            {
                "lineupItem":{
                    "_id":"537370020158183811c0b4ec",
                    "artist":"Django Django",
                    "label":"Because",
                    "title":"Storm",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "_id":"54dc9ab74c30d700008ab2cb"
            },
            {
                "lineupItem":{
                    "_id":"53736ffd0158183811c0786c",
                    "artist":"Hot Chip",
                    "label":"Domino",
                    "title":"Dark and Stormy",
                    "image":{
                        "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"
                    }
                },
                "_id":"54dc9ab74c30d700008ab2ca"
            }
        ],
        "default_info_item":{
            "image":{
                "url":"https://www.filepicker.io/api/file/iZ07firRXehVQgkVWQp1"

            }
        },
        "status":"archived",
        "prev_next":{
            "next_show":null,
            "prev_show":"54ac32f3aee290617c00602f"
        }
    };
}

function deepFilter(obj, includedItems) {
// todo: impl
    return obj;
}

schema.post('save', function() {
    if (this._originalStatus == 'draft' && this.status == 'on-air') {
        return global.registry.socketio.sockets.emit('on air', this.toObject());
    }

    if (global.registry.socketio) {
        var self = this;
        models.shows.showById(self._id, function (err, show) {
            function filterShowProperties(show) {
                var allowedProps = {
                    ".": ["_id", "title", "description", "archive_url", "date", "start_time", "end_time", "url"],
                    "picture": ["url"],
                    "lineup": ["_id", {lineupItem: ["artist", "label", "title", {image: "url"}]}]
                };

                return deepFilter(show, allowedProps);
            }

            show = filterShowProperties(show);
            global.registry.socketio.sockets.emit('item update', show);
        });
    }
});

schema.post('init', function(show) {
    this._originalStatus = show.status;
});

var parseShowData = function(show, callback){
    models.shows.setShowPicture([show], function(results) {
        var res_show = results[0];
        if (!res_show || !res_show.lineup) {
            callback(null, res_show);
            return;
        }
        async.each(show.lineup, function (item, cbk) {
            if (!item.lineupItem) {
                item.comments = [];
                cbk(null);
                return;
            }
            if (!item.lineupItem.image) {
                item.lineupItem.image = show.default_info_item.image;
            }
            models.comments.getCommentsByTypeAndEntity(item.lineupItem._id, 'info_item').then(function (comments) {
                item.comments = comments;
                cbk();
            }).end();
        }, function (err) {
            callback(err, show);
        });
    });
};


schema.statics.search = function (term) {
    var Shows = this;
    var p = mongoose.model("users").search("term").then(function (brodcasters) {
        var bIds = _.pluck(brodcasters, '_id');
        var re = new RegExp(term, 'ig');
        var q = Shows.find({
            $or: [
                {title: re},
                {description: re},
                {broadcaster: {$in: bIds}}
            ]
        });
        return q.exec();
    });
    return p;
};



schema.formage = {
    list: ['date', 'channel', 'title', 'description', 'broadcaster', 'picture'],
    list_populate: ['navigation', 'channel', 'broadcaster'],
    filters: ['status', 'channel', 'broadcaster'],
    search: ['title', 'description', 'url'],
    sortable: '-date'
};

module.exports = schema;
