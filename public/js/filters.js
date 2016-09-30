/*global moment, _ */
"use strict";
angular.module('kzFilters', [])
    .filter('date', function() {
        return function(input) {
            return moment.utc(input).format('DD/MM/YY');
        };
    })
    .filter('date_short', function() {
        return function(input) {
            return moment.utc(input).format('DD/MM');
        };
    })
    .filter('time', function() {
        return function(input) {
                return moment.utc(moment.duration(input, 'seconds').asMilliseconds()).format('HH:mm:ss');
        };
    })
    .filter('time_short', function() {
        return function(input) {
            return moment.utc(moment.duration(input, 'seconds').asMilliseconds()).format('HH:mm');
        };
    })
    .filter('day', function() {
        return function(input) {
            var day = new Date(input).getDay();
            var heb_day;
            switch (day) {
                case 1: heb_day = 'שני'; break;
                case 2: heb_day = 'שלישי'; break;
                case 3: heb_day = 'רביעי'; break;
                case 4: heb_day = 'חמישי'; break;
                case 5: heb_day = 'שישי'; break;
                case 6: heb_day = 'שבת'; break;
                case 7: heb_day = 'ראשון'; break;
                default: heb_day = 'ראשון'; break;
            }
            return heb_day;
        };
    })
    .filter('truncate', function() {
        return function(input) {
            return input ? input.truncate(200) : input;
        };
    })
    .filter('spanify', function() {
        return function(input) {
            var word_arr = input.split(' '),
                res ='';
            _.forEach(word_arr, function(word){
                res += "<span>" + word + "</span>";
            });
            return $.parseHTML(res);
        };
    })
    .filter('st', function() {
        return function(input) {
            return input ? input.stripTags().replace(/\&nbsp\;/igm, '').replace(/\&#39\;/igm, "'").replace(/&quot;/g,'"') : input;
        };
    })
    .filter('str', function() {
        return function(input) {
            return input.toString();
        };
    });