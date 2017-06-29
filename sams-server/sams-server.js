// Store the time of the server boot
var ServerStartTime = new Date().toUTCString();
var SashaUsers = new Object();

// Create SignalR Server listening on port 5501
var io = require('socket.io').listen(5501);
io.origins("*:*");

io.sockets.on('connection', function (socket) {

    // *** ITEMS TO DO WHEN CONNECTING ***
    // Store the socket ID, and store the connection in ActivityHistory
    socket.connectionId = socket.id;
    // Request the connected client to announce its connection.
    // On the client side this function will share names but have different
    // functions based on it being a SASHA client or a Monitor client
    socket.emit('Request Connection Type', {
        ConnectionId: socket.connectionId,
        ServerStartTime: ServerStartTime
    });


    // Perform when any user disconnects
    socket.on('disconnect', function() {
        var ConnectionId = socket.connectionId;
        if (typeof SashaUsers[ConnectionId] != 'undefined') {
            // Remove the SASHA connection from the list of connected users
            delete SashaUsers[ConnectionId];
            // Update the list of connected users on all clients
            io.sockets.in('monitor').emit('Remove SASHA Connection from Monitor', {
                SashaUsers: SashaUsers
            });
        }
    });



    // Store SASHA User Information in SashaUsers Object
    // Add User to sasha room
    // Add User to list of SASHA users on monitor clients
    socket.on('Register SASHA User', function(data) {
        // Place in SASHA room 
        socket.join('sasha');
        var ConnectionId = data.ConnectionId;
        var UserInfo = data.UserInfo;
        var UTCTime = new Date().toISOString();
        UserInfo.ConnectTime = UTCTime;
        SashaUsers[ConnectionId] = UserInfo;
        io.sockets.in('monitor').emit('Add SASHA Connection to Monitor', {
            ConnectionId: ConnectionId,
            UserInfo: UserInfo
        });
    });

    socket.on('Register Monitor User', function() {
        socket.join('monitor');
    });

    socket.on('Start SASHA Flow', function(data) {
        var ConnectionId = data.ConnectionId;
        var UserInfo = SashaUsers[ConnectionId];
        var FlowName = data.FlowName;
        var StepName = data.StepName;
        var SkillGroup = data.SkillGroup;
        UserInfo['SessionStartTime'] = new Date().toUTCString();
        UserInfo['StepStartTime'] = new Date().toUTCString();
        UserInfo['FlowName'] = FlowName;
        UserInfo['StepName'] = StepName;
        UserInfo['SkillGroup'] = SkillGroup;
        UserInfo.FlowHistory.push(FlowName);
        UserInfo.StepName.push(StepName);
        UserInfo.StepTime.push(Date.now());
        SashaUsers[ConnectionId] = UserInfo

    });

    // Display Connected SASHA users for newly connected monitor
    socket.on('Announce Monitor Connection', function() {
	console.log(SashaUsers);
        socket.emit('Retrieve SASHA Connected Users', {
            ServerStartTime: ServerStartTime,
            SashaUsers: SashaUsers
	    });
    });
});