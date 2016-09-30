"use strict";
var path = require('path'),
    fs = require('fs'),
    files = fs.readdirSync(__dirname),
    mongoose = require('mongoose');

files.forEach(function(file) {
    var name = path.basename(file, '.js');
    if (name === 'index')
        return;

    module.exports[name] = mongoose.model(name, require('./' + name));
});