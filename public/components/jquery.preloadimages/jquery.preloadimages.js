/*!
 * Copyright (c) 2014 Matt Cain (Twitter:@CainCode, Github:@MattCain)
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

(function($){
    'use strict';

    $.preloadimages = function(images, options) {

        var settings = $.extend({
            // Using $.noop instead of null or undefined lets us call the callbacks without
            // having to check that they are actually a function.
            each: $.noop,
            all: $.noop
        }, options),
            loaded = [],
            counter = 0;

        $.each(images, function(i, url) {

            var image = new Image();

            $(image).on('load error', function(e) {
                var $this = $(this);
                
                counter++;

                // All image objects are passed to the callbacks, this is
                // how you tell whether it was successfully loaded.
                $this.data('loaded', 'error' === e.type ? false : true);

                loaded[i] = image;
                
                settings.each($this);

                // We use a counter because if the last image in the array loads
                // first then loaded.length === images.length will be true, even
                // though the rest of the array elements will be undefined.
                if (counter === images.length) {
                    settings.all(loaded);
                }

                // Cancel the events in case anyone wants to reuse the image objects.
                $(this).off('load error');
            });

            // Set the src to start loading the image!
            image.src = url;
        });
    };
})(jQuery);