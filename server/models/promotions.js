"use strict";
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Types = Schema.Types;

var schema = new Schema({
    main_promotions: [{
        picture: { type: Types.Filepicker, widget: 'FilepickerPictureWidget' },
        size: { type: String, enum: ['small', 'medium', 'large']},
        title: String,
        tag: String,
        item_type: {type: String, enum: ['archived_show', 'upcoming_show', 'link']},
        show_id: String,
        date: { type: Date },
        url: String
    }],
    show_promotions: [{
        picture: { type: Types.Filepicker, widget: 'FilepickerPictureWidget' },
        size: { type: String, enum: ['small', 'medium', 'large']},
        title: String,
        tag: String,
        url: String
    }]
});

schema.methods.toString = function(){
    return this.title;
};

schema.statics.getMain = function(){
    return this.findOne().exec();
};

schema.statics.getShow = function(callback){
    var promotions = this;
    promotions.findOne().exec(function(err, result){
        callback(err, result ? result.show_promotions : null);
    });
};

schema.formage = {
    is_single: true,
    sortable: 'order'
};

module.exports = schema;

