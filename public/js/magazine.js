(function($){
    $('.load_all').on('click', function(e){
        e.preventDefault();
        $.get('/all-posts', function(data){
            if(data.posts) {
                $.each(data.posts, function(i, post){
                    /*dust.render('article', {post: post}, function(err, html){
                        if(err) return;
                        $('.posts').append(html);
                    })*/
                });
            }
        });
    });
})(jQuery);