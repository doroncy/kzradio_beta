/*global _ */
"use strict";
var kzRadioControllers = angular.module('kzRadioControllers');

kzRadioControllers.controller('homepageCtrl', ['$scope', '$timeout', '$http', 'homepage', function ($scope, $timeout, $http, homepage) {
    $scope.promotions = homepage.data.promotions;
    $scope.charts = homepage.data.charts;
    $scope.reset = homepage.data.reset;
    $scope.marquee = false;
    $('.content').removeClass('hidden');
    if(location.pathname == '/reset') {
        $scope.toggleShow('reset');
    }

    $scope.chart_images = {};
    _.forEach($scope.charts, function(chart){
        _.reduce(chart.items, function(seed, item){
            seed[item._id] = item.image.url + "/convert?w=305&h=305&fit=crop";
            return seed;
        }, $scope.chart_images);
    });
    $.preloadimages(_.values($scope.chart_images));
    $scope.start_marquee = function(item_id){
        var $inner = $('.item_' + item_id),
            $parent = $inner.parent();
        if($inner.width() > $parent.width()){
            $scope.marquee = true;
            $inner.css('left', 0 );
            $scope.scrollInfinite($inner, $inner.width() * 10);
        }
    };

    $scope.stop_marquee = function(item_id){
        var $inner = $('.item_' + item_id);
        $inner.stop();
        $scope.marquee = false;
    };

    $scope.scrollInfinite = function($inner, time){
        $inner.animate({
            left: -$inner.width() + 'px'
        }, time, "linear", function(){
            if( $scope.marquee ) {
                var $parent = $inner.parent();
                $inner.css('left', $parent.width() +'px');
                $timeout($scope.scrollInfinite($inner, $inner.width() * 20), 100);
            }
        });
    };
}]);

kzRadioControllers.controller('archiveCtrl', ['$scope', '$http', 'shows', 'showsFactory', function ($scope, $http, shows) {
    $('.content').removeClass('hidden');

    $scope.shows = shows.data.shows;
    $scope.channel = shows.data.channel;
}]);

kzRadioControllers.controller('archivePostsCtrl', ['$scope', '$http', 'posts', function ($scope, $http, posts) {
    $('.content').removeClass('hidden');

    $scope.posts = posts.data.posts;
    $scope.user = posts.data.user;
}]);

kzRadioControllers.controller('magazineCtrl', ['$scope', 'magazine', 'magazineFactory', function ($scope, magazine, magazineFactory) {
    $('.content').removeClass('hidden');

    $scope.posts = magazine.data.posts;
    $scope.promotions = magazine.data.promotions;

    $scope.loadMore = function () {
        magazineFactory.get($scope.posts.length, 10).then(function (response) {
            if (response.data && response.data.posts)
                $scope.posts = $scope.posts.concat(response.data.posts);
        });
    };
}]);

kzRadioControllers.controller('magazineSingleCtrl', ['$scope', 'magazineSingleFactory', '$sce', function ($scope, magazineSingleFactory, $sce) {
    $('.content').removeClass('hidden');

    $scope.post = magazineSingleFactory.data.post;
}]);

kzRadioControllers.controller('broadcastersCtrl', ['$scope', 'broadcasters', function ($scope, broadcasters) {
    $('.content').removeClass('hidden');

    $scope.broadcasters = broadcasters.data.broadcasters;
}]);

kzRadioControllers.controller('broadcastersSingleCtrl', ['$rootScope', '$scope', 'broadcastersSingleFactory', function($rootScope, $scope, broadcastersSingleFactory) {
    $('.content').removeClass('hidden');

    $rootScope.broadcaster = broadcastersSingleFactory.data.broadcaster;
    $scope.posts = broadcastersSingleFactory.data.posts;
    $scope.shows = broadcastersSingleFactory.data.shows;
}]);

kzRadioControllers.controller('channelsCtrl', ['$scope', 'channels', 'showsSingleFactory', function ($scope, channels, showsSingleFactory) {
    $('.content').removeClass('hidden');

    $scope.promotions = channels.data.promotions;
    $scope.slide = 0;

    var temp_channels = [[]];

    for(var i = 0; i < channels.data.channels.length; i++){
        temp_channels[0].push(channels.data.channels[i]);
    }

    $scope.channels = temp_channels;

}])
    .directive('carousel', ['$timeout', function() {
        return {
            restrict: 'E',
            scope: {
                channels: "=",
                navigation: "=nav",
                slide: "="
            },
            templateUrl: '/templates/carousel.html',
            link: function(scope){
                scope.setNext = function(){
                    var temp = scope.slide + 1;
                    if(temp == scope.channels.length){
                        scope.slide = 0;
                    } else {
                        scope.slide = temp;
                    }
                };
                scope.setPrev = function(){
                    var temp = scope.slide - 1;
                    if(temp == -1){
                        scope.slide = scope.channels.length - 1;
                    } else {
                        scope.slide = temp;
                    }
                };
            }
        };
    }]);

kzRadioControllers.controller('channelsSingleCtrl', ['$rootScope', '$scope', 'channelsSingleFactory', function($rootScope, $scope, channelsSingleFactory) {
    $('.content').removeClass('hidden');

    $rootScope.channel = channelsSingleFactory.data.channel;
    $scope.shows = channelsSingleFactory.data.shows;
}])
    .directive('prettyp', function(){
        return function(){
            $("[rel^='prettyPhoto']").prettyPhoto({deeplinking: false});
        };
    });

kzRadioControllers.controller('showsCtrl', ['$scope', 'shows', function ($scope, shows) {
    $('.content').removeClass('hidden');

    $scope.shows = shows.data.shows;
}]);

kzRadioControllers.controller('showsSingleCtrl', ['$scope', 'showsSingleFactory', function ($scope, showsSingleFactory) {
    $('.content').removeClass('hidden');

    $scope.show = showsSingleFactory.data.show;
}]);
