"use strict";
var app = require.main.exports.app,
    models = require('../models');

/*
 middle-wares
 */

var getNavigationItems = models.navigation.menu(),
    getRoutes = models.posts.postRoutes(),
    getConfig = models.config.middleware(),
    getFooter = models.footer.getFooter(),
    isUserLoggedIn = function(req, res, next){
        if(req.user) {
            res.locals.user = true;
        }
        next();
    };

app.get('/routes.js', [getNavigationItems, getRoutes], function(req, res){
    res.locals.menu.items = res.locals.menu.items.filter(function () {
        //if (item.template == 'homepage') return false;
//        if (item.url == '/shows') return false;
        return true;
    });
    res.set('Content-Type', 'application/javascript');
    res.render('routes');
});

app.get('/[[item.lineupItem.image.url]]/convert', function(req, res){
    res.send(404, "");
});

app.get('/convert', function(req, res){
    res.send(404, "");
});

app.get('*', [getNavigationItems, getConfig, getFooter, isUserLoggedIn], function(req, res){
    res.render('index');
});
