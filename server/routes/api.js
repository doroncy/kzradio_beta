"use strict";
var rootApp = require.main.exports.app,
    _ = require('lodash'),
    models = require('../models'),
    app = require('express')(),
    menu = models.navigation.menu();

rootApp.use('/api', app);

app.get('/navigation', [menu], function(req, res){
    var menu = res.locals.menu,
        navigation = {};

    _.forEach(menu.items, function(item){
        navigation[item.template] = item.url;
    });
    res.json({navigation: navigation});
});

app.get('/home', [menu], function(req, res){
    var response = {};
    models.promotions.getMain().then(
        function(results) {
            response.promotions = results ? results.main_promotions : [];
            return models.charts.getAll();
        }
    ).then(
        function(results) {
            response.charts = results;
            res.json(response);
        }
    ).end(function (err) {
            console.error(err.stack);
            res.send(500, err.message);
        }
    );
});

app.get('/posts', function(req, res){
    var ret = {};
    models.posts.getRecent(req.query.start, req.query.count).then(
        function(posts) {
            ret.posts = posts;
            return models.promotions.getMain();
        }
    ).then(
        function(promotions) {
            ret.promotions = promotions;
            res.json(ret);
        }
    ).end(function (err) {
            console.error(err.stack);
            ret.send(500, err.message);
        }
    );
});

app.get('/post/:url', function(req, res){
    models.posts.getPostByUrl(req.params.url, function(err, result) {
        res.json(err || {post: result});
    });
});

app.get('/broadcasters', function(req, res){
    models.users.getBroadcasters(function(err, result) {
        res.json(err || {broadcasters: result});
    });
});

app.get('/broadcasters/:url', function (req, res) {
    var ret = {};
    models.users.getBroadcasterByUrl(req.params.url).then(
        function (brodcaster) {
            ret.broadcaster = brodcaster.toObject();
            return models.posts.recentPostsByUserId(ret.broadcaster._id, 6);
        }
    ).then(
        function (usersPosts) {
            ret.posts = usersPosts;
            return models.comments.getCommentsByTypeAndEntity(ret.broadcaster._id, 'broadcaster');
        }
    ).then(
        function (comments) {
            ret.broadcaster.comments = comments;
            return models.shows.showsByBroadcaster(ret.broadcaster._id, 6);
        }
    ).then(
        function (shows) {
            ret.shows = shows;
            res.json(ret);
        }
    ).end(
        function (err) {
            console.error(err.stack);
            res.send(500, err.message);
        }
    );
});

app.get('/shows', function(req, res){
    models.shows.recentShows(function(err, shows) {
        res.json(err || {shows: shows});
    });
});

app.get('/shows/:id', function(req, res){
    var id = req.params.id;
    models.shows.showById(id, function(err, show){
        if (show.status === "draft") {
            models.shows.lastShow(function(err, show) {
                return res.json({redirect: show.url});
            });
        } else {
            res.json(err || {show: show});
        }
    });
});

app.get('/showsByUrl/:url', function(req, res){
    var url = req.params.url;
    models.shows.showByUrl(url, function(err, show){
        if (show.status === "draft") {
            models.shows.lastShow(function(err, show) {
                return res.json({redirect: show.url});
            });
        } else {
            res.json(err || {show: show});
        }
    });
});

app.get('/lastShow', function(req, res){
    models.shows.lastShow(function(err, show){
        res.json(err || {show: show});
    });
});

app.get('/firstShow/:channel_id', function(req, res){
    models.shows.firstShow(req.params.channel_id, function(err, show){
        if (show.status === "draft") {
            models.shows.lastShow(function(err, show) {
                return res.json({redirect: show.url});
            });
        } else {
            res.json(err || {show: show});
        }
    });
});

app.get('/channels', function(req, res){
    models.channels.getAll(function(err, channels) {
        if(!err){
            models.promotions.getShow(function(err, promotions){
                res.json(err || {channels: channels, promotions: promotions});
            });
        }
    });
});

app.get('/channels/:url', function(req, res){
        var ret = {};
        models.channels.channelByUrl(req.params.url).then(
            function(channel) {
                ret.channel = channel;
                return models.shows.showsByChannel(ret.channel._id, 6);
            }
        ).then(
            function(shows) {
                ret.shows = shows;
                return models.comments.getCommentsByTypeAndEntity(ret.channel._id, 'channel');
            }
        ).then(
            function(comments) {
                ret.channel.comments = comments;
                models.shows.setShowPicture(ret.shows, function(parsed_shows){
                    ret.shows = parsed_shows;
                    res.json(ret);
                });
            }
        ).end(
            function(err) {
                console.error(err.stack);
                res.send(500, err.message);
            }
        );
});

app.get('/broadcasterArchive/:url', function(req, res){
    var ret = {},
        url = req.params.url;
    models.users.getBroadcasterByUrl(url).then(
        function(broadcaster){
            ret.broadcaster = broadcaster;
            return models.shows.showsByBroadcaster(ret.broadcaster._id);
        }
    ).then(
        function(shows){
            ret.shows = shows;
            res.json(ret);
        }
    ).end(
        function (err) {
            console.error(err.stack);
            res.send(500, err.message);
        }
    );
});

app.get('/postArchive/:id', function(req, res){
    var ret = {},
        id = req.params.id;
    models.posts.recentPostsByUserId(id).then(
        function(posts){
            ret.posts = posts;
            return models.users.getBroadcasterById(id);
        }
    ).then(
        function(broadcaster){
            ret.broadcaster = broadcaster;
            res.json(ret);
        }
    ).end(
        function (err) {
            console.error(err.stack);
            res.send(500, err.message);
        }
    );
});

app.get('/channelArchive/:url', function(req, res){
    var ret = {},
        url = req.params.url;
    models.channels.channelByUrl(url).then(
        function(channel) {
            ret.channel = channel;
            return models.shows.showsByChannel(channel._id);
        }
    ).then(
        function(shows){
            models.shows.setShowPicture(shows, function(parsed_shows){
                ret.shows = parsed_shows;
                res.json(ret);
            });
        }
    ).end(
        function (err) {
            console.error(err.stack);
            res.send(500, err.message);
        }
    );
});

app.post('/comment', function(req, res){
    var data = req.body,
        new_comment = new models.comments(data);

    new_comment.save(function(err, comment){
        models.comments.populate(comment, {path: 'user'}, function(err, comment){
            if(comment.comment_type == 'info_item') {
                global.registry.socketio.sockets.emit('new comment', comment.toObject());
                res.json({success: true});
            } else {
                res.json({ comment: comment });
            }
        });
    });
});

app.put('/addFavorite', function(req, res){
    var id = req.body.id,
        item_type = req.body.item_type;

    models.users.findById(req.user._id, function(err, user){
        user[item_type].push(id);
        user.save(function(err, usr){
            if(err){
                console.log(err);
                return res.json(err);
            }
            models.users.populate(usr, [{path: 'favorite_shows'}, {path: 'favorite_tracks'}], function(err, userr) {
                if (err) return res.json(err);
                res.json(err || {user: userr});
            });
        });
    });

});

app.put('/removeFavorite', function(req, res){
    var id = req.body.id,
        user = req.user,
        item_type = req.body.item_type;

    var temp = _.filter(user[item_type], function(item){
        return item._id.toString() != id;
    });
    user[item_type] = temp;

    user.save(function(err){
        res.json(err || {user: req.user});
    });
});


