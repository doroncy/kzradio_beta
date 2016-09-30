"use strict";
var registry = require('./registry'),
    nodestrum = require('nodestrum'),
    express = require('express'),
    path = require('path'),
    formage = require('formage'),
    mongoose = require('mongoose'),
    models = require('./models'),
    http = require('http'),
    dust = require('dustjs-linkedin'),
    consolidate = require('consolidate'),
    passport = require('passport');

nodestrum.register_process_catcher();

var app = module.exports.app = express();

app.set('site', 'KZRadio');
app.engine('dust', consolidate.dust);
app.set('view engine', 'dust');
app.set('views', path.join(__dirname, '..', 'front', 'views'));
dust.optimizers.format = function(ctx, node) { return node; };

app.use(nodestrum.domain_wrapper_middleware);
app.use(express.compress());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.cookieParser(registry.COOKIE_SECRET));
app.use(express.cookieSession({key: "connect.session"}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.errorHandler());
app.use(express.logger('dev'));

mongoose.connect(registry.mongo_cfg);
mongoose.set('debug', true);

var server = registry.server = http.createServer(app);
var socketio = require('./sockets')(server);

formage.init(app, express, models, {
    title: app.get('site') + ' Admin',
    username: registry.ADMIN.user,
    password: registry.ADMIN.password,
    //admin_users_gui: true,
    default_section: 'Radio',
    socketio: socketio
});


require('../front/dust/helpers');
require('../front/dust/filters');
require('./routes/api');
require('./routes/users');
//require('./routes/discogs');

require('./routes/routes');

app.use(app.router);


require('../front/compile_templates');

server.listen(registry.PORT, function(){
    console.log("Server listening on %s", server._connectionKey);
});
