"use strict";
var _ = require('lodash'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Types = Schema.Types,
    async = require('async');


var schema = new Schema({
    parent: { type: Types.ObjectId, ref: 'navigation' },
    title: { type: String, required: true, trim: true },
    url: { type: String, trim: true, lowercase: true, unique: true },
    template: { type:  String, enum: ['homepage', 'channels', 'magazine', 'broadcasters'], default: 'homepage' },
    order: { type: Number, editable: false, default: 0 },
    menu: { type: Boolean, 'default': true },
    show: { type: Boolean, 'default': true },
    meta: [{
        name: { type: String },
        content: { type: Types.Text }
    }]
});

schema.methods.toString = function(){
    return this.title;
};

schema.statics.findRecursive = function(cb) {
    this.find({ show: true, menu: true })
        .select('order parent url title template')
        .sort({ parent: -1, order: 1 })
        .lean()
        .exec(function(err, items) {
            if (err) cb(err);

            var o = {};
            items.forEach(function(item) {
                item.sub = {items: []};
                o[item._id] = item;
            });
            for (var i in o) {
                var item = o[i];
                if (item.parent) {
                    o[item.parent] && o[item.parent].sub.items.push(item);
                    delete o[i];
                }
            }
            cb(null, _.values(o));
        });
};

/*
    Find crumbs of current page,
    assumed to be at `res.locals.page`
    results at
        `res.locals.crumbs`
 */
schema.statics.crumbs = function() {
    var nav = this;

    return function(req, res, next) {
        var crumbs = [];

        var parent = function(id) {
            nav.findById(id)
                .select('parent url title')
                .lean()
                .exec(function(err, page) {
                    if (err) return next(err);
                    if (page) {
                        crumbs.push(page);
                        return parent(page.parent);
                    }
                    res.locals.crumbs = crumbs.reverse();
                    next();
                });
        };

        if (res.locals.page && res.locals.page.post) {
            crumbs.push(res.locals.page.post);
        }

        if (res.locals.page) {
            crumbs.push(res.locals.page);
            parent(res.locals.page.parent);
        }
        else next();
    };
};

schema.statics.menu = function(){
    var navigation = this;
    return function(req, res, next) {
        var crumbs = res.locals.crumbs;

        navigation.findRecursive(function(err, menu) {
            if(menu) {
                menu.forEach(function(item, i){
                    item.dock = (crumbs&&crumbs[0]&&crumbs[0]._id.toString() === item._id.toString());
                    item.last = (i + 1 == menu.length);
                });

                res.locals.menu = {items: menu};
            }

            next(err);
        });
    };
};

schema.pre('validate', function(next) {
    var url = this.url;

    if (!url)
        url = '/' + this.title;

    if (url.slice(0,4) === 'http')
        return next();

    url = url.replace(/[\?\'\"\@\!\#\$\%\^\&\*\(\)\+\=\_\~\{\}\[\]\\\|\,\;\:]/g, "")
        .replace(/ +/g, "-")
        .replace(/\-+/g, '-')
        .replace(/(?:^\-|\-$)/g, '');

    if (url[0] !== '/')
        url = '/' + url;

    this.url = url.toLowerCase();

    next();
});

schema.path('url').validate(function(v, callback){
    var self = this;
    async.each(['posts', 'shows', 'navigation', 'channels', 'users'], function(item, cb){
        var query = self.db.model(item).findOne().where('url', self.url);

        if('navigation' == item) query.ne('_id', self._id);

        query.exec(function(err, url){
            cb(err || url);
        });

    }, function(err){
        callback(!err);
    });
}, 'url already exists');

schema.formage = {
    list: ['title', 'parent', 'url', 'template', 'menu', 'show'],
    filters: ['parent'],
    order_by: ['order'],
    sortable: 'order',
    list_populate: ['parent']
};

module.exports = schema;

