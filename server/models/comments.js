"use strict";
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Types = Schema.Types;

var schema = new Schema({
    text: { type: Types.Text },
    comment_type: {type: String, enum: ['channel', 'info_item', 'broadcaster'], required: true},
    entity_id: {type: Types.ObjectId},
    date: { type: Date, default: Date.now },
    user: { type: Types.ObjectId, ref: 'users' },
    show: { type: Boolean, 'default': true }
});

schema.methods.toString = function(){
    return this.title;
};

schema.statics.getCommentsByTypeAndEntity = function(entity_id, type) {
    return this
        .find()
        .where({entity_id: entity_id})
        .where({comment_type: type})
        .sort({'date': 1})
        .populate('user')
        .lean()
        .exec();
};

schema.formage = {
    list: ['text', 'user', 'date', 'show'],
    list_populate: ['user'],
    order_by: ['date']
};

module.exports = schema;

