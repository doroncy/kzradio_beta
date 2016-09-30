var fs = require('fs'),
    path = require('path');

var arr = [];

fs.readdirSync(__dirname).forEach(function (file) {
    if(path.extname(file) == '.dust' && path.basename(file, '.dust') != 'layout') arr.push(path.basename(file, '.dust'));
});

module.exports = arr;