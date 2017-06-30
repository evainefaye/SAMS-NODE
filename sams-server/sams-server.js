// Store the time of the server boot
var ServerStartTime = new Date().toUTCString();
var SashaUsers = new Object();

var environment = process.argv[0];
switch (environment) {
case 'dev':
    var instance='DEVELOPMENT';
    var port='5500';
    break;
case 'fde':
    var instance='FDE';
    var port='5510';
case 'beta':
    var instance='BETA';
    var port='5520';
    break;
case 'prod':
    var instance='PRODUCTION';
    var port='5530'
    break;
default:
    var instance='DEFAULT (FDE)';
    var port='5510';
    break;
}

// Create SignalR Server listening on port 5501
var io = require('socket.io').listen(port);
console.log('Server running instance ' + instance + ' on port ' + port)
io.origins('*:*');

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
	    var UserInfo = SashaUsers[ConnectionId];
            // Remove the SASHA connection from the list of connected users
            delete SashaUsers[ConnectionId];
            // Update the list of connected users on monitor  clients
            io.sockets.in('monitor').emit('Remove SASHA Connection from Monitor', {
                ConnectionId: ConnectionId,
                UserInfo: UserInfo
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

    socket.on('Notify Server Begin SASHA Flow', function(data) {
        var ConnectionId = socket.connectionId;
        var UserInfo = SashaUsers[ConnectionId];
        if (UserInfo.UserStatus != 'Inactive') {
            return;
        }
        UserInfo.UserStatus = 'In Process';
        var FlowName = data.FlowName;
        var StepName = data.StepName;
        var SkillGroup = data.SkillGroup;
        UserInfo['SessionStartTime'] = new Date().toUTCString();
        UserInfo['StepStartTime'] = new Date().toUTCString();
        UserInfo['FlowName'] = FlowName;
        UserInfo['StepName'] = StepName;
        if  (SkillGroup === null || SkillGroup == 'null' || SkillGroup == '' || SkillGroup == 'undefined') {
            SkillGroup = 'UNKNOWN';
        }
        UserInfo['SkillGroup'] = SkillGroup;
        UserInfo.FlowHistory.push(FlowName);
        UserInfo.StepHistory.push(StepName);
        UserInfo.StepTime.push(Date.now());
        SashaUsers[ConnectionId] = UserInfo
        io.sockets.in('monitor').emit('Notify Monitor Begin SASHA Flow', {
        	ConnectionId: ConnectionId,
        	UserInfo: UserInfo
        });
    });

    socket.on('Send SAMS Flow and Step', function(data) {
        var ConnectionId = socket.connectionId;
        var FlowName = data.FlowName;
        var StepName = data.StepName;
        var UserInfo = SashaUsers[ConnectionId];
        var UserStatus = UserInfo.UserStatus;
        if (UserStatus != 'In Process') {
            return;
        }
        UserInfo.FlowName = FlowName;
        UserInfo.StepName = StepName;
        UserInfo.StepStartTime =  new Date().toUTCString();
        UserInfo.FlowHistory.push(FlowName);
        UserInfo.StepHistory.push(StepName);
        UserInfo.StepTime.push(Date.now());
        SashaUsers[ConnectionId] = UserInfo;
        io.sockets.in('monitor').emit('Update Flow and Step Info', {
            ConnectionId: ConnectionId,
            UserInfo: UserInfo
        });
    });
});
