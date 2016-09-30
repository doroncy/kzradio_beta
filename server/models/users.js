"use strict";
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Types = Schema.Types,
    enums = require('../enums'),
    Promise = require('mpromise'),
    async = require('async');

var schema = new Schema({
    first_name: String,
    last_name: String,
    email: { type: String, required: true, unique: true },
    type: { type: String, 'enum': enums.users_types },
    password: { type: String, password: true, editable: false },
    picture: { type: Types.Filepicker, widget: 'FilepickerPictureWidget' },
    links: [{
        icon: { type: String, 'enum': enums.icon_types },
        url: String
    }],
    promo_shows: { type: [{type: Types.ObjectId, ref: 'shows'}], default: []},
    url: { type: String, trim: true, lowercase: true, unique: true },
    favorite_shows: [{type: Types.ObjectId, ref: 'shows'}],
    saved_shows: [{type: Types.ObjectId, ref: 'shows'}],
    favorite_tracks: [{type: Types.ObjectId, ref: 'infoItems'}],
    order: { type: Number, editable: false, default: 0 },
    text: Types.Html
});

schema.statics.search = function(term) {
    var users = this,
        expression = new RegExp(term, "i");

    var p = new Promise();

    users.find({ $or: [
        { first_name: expression },
        { last_name: expression }
    ] }).where({'type': 'broadcaster'}).exec().then(function(objs) {
            objs = objs.map(function(obj) {
                return {text: obj.toString(), id: obj._id.toString()};
            });

            p.fulfill(objs);
        });

    return p;
};

schema.methods.toString = function() {
    return this.first_name + ' ' + this.last_name + ' <' + this.email + '>';
};

schema.pre('validate', function(next) {
    var self = this;
    var url = self.url;

    if(self.type == 'broadcaster') {
        if (!url)
            url = '/' + this.first_name + '-' + this.last_name;

        url = url.replace(/[\?\'\"\@\!\#\$\%\^\&\*\(\)\+\=\_\~\{\}\[\]\\\|\,\;\:]/g, "")
            .replace(/ +/g, "-")
            .replace(/\-+/g, '-')
            .replace(/(?:^\-|\-$)/g, '');

        if (url.substr(0,1) !== '/')
            url = '/' + url;

        self.url = url.toLowerCase();
    }

    next();
});

schema.path('url').validate(function(v, callback){
    var self = this;
    if(self.type == "broadcaster"){
        async.each(['posts', 'navigation', 'shows', 'channels', 'users'], function(item, cb){
            var query = self.db.model(item).findOne().where('url', self.url);

            if('users' == item) query.ne('_id', self._id);

            query.exec(function(err, url){
                cb(err || url);
            });
        }, function(err){
            callback(!err);
        });
    } else {
        callback(true);
    }
}, 'url already exists');

schema.statics.getBroadcasters = function(cbk) {
    var users = this;
    users.find()
        .where('type', 'broadcaster')
        .sort({'order': 1})
        .lean()
        .exec(function(err, users) {
            cbk(err, users);
        });
};

schema.statics.getBroadcasterById = function(id) {
    var users = this;
    return users.findById(id).populate('promo_shows').exec();
};

schema.statics.getBroadcasterByUrl = function(url) {
    var users = this;
    return users.findOne().where('url', '/' + url).populate('promo_shows').exec();
};

schema.formage = {
    list: ['first_name', 'last_name', 'email', 'type', 'picture']
};

module.exports = schema;
