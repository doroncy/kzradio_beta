"use strict";
var mongoose = require('mongoose'),

    Schema = mongoose.Schema,
    Types = Schema.Types,
    async = require('async');

var schema = new Schema({
    url: { type: String, trim: true, lowercase: true, unique: true },
    title: { type: String },
    description: { type: Types.Text },
    picture: { type: Types.Filepicker, widget: 'FilepickerPictureWidget' },
    start_time: {type: Types.Time},
    end_time: {type: Types.Time},
    weekday: {type: String, enum: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']},
    broadcaster: [{ type: Types.ObjectId, ref: 'users',  socket: true}],
    gallery: [{type: Types.Filepicker, widget: 'FilepickerPictureWidget'}],
    default_info_item: {
        title: String,
        text: Types.Text,
        image: { type: Types.Filepicker, widget: 'FilepickerPictureWidget' },
        url: String
    },
    order: { type: Number, editable: false, default: 0 },
    recommended: [{ type: Types.ObjectId, ref: 'channels'}],
    show: { type: Boolean, 'default': true },
    old_id: {type: Number}
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
    async.each(['posts','shows', 'navigation', 'channels', 'users'], function(item, cb){
        var query = self.db.model(item).findOne().where('url', self.url);

        if('channels' == item) {
            query.ne('_id', self._id);
        }

        query.exec(function(err, url){
            cb(err || url);
        });

    }, function(err){
        callback(!err);
    });

}, 'url already exists');

schema.statics.getAll = function(cbk){
    var channels = this;
    channels
        .find()
        .lean()
        .where('show', true)
        .populate('broadcaster')
        .exec(function(err, results){
            cbk(err, results);
        });
};

schema.statics.channelById = function(id){
    return this
        .findById(id)
        .lean()
        .populate('broadcaster')
        .populate('recommended')
        .exec();
};

schema.statics.channelByUrl = function(url){
    return this
        .findOne()
        .where('url', "/" + url)
        .lean()
        .populate('broadcaster')
        .populate('recommended')
        .exec();
};

schema.formage = {
    list: ['title', 'picture', 'url', 'show'],
    list_populate: ['navigation', 'broadcaster'],
    order_by: ['order'],
    filters: ['broadcaster'],
    sortable: 'order'
};

module.exports = schema;

