/* global jQuery */
"use strict";
(function($){
    $(document).scroll(function(){
        var top_controls = $('.banner ul.controls li');
        $.each(top_controls, function(i, control){
            var dist = $(control).offset().top - $(window).scrollTop();
            if(dist < 50) {
                if(dist === 0 && $(control).hasClass('ng-hide')) {
                    $(control).removeClass('hidden');
                    $(control).addClass('visible');
                } else {
                    $(control).removeClass('visible');
                    $(control).addClass('hidden');
                }
            } else {
                $(control).removeClass('hidden');
                $(control).addClass('visible');
            }
        });

        var bottom_controls = $('.bottom_controls ul.controls li');
        $.each(bottom_controls, function(i, control){
            var dist = (window.innerHeight + $(window).scrollTop()) - $(control).offset().top;
            if(dist > 50) {
                $(control).removeClass('hidden');
                $(control).addClass('visible');
            } else {
                $(control).removeClass('visible');
                $(control).addClass('hidden');
            }
        });

//        var $player = $('.banner-bottom-section'),
//            player_offset = $player.offset().top - $(window).scrollTop();
//        console.log(player_offset);
//        if(player_offset < 0){
//            $player.addClass('fixed');
//            console.log('in static');
//        }

        var $content = $('.content_wrapper'),
            $player = $('.banner-bottom-section'),
            $controls = $('.bottom_controls ul.controls'),
            content_offset = $content.offset().top - $(window).scrollTop();
        console.log(content_offset);
        if(content_offset < 50){
            $player.addClass('fixed');
            $controls.addClass('fixed');
        } else {
            $player.removeClass('fixed');
            $controls.removeClass('fixed');
        }

        if(content_offset < $('header').height() / 2){

            window.playlistBottom = true;
        } else {
            window.playlistBottom = false;
        }
    });
    $('#player_fake').on('playing_stopped', function(){
        window.getAnimationFrame = null;
    });
    $('#player_fake').on('playing_started', function() {
        var canvas;
        var context;
        var screenWidth;
        var screenHeight;

        var frequencyA = 500;
        var amplitudeA = 0;
        var frequencyB = 500;
        var amplitudeB = 3;

        var offsetA = 0;
        var speedA = -0.5;
        var offsetB = 0;
        var speedB = -0.2;
        var plotWidth = 300;
        var waveQuality = 600;

        var mousePosition = {x:0, y:0};

        canvas = document.getElementById('canvas');
        context = canvas.getContext('2d');

        window.onresize = function()
        {
            screenWidth = window.innerWidth;
            screenHeight = 10;

            canvas.width = screenWidth;
            canvas.height = screenHeight;

            plotWidth = screenWidth;
        };

        window.onresize();

        canvas.addEventListener('mousemove', function(e)
        {
            mousePosition.x = e.clientX;
            mousePosition.y = e.clientY;
        });

        window.getAnimationFrame =
            window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function(callback)
            {
                window.setTimeout(callback, 16.6);
            };

        var loop = function()
        {
            context.fillStyle = '#000';
            context.fillRect(0, 0, screenWidth, screenHeight);
            drawWave('#05fc9c');

            offsetA += speedA;
            offsetB += speedB;

            if(window.getAnimationFrame)
                window.getAnimationFrame(loop);
        };

        var drawWave = function(waveColor) {
            var i = 0;
            var length = waveQuality;
            var angleA = 0;
            var angleB = 0;
            var norm = 0;

            context.lineWidth = 1;
            context.strokeStyle = waveColor;
            context.beginPath();

            for(i; i < length; ++i)
            {
                norm = (i / length);
                angleA = norm * frequencyA;
                angleB = norm * frequencyB;

                if(i === 0) context.moveTo(0, (Math.sin(angleA + offsetA) * amplitudeA) + (Math.sin(angleB + offsetB) * amplitudeB) + (screenHeight >> 1));
                else context.lineTo(norm * plotWidth, (Math.sin(angleA + offsetA) * amplitudeA) + (Math.sin(angleB + offsetB) * amplitudeB) + (screenHeight >> 1));
            }

            context.stroke();
            context.closePath();
        };
        loop();
    });
})(jQuery);