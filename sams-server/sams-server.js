var SashaUsers = new Object();
var ActivityHistory = new Array();

// Create SignalR Server listening on port 5501
var io = require('socket.io').listen(5501);
io.origins("*:*");

io.sockets.on('connection', function (socket) {

    // *** ITEMS TO DO WHEN CONNECTING ***
    // Store the socket ID, and store the connection in ActivityHistory
    socket.connectionId = socket.id;
    ActivityHistory.push('Connection: ' + socket.connectionId);

    // Request the connected client to announce its connection.
    // On the client side this function will share names but have different functionality register a SASHA user vs. a Monitor user
    socket.emit('Announce Connection', {
        ConnectionId: socket.connectionId
    });

    // Send an emit to All clients except the connecting client, to log the connection.
    // If i wanted this to show to ALL clients I'd do io.sockets.emit
    socket.broadcast.emit('Show Activity Connection', {
        ConnectionId: socket.connectionId
    });

    // Show the activity history record only to the connecting client
    socket.emit('Show Activity History', {
        ActivityHistory: ActivityHistory
    });

    // Perform when a user disconnects
    socket.on('disconnect', function() {
        ConnectionId = socket.connectionId;
        ActivityHistory.push('Disconnection: ' + socket.connectionId)
        // Remove the SASHA connection from the list of connected users
        delete SashaUsers[ConnectionId];
        io.sockets.emit('Show Activity Disconnection', {
            ConnectionId: ConnectionId
        });
        // Update the list of connected users on all clients
        io.sockets.emit('Show Connected Sasha Users', {
            SashaUsers: SashaUsers
        });        
    });

    // Store SASHA User Information in SashaUsers Object
    socket.on('Announce Sasha Connection', function(data) {
        ConnectionId = data.ConnectionId;
        UserInfo = data.UserInfo;
        UTCTime = new Date().toISOString();
        UserInfo.ConnectTime = UTCTime;
        SashaUsers[ConnectionId] = UserInfo;
        io.sockets.emit('Show Connected Sasha Users', {
            SashaUsers: SashaUsers
        });
    });

    // Display Connected SASHA users for newly connected monitor
    socket.on('Announce Monitor Connection', function() {
	console.log(SashaUsers);
        socket.emit('Show Connected Sasha Users', {
            SashaUsers: SashaUsers
	    });
    });
});
