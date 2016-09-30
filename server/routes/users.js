"use strict";
var rootApp = require.main.exports.app,
    passport = require('passport'),
    models = require('../models'),
    pw = require('password-hash'),
    LocalStrategy = require('passport-local').Strategy,
    crypto = require('crypto'),
    _ = require('lodash'),
    mail = require('./mail'),
    app = require('express')();

var getConfig = models.config.middleware();

//passport config
passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    },
    function(email, password, done) {
        models.users
            .findOne()
            .where('email', email)
            .populate('favorite_shows')
            .populate('favorite_tracks')
            .populate('saved_shows')
            .exec(function (err, user) {
                if (err) { return done(err); }
                if (!user) {
                    return done(null, false, { message: 'שם המשתמש שהכנסת הינו שגוי' });
                }
                if (!pw.verify(password, user.password)) {
                    return done(null, false, { message: 'הסיסמא שהזנת הינה שגוייה' });
                }
                return done(null, user);
            });
    }
));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    models.users
        .findById(id)
        .populate('favorite_shows')
        .populate('favorite_tracks')
        .populate('saved_shows')
        .exec(function(err, user) {
        done(err, user);
    });
});

rootApp.use('/users', app);

app.get('/loggedIn', function(req, res) {
    if (req.isAuthenticated())
        res.json({user: req.user});
    else
        res.json({user: null});
});

app.post('/login', function(req, res) {
    var vanilleMiddleware = passport.authenticate('local', function(err, user, info) {
        if (!user) {
            res.json({error: info.message});
        } else {
            req.login(user, function(err) {
                if (err) { res.json({error: 'ארעה שגיאה... אנא נסה שנית'}); }

                if ( req.body.rememberme ) {
                    req.session.cookie.maxAge = 2592000000; // 30*24*60*60*1000 Rememeber 'me' for 30 days
                } else {
                    req.session.cookie.expires = false;
                }
                res.json({user: user});
            });
        }
    });
    vanilleMiddleware(req, res);
});

app.post('/signup', function(req, res) {
    var new_user = new models.users(req.body);
    new_user.password = pw.generate(new_user.password);
    new_user.save(function (err, user) {
        if(err) {
            res.json({message: "כתובת המייל שסיפקת נמצאת כבר בשימוש. אנא הכנס כתובת מייל אחרת."});
        } else {
            req.login(user, function(err){
                res.json(err || {user: user});
            });
        }
    });
});

app.get('/logout', function(req, res){
    req.logout();
    res.json({user: {}});
});


function crypt(str) {
    var c = crypto.createCipher('aes-256-ecb', global.registry.COOKIE_SECRET);
    var ret = c.update(str, 'utf8', 'base64');
    ret += c.final('base64');
    ret = ret.replace('+', '-').replace('/', '_').replace('=', '.');
    return ret;
}

function decrypt(str) {
    var c = crypto.createDecipher('aes-256-ecb', global.registry.COOKIE_SECRET);
    str = str.replace('-', '+').replace('_', '/').replace('.', '=');
    var ret = c.update(str, 'base64', 'utf8');
    ret += c.final('utf8');
    return ret;
}

app.post('/forgot', getConfig, function (req, res) {
    var email = req.body.email,
        config = res.locals.config;
    models.users.findOne().where('email', email).exec(function(err, user){
        if(err) return res.json({error: err});
        if(!user) return res.json({'error': 'לא נמצא משתמש זה במערכת...'});
        var token = crypt(user._id + '?' + user.password),
            email_content = _.template(config.contact.forgot_password_email_template, {rootUrl: req.headers['origin'], token: token});
        mail.send({
            from: config.contact.email,
            to: user.email,
            subject: 'שחזור סיסמא לאתר רדיו הקצה',
            html: email_content
        });
        res.json({'message': 'מייל לשחזור סיסמא נשלח לכתובת דוא"ל אשר הכנסת. אנא מלא אחר ההוראות שבמייל בכדי להשלים את התהליך'});
    });
});

app.get('/reset', function (req, res) {
    var token = req.query.token,
        decrypted = decrypt(token),
        id = decrypted.split('?')[0],
        password = decrypted.split('?')[1];

    models.users.findById(id ,function(err, user){
        if(err) return res.json({error: err});
        if(user.password == password){
            req.login(user, function(err) {
                if(err) return res.send(404, 'bahhhhhhhhhhhhhhhh!!!!!');
                res.redirect('/reset');
            });
        } else {
            res.send(404, 'bahhhhhhhhhhhhhhhh!!!!!11111111111');
        }
    });
});

app.post('/reset', function (req, res) {
    var user = req.user,
        new_password = req.body.password;

    user.password = pw.generate(new_password);
    user.save(function (err, user) {
        if(err) {
            res.json({message: "ארעה שגיאה. אנא נסה שנית."});
        } else {
            res.json(err || {user: user});
        }
    });
});