"use strict";
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Types = Schema.Types,
    enums = require('../enums');

var schema = new Schema({
    site: {
        logo: {type: Types.Filepicker, widget: 'FilepickerPictureWidget'},
        icon: {type: Types.Filepicker, widget: 'FilepickerPictureWidget'},
        name: String,
        homepage: String,
        base_url: String
    },
    default_picture : {type: Types.Filepicker, widget: 'FilepickerPictureWidget'},
    default_live_url : {type: String},
    default_live_aac_url : {type: String},
    contact: {
        email: String,
        phone: String,
        subject: String,
        forgot_password_email_template: Types.Text
    },
    footer_links: [{
        header: String,
        links: [{
            title: String,
            url: String
        }]
    }],
    footer_icons: [{
        icon: { type: String, 'enum': enums.icon_types },
        url: String
    }],
    snippets: [Types.Text],
    _404: {
        title: String,
        content: Types.Html
    }
});

/*
    Return site config and some other:
        res.locals.config
        res.locals.http_params
 */
schema.statics.middleware = function() {
    var config = this;
    return function(req, res, next) {
        config.findOne().lean().exec(function(err, config) {

            res.locals.http_params = {
                query: req.query,
                headers: req.headers,
                body: req.body,
                url: req.url,
                debug: req.app.get('env') == 'development'
            };

            res.locals.config = config;
            next(err);
        });
    };
};

schema.statics.getConfig = function(cbk) {
    this.findOne().lean().exec(function(err, config) {
        cbk(config);
    });
};

schema.formage = {
    section: 'Configuration',
    is_single: true
};

module.exports = schema;

