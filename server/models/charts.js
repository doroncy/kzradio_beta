"use strict";
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Types = Schema.Types;

var schema = new Schema({
    title: { type: String },
    items: [{ type: Types.ObjectId, ref: 'infoItems'}],
    show: { type: Boolean, 'default': true }
});

schema.methods.toString = function(){
    return this.title;
};

schema.statics.getAll = function(){
    return this.find()
        .populate('items')
        .lean()
        .exec();
};

schema.formage = {
    list: ['title', 'show'],
    order_by: ['order'],
    sortable: 'order'
};

module.exports = schema;