module.exports = global.registry = {
    PORT: process.env.PORT || 8080,
    FAKE_SOCKET: {emit: function(){}, on: function(){}, isFake: true},
    PASSPORT_COOKIE_NAME: 'kzr-auth',
    COOKIE_SECRET: 'kzr secret cookie',
    SENDGRID_AUTH: {user: process.env.SENDGRID_USERNAME, pass: process.env.SENDGRID_PASSWORD},
    ADMIN: {user: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASSWORD || 'admin'},
    userSockets: {},
    mongo_cfg: process.env.MONGOLAB_URI || 'mongodb://localhost/kzradio',
    discogs_consumer_key: 'zRLCPMybbYumWKSAxxkc',
    discogs_consumer_secret: 'blWmPAybiKKqGhEErRLYYCCmssCfStvu'
};
