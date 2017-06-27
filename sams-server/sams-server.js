var io = require('socket.io').listen(5500);

io.sockets.on('connection', function (socket) {
    socket.connectionId = socket.id;
    console.log('connection detected ' + socket.connectionId);
    socket.emit('you are connected', {
        connectionId: socket.connectionId
    });
});
