"use strict";

var formage = require('formage'),
    models = require('./models'),
    mysql = require('mysql'),
    registry = require('./registry'),
    async = require('async'),
    util = require('util'),
    moment = require('./moment-timezone'),
    mongoose = require('mongoose');


var Schema = mongoose.Schema,
    Types = Schema.Types,
    config = {
        host: 'kzradio.net',
        user: 'sync_user',
        password: 'leader supply lead ants',
        database: 'kzradio_wp'
    },
    schema = new Schema({
        post_id: {type: Number, unique: true},
        post_type: {type: String, enum: ['channels', 'shows']},
        timestamp: {type: Date},
        import_object: {type: Types.ObjectId},
        error: {type: String} // Should have an error if not succeed
    }),
    imports = mongoose.model('imports', schema);

function getShowChannels(connection, showId, callback) {
    connection.query(
        "select p2p_from as channel_id " +
        "from wp_p2p " +
        "where p2p_to = ? and p2p_type = 'channels_to_shows'",
        [showId],
        function (err, results) {
            if (err) {
                console.error('Error importing show channels: %s', err);
                return callback(err);
            }

            var channelIds = results.map(function (x) { return parseInt(x.channel_id); });

            models.channels.where("old_id").in(channelIds).exec(function (err, channels) {
                if (err) {
                    console.error('Error matching show channels: %s', err);
                    return callback(err);
                }

                if (channels.length !== channelIds.length) {
                    return callback(new Error(util.format("Missing mapping to old show id %s", channelIds)));
                }

                callback(null, channels);
            });
        }
    );
}

function createLineupItem(postTitle, timestamp) {
    postTitle.item_type = "track";

    return function(callback) {
        models.infoItems.findOneAndUpdate(
            {
                $and: [
                    {artist: postTitle.artist},
                    {title: postTitle.title},
                    {label: postTitle.label}
                ]
            },
            {
                $setOnInsert: postTitle
            },
            {
                upsert: true
            },
            function (err, infoItem) {
                if (err) {
                    return callback(err);
                }

                if (!infoItem) {
                    return;
                }

                if (!infoItem._id) {
                    console.error("missing track id %s", JSON.stringify(infoItem));
                }

                callback(null, {
                    lineupItem: infoItem._id ? infoItem._id : null,
                    timestamp: timestamp
                });
            }
        );
    };
}

function parseTitle(postTitle) {
    var artist,
        label,
        s = postTitle.indexOf("-"),
        s2 = postTitle.indexOf("\u2013");

    if (s2 >= 0 && (s2 < s || s < 0)) {
        s = s2;
    }

    if (s >= 0) {
        artist = postTitle.substr(0, s).trim();
        postTitle = postTitle.substr(s + 1);
    }

    s = postTitle.indexOf("//");

    if (s >= 0) {
        label = postTitle.substr(s + 2).trim();
        postTitle = postTitle.substr(0, s);
    } else {
        s = postTitle.indexOf("(");
        if (s >= 0) {
            label = postTitle.substr(s + 1).trim();
            if (label.length > 0 && label[label.length - 1] == ')') {
                label = label.substr(0, label.length - 1).trim();
            }

            postTitle = postTitle.substr(0, s);
        }
    }

    var result = {};

    result.title = postTitle.trim();

    if (artist) {
        result.artist = artist.trim();
    }

    if (label) {
        result.label = label.trim();
    }

    //console.log("parse title %s => %s", originalTitle, JSON.stringify(result));
    return result;
}

var formatDateTime = function(minutes, seconds) {
    var hour = Math.floor(minutes / 60);

    minutes = minutes - (hour * 60);

    return ('0' + hour).substr(-2, 2) + ':' +
        ('0' + minutes).substr(-2, 2) + ':' +
        ('0' + seconds).substr(-2, 2);
};


function getShowLineup(connection, showId, callback) {
    connection.query(
        "select p.ID, p.post_title, convert(ppm.meta_value, signed) as minute, " +
        "convert(pps.meta_value, signed) as second " +
        "from wp_posts as p " +
        "  join wp_p2p as pp on pp.p2p_to = p.ID and pp.p2p_type = 'shows_to_items' and pp.p2p_from = ? " +
        "  left join wp_p2pmeta as ppm on ppm.p2p_id = pp.p2p_id and ppm.meta_key = 'min' " +
        "left join wp_p2pmeta as pps on pps.p2p_id = pp.p2p_id and pps.meta_key = 'sec' " +
        "order by minute, second",
        [showId],
        function (err, results) {
            if (err) {
                console.log('Error importing show channels: ' + err);
                return callback(err);
            }

            if (results.length === 0) {
                return callback(null, results);
            }

            var tasks = [];

            for (var i = 0; i < results.length; i++) {
                var postTitle = parseTitle(results[i].post_title),
                    timestamp = formatDateTime(results[i].minute, results[i].second);

                tasks.push(createLineupItem(postTitle, timestamp));
            }

            async.parallel(tasks, callback);
        });
}

function writeImport(postId, postType, importObjectId, error, callback) {
    var val = {
        post_id: postId,
        post_type: postType,
        timestamp: new Date(),
        import_object: importObjectId,
        error: error
    };

    imports.findOneAndUpdate(
        {
            post_id: postId
        },
        val,
        {
            upsert: true
        },
        callback
    );
}

function parse12Date(date) {
    return new Date(Date.UTC(parseInt(date.substr(0, 4)), parseInt(date.substr(4, 2)) - 1, parseInt(date.substr(6, 2)), +date.substr(8, 2), +date.substr(10, 2)));
}

function parse12Time(date) {
    return date.substr(8, 2) + ':' + date.substr(10, 2);
}

function importShow(connection, showId, callback) {
    getShowChannels(connection, showId, function (err, channels) {
        if (err) {
            return writeImport(showId, 'shows', null, err, callback);
        }

        var broadcasters = [];
        // Get broadcasters from channels and set channels array to be channel ids array
        for (var i = 0; i < channels.length; i++) {
            var channel = channels[i];
            channels[i] = channel._id;
            if (channel.broadcaster) {
                channel.broadcaster.forEach(function (x) {
                    broadcasters.push(x);
                });
            }
        }

        // Make broadcasters list distinct
        broadcasters = broadcasters.filter(function (e, p) {
            return broadcasters.indexOf(e) == p;
        });

        connection.query(
            "select p.post_title, " +
            "       sd.meta_value as description, " +
            "       sa.meta_value as archive_url, " +
            "       ss.meta_value as start_time, " +
            "       se.meta_value as end_time " +
            "from wp_posts as p " +
            "    join wp_postmeta as sa on sa.post_id = p.ID and sa.meta_key = 'show-archived-stream-url' " +
            "    left join wp_postmeta as sd on sd.post_id = p.ID and sd.meta_key = 'show-description' " +
            "    left join wp_postmeta as ss on ss.post_id = p.ID and ss.meta_key = 'show-start-datetime' " +
            "    left join wp_postmeta as se on se.post_id = p.ID and se.meta_key = 'show-end-datetime' " +
            "where p.ID = ? and p.post_status = 'publish' and post_type = 'shows' ",
            [showId],
            function (err, shows) {
                if (err) {
                    console.log('Error importing show: ' + err);
                    return writeImport(showId, 'shows', null, 'SQLERROR', callback);
                }

                if (shows.length === 0) {
                    console.error("show id %s not found", showId);
                    return writeImport(showId, 'shows', null, 'NOTFOUND', callback);
                }

                var start_time = shows[0].start_time;
                if (!start_time || !shows[0].end_time) {
                    return writeImport(showId, 'shows', null, 'TIMEMISSING', callback);
                }

                getShowLineup(connection, showId, function (err, lineup) {
                    if (err) {
                        console.log(err);
                        return writeImport(showId, 'shows', null, err.name, callback);
                    }

                    models.shows.findOne(
                        {
                            $or: [
                                {$and: [
                                    {date: parse12Date(start_time)},
                                    {start_time: parse12Time(start_time)},
                                    {end_time: parse12Time(shows[0].end_time)}
                                ]},
                                {
                                    title: shows[0].post_title
                                }
                            ]
                        },
                        function(err, show) {
                            if (err) {
                                console.error(err);
                                return writeImport(showId, 'shows', null, err.name, callback);
                            }

                            if (show) {
                                console.info("\tshow %s already exists", show.title);
                                return writeImport(showId, 'shows', show._id, null, callback);
                            }

                            if (channels.length > 0) {
                                console.log("\tShow channels %s", channels);
                            }

                            if (broadcasters.length > 0) {
                                console.log("\tShow broadcasters %s", broadcasters);
                            }

                            var parts = parse12Time(start_time).split(":"),
                                israelDate = moment.tz(parse12Date(start_time), "Israel"),
                                year = israelDate.year(),
                                month = israelDate.month(),
                                date = israelDate.date();

                           var date_utc = moment.tz(
                                {
                                    year: year,
                                    month: month,
                                    date: date,
                                    hour: +parts[0],
                                    minute: +parts[1]
                                }, "Israel").toDate();

                            models.shows.findOneAndUpdate(
                                {
                                    $or: [
                                        {$and: [
                                            {date: parse12Date(start_time)},
                                            {start_time: parse12Time(start_time)},
                                            {end_time: parse12Time(shows[0].end_time)}
                                        ]},
                                        {
                                            title: shows[0].post_title
                                        }
                                    ]
                                },
                                {
                                    $setOnInsert: {
                                        title: shows[0].post_title,
                                        description: shows[0].description,
                                        archive_url: shows[0].archive_url,
                                        date: parse12Date(start_time),
                                        date_utc: date_utc,
                                        start_time: parse12Time(start_time),
                                        end_time: parse12Time(shows[0].end_time),
                                        default_info_item: {},
                                        status: 'archived',
                                        channel: channels,
                                        broadcaster: broadcasters,
                                        lineup: lineup,
                                        old_id: showId
                                    }
                                },
                                {
                                    upsert: true
                                },
                                function (err, show) {
                                    if (err) {
                                        console.log(err);
                                        return writeImport(showId, 'shows', null, err.name, callback);
                                    }

                                    if (!show) {
                                        console.error("WTF no show?");
                                    }

                                    if (!show._id) {
                                        console.error("WTF no ID??");
                                    }

                                    writeImport(showId, 'shows', show._id, null, callback);
                                });
                        }
                    );
                });
            }
        );
    });
}


function printOldChannels(connection, callback) {
    connection.query(
        "select * " +
        "from wp_posts as p " +
        "where post_type = 'channels' ",
        function(err, channels) {
            for (var i=0;i<channels.length;i++) {
                console.log("Old Channel %s id %s", channels[i].post_title, channels[i].ID);
            }

            callback(err, channels);
        });
}

function importNextShow(connection, lastModified, lastPostId, callback) {
    lastModified = lastModified || new Date(0);
    lastPostId = lastPostId || 0;

    connection.query(
        "select *" +
        "from wp_posts as p " +
        "where post_type = 'shows' and (post_modified > ?) " +
        "order by post_modified, ID " +
        "limit 1",
        [lastModified],
        function (err, results) {
            if (err) {
                callback(err);
            }
            else if (results.length === 0) {
                callback(null, {postId: lastPostId, postModified: lastModified, show: null});
            }
            else {
                var next = {
                    postId: results[0].ID,
                    postModified: results[0].post_modified
                };

                console.log('Importing show %s modified at %s: (%s)',  next.postId, next.postModified, JSON.stringify(results[0]));
                importShow(connection, next.postId, function (err, result) {
                    if (err) {
                        return callback(err);
                    }

                    next.show = result;
                    callback(null, next);
                });
            }
        });
}

function manualMapNewShowToOldShows(callback) {
    var tasks = [];

    function mapShow(url, oldId) {
        tasks.push(function(callback) {
            models.channels.findOneAndUpdate({url: url}, {$set: {old_id: oldId}}, function(err, channel) {
                if (!channel) {
                    err = new Error(util.format("channel %s not found", url));
                }
                callback(err);
            });
        });
    }

    mapShow("/sunday-quami", 47);
    mapShow("/tuesday-nadav", 163);
    mapShow("/leon-feldman", 202);
    mapShow("/wednesday-kutner", 203);
    mapShow("/thursday-egozy", 205);
    mapShow("/saturday-sharoni", 206);
    mapShow("/friday-club", 207);
    mapShow("/quami-glglz-archive", 213);
    mapShow("/nadav-glglz-archive", 214);
    mapShow("/tapud", 1238);
    mapShow("/specials", 2238);
    mapShow("/2012-best-of", 8639);
    mapShow("/2013-best-of", 21344);
    mapShow("/tv-on-the-radio", 24846);
    mapShow("/cinemascope", 29508);
    mapShow("/alt-tlv", 30028);
    mapShow("/indie-negev-2014", 32103);
    mapShow("/2014-best-of", 33347);
    mapShow("/spotilicious", 34091);
    mapShow("/riot", 34092);
    mapShow("/חי-על-הקצה", 35416);

    models.channels.find({}, function(err, channels) {
        for (var i=0;i<channels.length;i++) {
            console.log(channels[i].url);
        }

        async.parallel(tasks, callback);
    });
}

function importShows(callback) {
    var connection = mysql.createConnection(config);

    function importShowWithConnection(lastModified, lastPostId) {
        importNextShow(connection, lastModified, lastPostId, function (err, result) {
            if (err) {
                console.error("Error importing next show: %s",  err);
                return callback(err);
            }

            var delay = 1;

            if (result.show) {
                if (result.show.import_object) {
                    console.log('Show %s imported: %s', result.postId, JSON.stringify(result));
                }
                else {
                    console.error('Show %s imported with error: %s', result.postId, result.show.error);
                }
            }
            else {
                console.log('No new show to import');
                return callback();
            }

            setTimeout(function () {
                importShowWithConnection(result.postModified, result.postId);
            }, delay);
        });
    }

    connection.connect(function (err) {
        if (err) {
            console.log('Connect error: ' + err);
            return;
        }

        printOldChannels(connection, function() {
            manualMapNewShowToOldShows(function(err) {
                if (err) {
                    return callback(err);
                }

                importShowWithConnection(new Date(2015, 4, 5));
            });
        });
    });
}

console.log("connecting to %s", registry.mongo_cfg);

mongoose.connect(registry.mongo_cfg);

importShows(function(err) {
    if (err) {
        console.error("import finished %s", err);
        process.exit(-1);
    } else {
        console.info("import finished");
        process.exit(0);
    }
});


/*function fixUTCDate() {
    function createTask(show) {
        return function(callback) {
            if (!show.start_time) {
                console.error("show %s has no start time", show.title);
                return callback();
            }

            var parts = show.start_time.split(":"),
                israelDate = moment.tz(show.date, "Israel"),
                year = israelDate.year(),
                month = israelDate.month(),
                date = israelDate.date();

            show.date_utc = moment.tz(
                {
                    year: year,
                    month: month,
                    date: date,
                    hour: +parts[0],
                    minute: +parts[1]
                }, "Israel").toDate();

            show.save(function(err, show) {
                console.log("%s => %s", show.title, show.date_utc);
                callback(err);
            });
        };
    }

    var tasks = [];
    models.shows.find({}).exec(function(err, items) {
        for (var i=0;i<items.length;i++) {
            tasks.push(createTask(items[i], i+1, items.length));
        }

        async.waterfall(tasks, function(err) {
            if (err) {
                console.error("fix dates finished %s", err);
                process.exit(-1);
            } else {
                console.info("fix dates finished");
                process.exit(0);
            }
        });
    });
}

fixUTCDate();
*/

/*function addShowTimeToDate() {
    var tasks = [];

    function createTask(show, i, t) {
        return function(callback) {
            if (show.start_time) {
                var parts = show.start_time.split(":"),
                    current_date = new Date(show.date);

                current_date.setHours(+parts[0]);
                current_date.setMinutes(+parts[1]);

                show.date = current_date;

                if (show.channel.length === 0) {
                    return callback();
                }

                show.save(function(err) {
                    console.log("saved %s %s/%s %s", show.title, i, t, current_date);
                    callback(err);
                });
            } else {
                callback(null);
            }
        };
    }

    models.shows.find({start_time: {$exists: true}}).exec(function(err, items) {
        for (var i=0;i<items.length;i++) {
            tasks.push(createTask(items[i], i+1, items.length));
        }

        async.waterfall(tasks, function(err) {
            if (err) {
                console.error("fix dates finished %s", err);
                process.exit(-1);
            } else {
                console.info("fix dates finished");
                process.exit(0);
            }
        });
    });
}

addShowTimeToDate();*/

/*function fixTrackItems() {
    var tasks = [];

    function createTask(item) {
        return function(callback) {
            item.item_type = "track";
            item.save(function(err) {
                callback(err);
            });
        };
    }

    models.infoItems.find({item_type: {$exists: false}}).exec(function(err, items) {
        console.log("bad track " + items.length);
        for (var i=0;i<items.length;i++) {
            tasks.push(createTask(items[i]));
        }

        async.parallel(tasks, function(err) {
            if (err) {
                console.error("import finished %s", err);
                process.exit(-1);
            } else {
                console.info("import finished");
                process.exit(0);
            }
        });
    });
}

fixTrackItems();*/

/*function migrateShowsChannelsToArray() {
    var tasks = [];

    function updateShow(show) {
        return function(callback) {
            console.log('updating %s', show.title);
            models.shows.findOneAndUpdate({title: show.title}, {broadcaster: show.channel[0].broadcaster}, function(err) {
                console.log('updated %s', show.title);
                callback(err);
            });
        };
    }

    var updated = 0;
    models.shows.find({}).populate("channel").lean().exec(function(err, shows) {
        for (var i=0;i<shows.length;i++) {
            if (shows[i].broadcaster.length > 0) {
                continue;
            }

            if (!shows[i].channel) {
                console.error("%s no channel", shows[i].title);
                continue;
            }

            if (shows[i].channel.length > 1) {
                console.error("%s more than one channel", shows[i].title);
                continue;
            }

            if (!shows[i].channel[0]) {
                console.error("%s no channel", shows[i].title);
                continue;
            }

            if (shows[i].channel[0].broadcaster.length === 0) {
                console.error("%s no channel broadcaster for %s", shows[i].title, shows[i].channel[0].title);
                continue;
            }

            console.log('updating %s %s', shows[i].title, shows[i].channel);

            tasks.push(updateShow(shows[i]));
            updated++;
        }

        console.log('total updated %s', updated);

        async.waterfall(tasks, function(err) {
            if (err) {
                console.error("import finished %s", err);
                process.exit(-1);
            } else {
                console.info("import finished");
                process.exit(0);
            }
        });
    });
}

migrateShowsChannelsToArray();*/