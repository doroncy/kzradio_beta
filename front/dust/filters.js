'use strict';
var _ = require('lodash-contrib'),
    dust = require('dustjs-linkedin');

// Replaces special characters in a string so that it may be used as part of a pretty URL.
// This will also replace Underscores and the hyphens from start or end of string.
// Supports all languages.
dust.filters.seo = function(value){
    return value.replace(/[\?\'\"\@\!\#\$\%\^\&\*\(\)\+\=\_\~\{\}\[\]\\\|\,\;\:]/g, "")
        .replace(/ +/g, "-")
        .replace(/\-+/g, '-')
        .replace(/(?:^\-|\-$)/g, '')
        .toLowerCase();
};

// Create new br tag for each line in a string
// Join empty multiple lines to one br tag
dust.filters.br = function(value){
    return value.replace('\r', '').replace('\n\n', '\n').split('\n').join('<br />');
};

// Create new br tag for each line in a string
// Join empty multiple lines to one br tag
dust.filters.brs = function(value){
    return value.replace(/\r\n/g, "<br />");
};

// Convert to Lower case
dust.filters.lc = function(value){
    return value.toLowerCase();
};

// Strips all HTML tags from the string.
dust.filters.st = function(value) {
    return _.stripTags(value).replace(/\&nbsp\;/igm, ' ');
};

// Creates a human readable string. Capitalizes the first word and turns underscores
// into spaces and strips a trailing '_id', if any. Like String#titleize,
// this is meant for creating pretty output.
dust.filters.hz = function(value){
    return _.humanize(value);
};

dust.filters.yt = function(value) {
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = value.match(regExp);
    if (match&&match[2].length==11){
        return match[2];
    }else{
        return '';
    }
};

dust.filters.angularize = function(value) {
    return value.replace('/', '#');
};
