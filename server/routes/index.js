'use strict';

var app = require.main.exports.app,
    fs = require('fs'),
    path = require('path'),
    files = fs.readdirSync(path.join(__dirname, '../../public'));

app.get('/files', function(req, res) {
    res.send(files.map(function(f) {
        if (path.extname(f) != '.html')
            return '';
        return '<a href="/' + path.basename(f) + '">' + f + '</a><br />\n';
    }).join(''));
});
