var SASHAUsers = new Object();

// Create SignalR Server listening on port 5501
var io = require('socket.io').listen(5501);

io.sockets.on('connection', function (socket) {
    socket.ConnectionId = socket.id;
    console.log('connection: ' + socket.ConnectionId);

    // Request the connected client to announce its connection.
    // This function is different depending on the type of connection (SASHA vs. Monitor)
    socket.emit('Announce Connection', {
        ConnectionId: socket.ConnectionId
    });

    // Send an emit to ALL clients to log the connection.
    // If i wanted this to not show to the connecting client itself I'd do io.sockets.broadcast.emit
    io.sockets.emit('Activity Connection', {
        ConnectionId: socket.ConnectionId
    });

    // Perform when a user disconnects
    socket.on('disconnect', function() {
        console.log('disconnection: ' + socket.ConnectionId);
        ConnectionId = socket.ConnectionId;
        // Remove the SASHA connection from the list of connected users
        delete SASHAUsers[ConnectionId];
        io.sockets.emit('Activity Disconnection', {
            ConnectionId: ConnectionId
        });
    });

    // Store SASHA User Information in SASHAUsers Object
    socket.on('Announce SASHA Connection', function(data) {
        connectionId = data.ConnectionId;
        userInfo = data.UserInfo;
        SASHAUsers[connectionId] = userInfo;
        io.sockets.emit('Dump SASHAUsers Object', {
            sashaUsers: SASHAUsers
        });
    });
});
