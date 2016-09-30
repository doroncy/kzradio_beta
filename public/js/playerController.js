/*global _, moment, io */
"use strict";
var kzRadioControllers = angular.module('kzRadioControllers');

kzRadioControllers.controller('playerCtrl', ['$scope', '$timeout', '$location', 'showsSingleFactory', 'commentFactory', 'userFactory', '$window', function ($scope, $timeout, $location, showsSingleFactory, commentFactory, userFactory, $window) {
    $scope.playlist_item_height = 73;
    $scope.profile_item_height = 58;
    $scope.playing = false;
    $scope.curr_time = 0;
    $scope.curr_playing_item = null;
    $scope.curr_playing_item_id = 0;
    $scope.curr_show = {};
    $scope.live = false;
    $scope.volume = 0.8;
    $scope.curr_playing_item_tooltip = null;
    $scope.pre_tooltip_playing_item_tooltip = null;
    $scope.curr_playing_item_tooltip_timer = null;
    $scope.socket = io.connect();

    function getPlayingItem() {
        return $scope.curr_show.default_info_item && (!$scope.curr_show.default_info_item.image || $scope.curr_show.default_info_item.image === "") ? $scope.curr_show.channel[0].default_info_item : $scope.curr_show.default_info_item;
    }

    function updateShowBackground() {
        if (!$scope.curr_show.picture) {
            return;
        }

        $(".background").backstretch($scope.curr_show.picture.url);
    }

    angular.element($window).bind('resize', function() {
        console.log("resize1");
        if(location.pathname === '/' || location.pathname === '/reset') {
            console.log("resize2");
            updateShowBackground();
        }
    });

    $scope.$on('$locationChangeSuccess', function() {
        if(location.pathname === '/') {
            updateShowBackground();
            if($scope.curr_show && $scope.curr_show.url){
                $location.search('show', $scope.curr_show.url.substr(1));
            }
        } else {
            delete $location.$$search.show;
            $location.$$compose();
        }
    });


    $scope.socket.on('on air', function(show){
        if(show) {
            $scope.showNotification('תכנית חדשה עלתה לאוויר!');
        }
    });

    $scope.socket.on('item update', function(show) {
        console.log("item updated %s", JSON.stringify(show));

        if ($scope.curr_show._id == show._id) {
            $scope.curr_show = show;
            $scope.curr_playing_item = getPlayingItem();
            $scope.info_bar = showsSingleFactory.createBar($scope.curr_show, $('.info_bar').width());
        } else {
            console.log("item updated %s for a different show");
        }
    });

    $scope.socket.on('new comment', function (comment) {
        if(comment) {
            var id = comment.entity_id;
            var item_index = _.findIndex($scope.info_bar, function(item){
                    return item.lineupItem && item.lineupItem._id == id;
                }),
                $item = $('.item_' + id);

            $scope.new_comment = "";
            if(!$scope.info_bar[item_index].comments) {
                $scope.info_bar[item_index].comments = [];
            }

            $scope.info_bar[item_index].comments.push(comment);

            var new_background = Math.min(Math.floor($scope.info_bar[item_index].comments.length / 3), 3),
                prev_background = $scope.info_bar[item_index].background;

            if(new_background != prev_background) {
                var $info_bar_item = $('.info_bar_' + id);
                $info_bar_item.removeClass('background_' + prev_background);
                $info_bar_item.addClass('background_' + new_background);
            }

            $scope.info_bar[item_index].background = new_background;

            if(!$scope.user || $scope.user._id != comment.user._id) {
                $scope.flashComment(id);
            }

            if($item.hasClass('open')){
                $item.css('max-height', $item.find('.wrapper').innerHeight() + 500);
            }
        }

        $scope.socket.emit('my other event', { my: 'data' });
    });

    $scope.$watch('playing', function(){
        if( $scope.playing && $scope.live )
            $('#player_fake').trigger('playing_started');
        else
            $('#player_fake').trigger('playing_stopped');
    });

    $scope.flashComment = function(id){
        var $bar_item = $('.info_bar_' + id),
            $tooltip = $('.comment_tooltip'),
            left = $bar_item.offset().left + ($bar_item.width() / 2) - ($tooltip.width() / 2);
        $bar_item.addClass('flash');
        $tooltip.css('left', left);
        $tooltip.addClass('show');
        $timeout(function(){
            $bar_item.removeClass('flash');
            $tooltip.removeClass('show');
        }, 4000);
    };

    $scope.getRandomBackground = function () {
        return Math.floor((Math.random() * 23) + 1);
    };

    $scope.clearPlayer = function() {
        var player = $('#player2')[0].player;

        if (player) {
            player.remove();
        }

        $('#player2').removeAttr("src");

        window.player = null;
    };

    $scope.hasHLSSupport = function() {
        var isSafari = navigator.userAgent.indexOf("Safari") > -1,
            iOS = /(iPad|iPhone|iPod)/g.test( navigator.userAgent );

        return iOS || isSafari || navigator.mimeTypes ["application/x-shockwave-flash"] !== undefined;
    }

    $scope.mediaSources = function() {
        var sources = [];

        if ($scope.curr_show.archive_aac_url && $scope.hasHLSSupport()) {
            sources.push({src: $scope.curr_show.archive_aac_url, type: 'application/x-mpegURL'});
            console.log("using HLS stream");
        } else if ($scope.curr_show.archive_url) {
            sources.push({src: $scope.curr_show.archive_url, type: 'audio/mp3'});
            console.log("using MP3 stream");
        }

        var $sources = $("#player2 source");

        $sources.remove();

        for (var i=0;i<sources.length;i++) {
            var $source = $("<source />");

            $source.attr(sources[i]);

            $('#player2').prepend($source);
        }

        return sources;
    }

    $scope.loadShow = function(show_id, show_url, callback){
        var id = show_id || '',
            url = show_url || '';

        showsSingleFactory.get(id, url).then(function(response){
            if (response.data.redirect) {
                $scope.loadShow("", response.data.redirect.substring(1), callback);

                return;
            }

            $scope.curr_show = response.data.show || {};
            $scope.live = $scope.curr_show.status === "on-air";
            $scope.curr_playing_item = getPlayingItem();
            $scope.show_point = 0;
            $scope.info_bar = showsSingleFactory.createBar($scope.curr_show, $('.info_bar').width());
            if ($scope.curr_show && $scope.curr_show.url) {
                $location.search('show', $scope.curr_show.url.substr(1));
            }

            $scope.clearPlayer();
            var sources = $scope.mediaSources();

            $('#player2').mediaelementplayer({
                // width of audio player
                audioWidth: '100%',
                // height of audio player
                audioHeight: 20,
                pluginVars: 'isvideo=true',
                success: function (media, node, player) {
                    console.log('player loaded mode: %s', media.pluginType);
                    // add event listener
                    window.player = media;
                    window.player.setSrc(sources[0]);
                    window.player.loadNext = $scope.setNext;
                    media.addEventListener('ended', function() {
                        if($scope.curr_show.status == "on-air") {
                            //check if show has ended
                            if(moment.duration(moment().format('HH:mm:ss')) > moment.duration($scope.curr_show.end_time)) {
                                window.player.loadNext();
                            }
                        } else {
                            window.player.loadNext();
                        }
                    }, false);

                    if(callback) {
                        callback();
                    }
                }
            });

            updateShowBackground();
        });
    };

    $scope.setNext = function() {
        if ($scope.curr_show.prev_next.prev_show) {
            $scope.setShow($scope.curr_show.prev_next.prev_show);
        }
    };

    var show_url = $location.search().show ? $location.search().show : "";
    $scope.loadShow("", show_url, function() {
        var timeout = 0;
        if($scope.home){
            timeout = 3000;
        }
        $timeout(function(){
            $scope.ready = true;
            $timeout(function(){
                $scope.removeThrobber = true;
            }, 500);
        }, timeout);
    });

    $scope.play = function() {
        if (!window.player) {
            return;
        }

        $scope.setPlaying(true);
        if($scope.curr_show.status == 'on-air') {
            window.player.load();
        }

        window.player.play();
    };

    $scope.stop = function(){
        $scope.setPlaying(false);
        window.player.pause();
    };

    $scope.setPlaying = function(playing){
        $scope.playing = playing;
    };

    $scope.syncPlayer = function(){
        if($scope.playing && !$scope.curr_playing_item_tooltip) {
            var current_time = 0;
            if($scope.curr_show.status == 'on-air') {
                if(moment.duration(moment().format('HH:mm:ss')) < moment.duration($scope.curr_show.start_time)) {
                    current_time = moment.duration(moment().format('HH:mm:ss')).add(moment.duration('24:00:00')).subtract(moment.duration($scope.curr_show.start_time)).as('seconds');
                } else {
                    current_time = moment.duration(moment().format('HH:mm:ss')).subtract(moment.duration($scope.curr_show.start_time)).as('seconds');
                }
            } else {
                current_time = Math.floor(window.player.currentTime);
            }
            var item = _.find($scope.info_bar, function(item){
                return item.start_time_in_secs < current_time && current_time < (item.start_time_in_secs + item.length);
            });
            if(item){
                $scope.curr_time = current_time;

                if (item.lineupItem) {
                    $scope.curr_playing_item_id = item.lineupItem._id;
                    $scope.curr_playing_item = item.lineupItem;
                }
            }
        }

        $timeout($scope.syncPlayer, 1000);
    };

    $scope.addToFavorites = function(id, type) {
        if(id === 0 || id === '0') return;
        if($scope.user) {
            if($scope.already_exists($scope.user[type], id)) {
                $scope.showNotification($scope.action_messages[type + '_exists']);
            } else {
                userFactory.addFavorite({id: id, item_type: type}).then(function(data){
                    if (data.data.user) {
                        $scope.$parent.user = angular.copy(data.data.user);
                        $scope.showNotification($scope.action_messages[type + '_added']);
                    }
                    if($scope.profile_show) {
                        $scope.expandItem('saved', 'profile');
                    }
                });
            }
        } else {
            if($scope.selected != 'login') {
                $scope.toggleShow('login');
                $scope.login_error = 'עליך להירשם כדי לבצע פעולה זו';
            }
        }
    };

    $scope.already_exists = function(array, id) {
        var item = _.find(array, {'_id': id});
        return !!item;
    };

    $scope.removeFromFavorites = function(id, type) {
        userFactory.removeFavorite({id: id, 'item_type': type}).then(function(data){
            if (data.data.user) {
                $scope.$parent.user = data.data.user;
            }
        });
    };

    $scope.setShow = function(show_id) {
        if ($scope.curr_show._id == show_id){
            if($scope.playing)
                $scope.stop();
            else
                $scope.play();
        } else {
            $scope.stop();
            $scope.loadShow(show_id, "", function(){
                $scope.play();
            });
        }
    };

    $timeout($scope.syncPlayer, 500);

    $scope.expandItem = function (id, type) {
        var $item = $('.item_' + id),
            $siblings = $item.siblings('.open');
        //ugly hack to make the height animations work on max-size :(
        $.each($siblings, function (i, item) {
            $(item).css('max-height', $(item).innerHeight());
            setTimeout(function () {
                // enable & start transition
                $(item).removeClass('open').css('max-height', $scope[type + '_item_height']);
            }, 10);
        });
        $item.siblings().removeClass('open');
        if ($item.hasClass('open')) {
            $item.css('max-height', $item.innerHeight());
            setTimeout(function () {
                // enable & start transition
                $item.removeClass('open').css('max-height', $scope[type + '_item_height']);
            }, 10);
        } else {
            var $container = $('.playlist-inner'),
                item_index = _.findIndex($scope.info_bar, function(item){
                    return item.lineupItem && item.lineupItem._id == id;
                });
            $container.animate({
                scrollTop: (item_index) * ($scope.playlist_item_height + 5)
            }, 500, function(){
                $item.css('max-height', $scope[type + '_item_height']);
                setTimeout(function () {
                    // enable & start transition
                    $item.addClass('open').css('max-height', $item.find('.wrapper').innerHeight());
                }, 10);
            });
        }
    };

    $scope.showInfoTip = function(id) {
        var item = _.find($scope.info_bar, function(item){
            return item.lineupItem && item.lineupItem._id == id;
        });

        if (item) {
            if ($scope.curr_playing_item_tooltip_timer) {
                $timeout.cancel($scope.curr_playing_item_tooltip_timer);
            }

            $scope.pre_tooltip_playing_item_tooltip = $scope.curr_playing_item;
            $scope.curr_playing_item = item.lineupItem;
            $scope.curr_playing_item_tooltip = item;

            $scope.curr_playing_item_tooltip_timer = $timeout(function() {
                $scope.hideInfoTip(id);
            }, 4000);
        }
    };

    $scope.hideInfoTip = function(id) {
        var item = _.find($scope.info_bar, function(item){
            return item.lineupItem && item.lineupItem._id == id;
        });

        if (item && item == $scope.curr_playing_item_tooltip) {
            $scope.curr_playing_item_tooltip = null;
            $scope.curr_playing_item = $scope.pre_tooltip_playing_item_tooltip;
        }
    };

    $scope.showInfo = function(id){
        var playlist = 'playlist';
        if(!$scope.home || window.playlistBottom) {
            playlist = 'playlist_right';
        }
        if($scope.selected != playlist) {
            $scope.toggleShow(playlist);
            setTimeout(function(){
                $scope.expandItem(id, playlist);
            }, 1000);
        } else {
            $scope.expandItem(id, playlist);
        }
    };

    $scope.setVolume = function(){
        window.player.setVolume($scope.volume);
    };

    $scope.mute = function(){
        window.player.setMuted(true);
    };

    $scope.unmute = function(){
        window.player.setMuted(false);
    };

}]).directive('playercntrls',['$timeout', function($timeout) {
    return {
        restrict: 'E',
        scope: {
            top: "=top"
        },
        templateUrl: '/templates/player_controls.html',
        link:function(scope){

            var $volume_button = $('.volume_button');
            scope.dragging = false;
            scope.last_y = 0;
            scope.volume_degree = 240;

            $volume_button.drag('dragend', function(){
                scope.dragging = false;
                scope.last_y = 0;
            });

            function setMute(muted) {
                if (muted) {
                    scope.$parent.mute();
                    $('.volume_button').addClass("blink");
                    $('.groove').addClass("blink");
                } else {
                    scope.$parent.unmute();
                    $('.volume_button').removeClass("blink");
                    $('.groove').removeClass("blink");
                }

                $volume_button.data('muted', muted);
            }

            $volume_button.dblclick(function() {
                setMute(!$volume_button.data('muted'));
                return false;
            });

            $volume_button.drag(function(e){
                scope.dragging = true;
                setMute(false);
                if(scope.last_y === 0){
                    scope.last_y = e.clientY;
                } else {
                    var delta = scope.last_y - e.clientY,
                        minAngle = 30,
                        maxAngle = 330,
                        pixelToAngle = 3;

                    if ((delta > 0 && scope.volume_degree + (delta * pixelToAngle) <= maxAngle) ||
                        (delta < 0 && scope.volume_degree + (delta * pixelToAngle) >= minAngle)) {
                        scope.volume_degree += delta * 3;

                        $('.groove').css('transform', 'rotate(' + scope.volume_degree + 'deg)');
                        var volume = ((scope.volume_degree - minAngle) / pixelToAngle) / 100;
                        console.log("deg %s v %s", scope.volume_degree, volume);
                        scope.$parent.volume = volume;
                        scope.$parent.setVolume();
                    }
                    scope.last_y = e.clientY;
                }
            });

            scope.changeVolumeFromBar = function(e) {
                var offset = e.pageX - $(e.target).closest('.volume_tooltip').offset().left;
                scope.$parent.volume = offset / 30;
                scope.volume_degree = scope.$parent.volume * 300 + 30;
                $('.groove').css('transform', 'rotate(' + scope.volume_degree + 'deg)');
                scope.$parent.setVolume();
            };
        }
    };
}])
    .directive('playlist', function(){
        return {
            restrict: 'E',
            templateUrl: '/templates/playlist.html',
            link: function(scope, element){
                element.bind("keydown", function(event) {
                    if(event.which === 13) {
                        var $text = $(event.target);
                        var id = $text.closest('.playlist_item').data('id');
                        if(!scope.$parent.user) {
                            scope.$parent.loginAndSendInfoItemComment($text.val(), id);
                        } else if(scope.$parent.user && id && $text.hasClass('comment')){
                            scope.$parent.createInfoItemComment($text.val(), id);
                        }
                    }
                });
            }
        };
    });
