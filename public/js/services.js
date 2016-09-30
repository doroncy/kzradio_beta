"use strict";
/*global moment, _*/
var kzServices = angular.module('kzServices', ['ngResource']);

kzServices.service('homepageFactory', ['$http',
    function ($http) {
        this.get = function (token) {
            var url = '/api/home';
            if(token){
                url += '?token=' + token;
            }
            return $http.get(url);
        };
    }
]);

kzServices.service('magazineFactory', ['$http',
    function ($http) {
        this.get = function (start, count) {
            return $http.get('/api/posts?start=' + start + '&count=' + count);
        };
        this.getByBroadcaster = function(id) {
            return $http.get('/api/postArchive/' + id);
        };
    }
]);

kzServices.service('magazineSingleFactory', ['$http',
    function ($http) {
        this.get = function (postUrl) {
            var url = '/api/post/' + postUrl;
            return $http.get(url);
        };
    }
]);

kzServices.service('broadcastersFactory', ['$http',
    function ($http) {
        this.get = function () {
            return $http.get('/api/broadcasters');
        };
    }
]);

kzServices.service('broadcastersSingleFactory', ['$http',
    function ($http) {
        this.get = function (url) {
            var http_url = '/api/broadcasters/' + url;
            return $http.get(http_url);
        };
    }
]);

kzServices.service('channelsFactory', ['$http',
    function ($http) {
        this.get = function () {
            return $http.get('/api/channels');
        };
    }
]);

kzServices.service('channelsSingleFactory', ['$http',
    function ($http) {
        this.get = function (url) {
            var http_url = '/api/channels/' + url;
            return $http.get(http_url);
        };
    }
]);

kzServices.service('showsFactory', ['$http',
    function ($http) {
        this.get = function () {
            return $http.get('/api/shows');
        };
        this.getByChannel = function(url) {
            return $http.get('/api/channelArchive/' + url);
        };
        this.getByBroadcaster = function(url) {
            return $http.get('/api/broadcasterArchive/' + url);
        };
    }
]);

kzServices.service('showsSingleFactory', ['$http',
    function ($http) {
        this.get = function (id, show_url) {
            var url;
            if (id) {
                url = '/api/shows/' + id;
            } else if (show_url) {
                url = '/api/showsByUrl/' + show_url;
            } else {
                url = '/api/lastShow';
            }

            return $http.get(url);
        };

        this.getFirst = function(channel_id) {
            return $http.get('/api/firstShow/' + channel_id);
        };

        this.createBar = function (show, width) {
            var mEndTime = moment.duration(show.end_time),
                mStartTime = moment.duration(show.start_time),
                isMidnight = mEndTime < mStartTime;

            if (isMidnight) {
                mEndTime = mEndTime.add('days', 1);
            }

            var showDuration = mEndTime.subtract(mStartTime),
                barTtems = show.lineup,
                showLength = showDuration.as('seconds');

            barTtems = _.filter(barTtems, function(item) {
                return item.timestamp && item.timestamp !== "";
            });

            var zeroItem = {
                comments: [],
                timestamp: '00:00:00'
            };

            if (barTtems.length > 0) {
                barTtems.splice(0, 0, zeroItem);
            } else {
                barTtems.push(zeroItem);
            }

            // remove invalid time stamps
            var lastDuration = -1;
            barTtems = _.filter(barTtems, function(currentItem) {
                var currentDuration = moment.duration(currentItem.timestamp),
                    pass = lastDuration == -1 || (currentDuration > lastDuration && currentDuration > showDuration);

                if (!pass) {
                    console.error("Invalid duration item %s", currentItem);
                }

                return pass;
            });

            // calc item durations
            for (var j = 0; j < barTtems.length; j++) {
                var isLastItem = j == barTtems.length - 1,
                    nextTimestamp;

                if (isLastItem === false) {
                    var nextItem = barTtems[j + 1];

                    nextTimestamp = nextItem.timestamp;
                } else {
                    nextTimestamp = showDuration;
                }

                var currentItem = barTtems[j],
                    currentDuration = moment.duration(currentItem.timestamp),
                    duration = moment.duration(nextTimestamp).subtract(currentDuration).as('seconds');

                console.log(currentItem.timestamp + ' - ' + duration);

                barTtems[j].length = duration;
            }

            var paddingSize = 5,
                total = 0;

            for (var i = 0; i < barTtems.length; i++) {
                isLastItem = i == barTtems.length - 1;
                barTtems[i].slice = Math.round(width * barTtems[i].length / showLength);

                total += barTtems[i].slice;
                if (!isLastItem) {
                    barTtems[i].slice -= paddingSize;
                } else {
                    barTtems[i].slice -= total - width;
                }

                barTtems[i].start_time_in_secs = moment.duration(barTtems[i].timestamp).as('seconds');
                barTtems[i].background = Math.min(Math.floor((barTtems[i].comments.length + 2) / 3), 3);
            }

            return barTtems;
        };
     }
]);

kzServices.service('userFactory', ['$http',
    function ($http) {
        this.getLoggedIn = function () {
            return $http.get('/users/loggedIn');
        };
        this.login = function (user) {
            return $http.post('/users/login', user);
        };
        this.signup = function (user) {
            return $http.post('/users/signup', user);
        };
        this.logout = function () {
            return $http.get('/users/logout');
        };
        this.forgotPassword = function (user) {
            return $http.post('/users/forgot', user);
        };
        this.resetPassword = function (user) {
            return $http.post('/users/reset', user);
        };
        this.addFavorite = function (data) {
            return $http.put('/api/addFavorite', data);
        };
        this.removeFavorite = function (data) {
            return $http.put('/api/removeFavorite', data);
        };
    }
]);

kzServices.service('commentFactory', ['$http',
    function ($http) {
        this.createComment = function (data) {
            return $http.post('/api/comment', data);
        };
    }
]);

kzServices.service('navigationFactory', ['$http',
    function ($http) {
        this.get = function () {
            return $http.get('/api/navigation');
        };
    }
]);

