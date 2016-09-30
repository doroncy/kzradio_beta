"use strict";
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Types = Schema.Types,
    async = require('async');

var schema = new Schema({
    navigation: { type: Types.ObjectId, ref: 'navigation' },
    title: { type: String },
    picture: {type: Types.Filepicker, widget: 'FilepickerPictureWidget'},
    text: { type: Types.Html },
    text2: { type: Types.Html },
    date: { type: Date, default: Date.now },
    lead:  { type: Types.Html },
    url: { type: String, trim: true, lowercase: true },
    user: { type: Types.ObjectId, ref: 'users' },
    order: { type: Number, editable: false, default: 0 },
    show: { type: Boolean, 'default': true }
});

schema.methods.toString = function(){
    return this.title;
};

schema.pre('validate', function(next) {
    var url = this.url;

    if (!url)
        url = '/' + this.title;

    url = url.replace(/[\?\'\"\@\!\#\$\%\^\&\*\(\)\+\=\_\~\{\}\[\]\\\|\,\;\:]/g, "")
        .replace(/ +/g, "-")
        .replace(/\-+/g, '-')
        .replace(/(?:^\-|\-$)/g, '');

    if (url.substr(0,1) !== '/')
        url = '/' + url;

    this.url = url.toLowerCase();

    next();
});

schema.path('url').validate(function(v, callback){
    var self = this;
    async.each(['posts', 'shows', 'navigation'], function(item, cb){
        var query = self.db.model(item).findOne().where('url', self.url);

        if('posts' == item) query.ne('_id', self._id);

        query.exec(function(err, url){
            cb(err || url);
        });

    }, function(err){
        callback(!err);
    });
}, 'url already exists');

schema.statics.getRecent = function(start, count){
    return this
        .find()
        .where('show', 1)
        .sort({'date': -1})
        .skip(start)
        .limit(count)
        .populate('user')
        .populate('navigation')
        .lean()
        .exec();
};

schema.statics.postRoutes = function(){
    var navigation = this;
    return function(req, res, next) {
        navigation.find().select('url').exec(function(err, posts_urls) {
            if(posts_urls) res.locals.post_urls = {items: posts_urls};
            next(err);
        });
    };
};

schema.statics.getPostByUrl = function(url, cb){
    var posts = this;
    posts
        .findOne()
        .where('show', 1)
        .where('url', '/' + url)
        .populate('user')
        .lean()
        .exec(function(err, result){
            cb(err, result);
        });
};

schema.statics.recentPostsByUserId = function(id, limit){
    return this
        .find()
        .where('user', id)
        .where('show', 1)
        .limit(limit)
        .sort({'date': -1})
        .populate('navigation')
        .populate('user')
        .lean()
        .exec();
};

schema.formage = {
    list: ['title', 'picture', 'url', 'show'],
    list_populate: ['navigation'],
    order_by: ['order'],
    sortable: 'order'
};

module.exports = schema;

