"use strict";

var kzRadioControllers = angular.module('kzRadioControllers');

kzRadioControllers.config(function($provide) {
    $provide.decorator("$exceptionHandler", ['$delegate', function($delegate) {
        return function(exception, cause) {
            $delegate(exception, cause);
            Raven.captureException(exception, cause);
        };
    }]);
});

kzRadioControllers.controller('bodyCtrl', [
    '$rootScope', '$document', '$timeout', '$scope', '$route', '$location', 'userFactory', 'commentFactory', 'navigationFactory', '$sce', '$window',
    function($rootScope, $document, $timeout, $scope, $route, $location, userFactory, commentFactory, navigationFactory, $sce, $window) {

    var openingSpeed = 1300;

    function resizeMainPageControls() {
        var docHeight = window.innerHeight;
        $scope.header_height = docHeight - 56;
        $scope.background_size = docHeight - 56;
        $scope.throbber_height = docHeight;
        $('.sidebar').css('height', $scope.header_height + 'px');
    }

    $scope.$on('$routeChangeStart', function () {
        $('.content').html("");
        $scope.locationUrl = location.href;
        if(location.pathname === '/' || location.pathname === '/reset') {
            $scope.home = true;
            $scope.closed = false;
            $scope.background_offset = 0;

            resizeMainPageControls();

            var top_controls = $('.banner ul.controls li');
            $.each(top_controls, function(i, control){
                $(control).removeClass('hidden');
                $(control).addClass('visible');
            });

            $scope.opened = true;
        } else if ($scope.prevPath === '/' || $scope.prevPath === '/reset') {
            $timeout(function(){
                $scope.home = false;
                $scope.closed = true;
                $scope.closing = false;
            }, openingSpeed);

            $scope.opened = false;
            $scope.closing = true;
            $scope.header_height = 32;
            $scope.throbber_height = 0;
            $scope.background_offset = $scope.background_size;
        } else {
            $scope.closed = true;
        }

        $scope.prevPath = location.pathname;
    });

    angular.element($window).bind('resize', function() {
        if(location.pathname === '/' || location.pathname === '/reset') {
            resizeMainPageControls();
        }
    });

    $scope.locationUrl;
    $scope.width = $(document).width();
    $scope.background_size =  Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    $scope.background_offset =  Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    $scope.background_front = false;
    $scope.header_transparent = false;
    $scope.header_height = 32;
    $scope.throbber_height = 0;
    $scope.side_center = (window.innerWidth - 1026) / 4;

    $scope.login_show = false;
    $scope.signup_show = false;
    $scope.profile_show = false;
    $scope.playlist_show = false;
    $scope.forgot_show = false;
    $scope.reset_show = false;
    $scope.playlist_right_show = false;
    $scope.user = null;
    $scope.new_comment = "";
    $scope.selected = null;
    $scope.before_post = null;
    $scope.notification = null;
    $scope.navigation = {};
    $scope.show = false;
    $scope.logo_offset = 455;

    $scope.trustHtml = function(text) {
        return $sce.trustAsHtml(text);
    };

    $scope.action_messages = {
        favorite_shows_exists : 'התכנית כבר נמצאת במועדפים',
        favorite_tracks_exists : 'השיר כבר נמצא במועדפים',
        saved_shows_exists : 'כבר קיימת תזכורת לתכנית זו',
        favorite_shows_added : 'התכנית נוספה למועדפים',
        favorite_tracks_added : 'השיר נוסף למועדפים',
        saved_shows_added : 'נוספה תזכורת לתכנית זו'
    };

    if ($window.thereIsALoggedInUser) {
        userFactory.getLoggedIn().then(function (data) {
            $scope.user = data.data.user;
            if (!$scope.user) throw new Error("Error occured getting the logged in user");
        });
    }

    navigationFactory.get().then(
        function(data){
            $scope.navigation = data.data.navigation;
        }
    );
    $scope.redirect = function(url){
        if (url.slice(0,4) === 'http') {
            $window.open(url, '_blank');
        } else if($scope.selected !== '' && $scope.selected !== ""){
            $scope.toggleShow($scope.selected);
            $timeout(function(){
                $location.path(url);
            }, 800);
        } else {
            $location.path(url);
        }
    };

    $scope.showNotification = function(notification_text) {
        $scope.notification = notification_text;
        $timeout(function(){
            $scope.notification = null;
        }, 5000);
    };

    $scope.toggleShow = function (elem) {
        if ($scope[$scope.selected + '_show'] && $scope.selected != elem)
            $scope[$scope.selected + '_show'] = false;
        $scope.selected = $scope[elem + '_show'] === false ? elem : '';
        if(elem == 'playlist_right' && !$scope[elem + '_show']) {
            $('.sidebar_right').css('height', $('.content_wrapper').height() - 25 + 'px');
            var $player = $('.banner-bottom-section');
            if(!$player.hasClass('fixed')){
                $('html,body').animate({
                    scrollTop: $scope.header_height
                }, 300, function(){
                    $scope[elem + '_show'] = true;
                });
            } else {
                $scope[elem + '_show'] = true;
            }
        } else if (elem == 'playlist' && !$scope[elem + '_show']) {
            $('body').animate({
                scrollTop: 0
            }, 300, function(){
                $scope[elem + '_show'] = true;
            });
        } else {
            $scope[elem + '_show'] = !$scope[elem + '_show'];
        }
    };
    $scope.signup = function (user_data) {
        if (user_data.password != user_data.confirm_pass) {
            $scope.signup_error = 'הסיסמאות שהזנת אינן זהות';
        } else {
            userFactory.signup(user_data).then(function (data) {
                if (data.data.message) {
                    $scope.signup_error = data.data.message;
                } else {
                    $scope.signup_error = '';
                    $scope.user = data.data.user;
                    $scope.toggleShow('signup');
                }
            });
        }
    };

    $scope.login = function (user_data) {
        userFactory.login(user_data).then(function (data) {
            if (data.data.user) {
                $scope.login_error = '';
                $scope.user = data.data.user;
                $scope.toggleShow('login');
                $scope.user_data = {};
                if($scope.before_post && $scope.before_post.type){
                    if($scope.before_post.type == 'info_item') {
                        $scope.createInfoItemComment($scope.before_post.comment, $scope.before_post.id);
                        $scope.toggleShow('playlist');
                    } else {
                        $scope.createComment($scope.before_post.comment, $scope.before_post.type);
                    }
                    $scope.before_post = null;
                }
            } else {
                $scope.login_error = data.data.message || data.data.error;
            }
        });
    };

    $scope.logout = function () {
        userFactory.logout().then(function (data) {
            if (data.data.message) {
                throw new Error("Something bad happened during logout!");
            } else {
                if($scope.profile_show){
                    $scope.toggleShow('profile');
                    $timeout(function(){
                        $scope.user = null;
                    }, 800);
                } else {
                    $scope.user = null;
                }
            }
        });
    };

    $scope.forgotPassword = function(user_data) {
        userFactory.forgotPassword(user_data).then(function(data){
            $scope.forgot_error = "";
            if(data.data.message){
                $scope.forgot_message = data.data.message;
            } else if (data.data.error){
                $scope.forgot_error = data.data.error;
            } else {
                throw new Error('something went wrong');
            }
        });
    };

    $scope.resetPassword = function(user_data) {
        if (user_data.password != user_data.confirm_pass) {
            $scope.reset_error = 'הסיסמאות שהזנת אינן זהות';
            return;
        }
        userFactory.resetPassword(user_data).then(function(data){
            if(data.data.user){
                $scope.reset_error = "";
                $scope.user = data.data.user;
                $scope.user_data = {};
                $scope.toggleShow('reset');
                $location.path("/");
            } else {
                throw new Error('Error resetting password');
            }
        });
    };

    $scope.loginAndSend = function(comment, type, id) {
        $scope.before_post = {
            comment: comment,
            type: type,
            id: id
        };
        $scope.scrollToSidebar();
        $timeout(function(){
            if($scope.selected != 'login')
                $scope.toggleShow('login');
        }, 800);
    };

    $scope.loginAndSendInfoItemComment = function(comment, id) {
        $scope.before_post = {
            comment: comment,
            type: 'info_item',
            id: id
        };
        if($scope.selected != 'login') {
            $scope.toggleShow('login');
            $scope.login_error = 'יש להירשם על מנת לבצע פעולה זו';
        }
    };

    $scope.scrollToSidebar = function(){
        $('html,body').animate({scrollTop:0}, 800);
    };

    $scope.createComment = function(comment, type) {
        if(comment === '') return;
        commentFactory.createComment({
            text: comment,
            comment_type: type,
            entity_id: $scope[type]._id,
            user: $scope.user._id
        }).then(function(data){
            if(data.data.comment){
                $scope.new_comment = "";
                data.data.comment.user = $scope.user;
                if(!$scope[type].comments)
                    $scope[type].comments = [];
                $scope[type].comments.push(data.data.comment);
            }
            else
                throw new Error("Error adding comment");
        });
    };

    $scope.createInfoItemComment = function(comment, id) {
        if(comment === '') return;
        commentFactory.createComment({
            text: comment,
            comment_type: 'info_item',
            entity_id: id,
            user: $scope.user._id
        }).then(function(data){
            if(!data.data.success){
                throw new Error("Error adding comment");
            }
        });
    };

    $document.bind('click', function(e){
        var $target = $(e.target);
        if((e.target == this || $target.hasClass('.content') || $target.closest('.content').length > 0 || $target.hasClass('banner') || $target.hasClass('navigation') || $target.hasClass('header_controls') || $target.parents('.background').length > 0 ) && $scope.selected !== ''){
            $scope.toggleShow($scope.selected);
        }
    });
}])
    .directive('userctrl', function(){
        return {
            restrict: 'E',
            templateUrl: '/templates/user_controls.html'
        };
    })
    .directive('comments', function(){
        return {
            restrict: 'E',
            scope: {
                entity: "=info",
                type: "=type",
                cmnt: "=cmnt"
            },
            templateUrl: '/templates/comments.html'
        };
    });
