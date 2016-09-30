"use strict";
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Types = Schema.Types,
    enums = require('../enums');

var schema = new Schema({
    header: String,
    links: [{
        title: String,
        url: String
    }],
    show: { type: Boolean, default: true }
});


schema.statics.getFooter = function() {
    var footer_links = this;
    return function(req, res, next) {
        footer_links.find().where("show", true).lean().exec(function(err, footer_links) {
            res.locals.footer_links = footer_links;
            next(err);
        });
    };
};

schema.formage = {
    list: ['header','show'],
    section: 'Configuration'
};

module.exports = schema;

