"use strict";
var mail = {
    init: function() {
        this.transport = require('nodemailer').createTransport("SMTP",{
            service: "SendGrid",
            auth: global.registry.SENDGRID_AUTH
        });

        this.send = this.transport.sendMail.bind(this.transport);
    },
    send: function(o, cb) {
        cb(false);
    }
};

mail.init();

module.exports = mail;