"use strict";
var rootApp = require.main.exports.app,
    passport = require('passport'),
    OAuthStrategy = require('passport-oauth').OAuthStrategy,
    models = require('../models'),
    registry = require('../registry'),
    Discogs = require('disconnect').Client,
    app = require('express')();

//var request_data;
//var access_data;
//var dis = new Discogs();
//dis.getRequestToken(
//    registry.discogs_consumer_key,
//    registry.discogs_consumer_secret,
//    'http://kzradio-tng.herokuapp.com/authorized',
//    function(err, requestData){
//        exports.request_data = requestData;
//        request_data = requestData;
//        console.log('req');
//        // Persist "requestData" here so that the callback handler can
//        // access it later after returning from the authorize url
//    }
//);
//
//app.get('/authorized', function(req, res){
//    var dis = new Discogs(request_data);
//    dis.getAccessToken(
//        req.query.oauth_verifier, // Verification code sent back by Discogs
//        function(err, accessData){
//            // Persist "accessData" here for following OAuth calls
//            console.log('********************');
//            console.log(accessData);
//            console.log('********************');
//            exports.access_data = accessData;
//        }
//    );
//});

//passport config
//passport.use('discogs', new OAuthStrategy({
//        requestTokenURL: 'http://api.discogs.com/oauth/request_token',
//        accessTokenURL: 'http://api.discogs.com/oauth/access_token',
//        userAuthorizationURL: ' http://www.discogs.com/oauth/authorize',
//        consumerKey: 'leytOeDfdHxBjbSEZCQB',
//        consumerSecret: 'ziQYIOAUuhFmJhQwfvsKVzqERdcMtJtz'
//    },
//    function(token, tokenSecret, profile, done) {
//        User.findOrCreate(, function(err, user) {
//            done(err, user);
//        });
//    }
//));

