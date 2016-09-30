"use strict";
var registry = global.registry,
    socketio = require('socket.io'),
    log = require('nodestrum').logFor('sockets');

module.exports = function (server) {
    var io = registry.socketio = socketio.listen(server);

    io.sockets.on('connection', function (socket) {
        log("User connected to socket %s", socket.id);

        registry.userSockets[socket.id] = socket;

        socket.once('disconnect', function () {
            log("User disconnected from socket %s", socket.id);
            delete registry.userSockets[socket.id];
        });
    });

    return io;
};
