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
console.log('Server running instance' + instance + ' on port ' + port)
io.origins('*:*');

io.sockets.on('connection', function (socket) {

    // *** ITEMS TO DO WHEN CONNECTING ***
    // Store the socket ID, and store the connection in ActivityHistory
    socket.connectionId = socket.id;
    // Request the connected client to announce its connection.
    // On the client side this function will share names but have different
    // functions based on it being a SASHA client or a Monitor client
    console.log('About to emit "Request Connection Type" with ' + socket.connectionId + ' ' + ServerStartTime);
    socket.emit('Request Connection Type', {
        ConnectionId: socket.connectionId,
        ServerStartTime: ServerStartTime
    });


    // Perform when any user disconnects
    socket.on('disconnect', function() {
        var ConnectionId = socket.connectionId;
        console.log('disconnect detected');
        if (typeof SashaUsers[ConnectionId] != 'undefined') {
	    var UserInfo = SashaUsers[ConnectionId];
	    console.log('disconnect from SASHA user');
            // Remove the SASHA connection from the list of connected users
            delete SashaUsers[ConnectionId];
            // Update the list of connected users on monitor  clients
            io.sockets.in('monitor').emit('Remove SASHA Connection from Monitor', {
                ConnectionId: ConnectionId,
                UserInfo: UserInfo
            });
        }
        console.log('disconnect not a SASHA user');
    });



    // Store SASHA User Information in SashaUsers Object
    // Add User to sasha room
    // Add User to list of SASHA users on monitor clients
    socket.on('Register SASHA User', function(data) {
        console.log('Register SASHA User was called');
        // Place in SASHA room 
        socket.join('sasha');
        var ConnectionId = data.ConnectionId;
        var UserInfo = data.UserInfo;
        var UTCTime = new Date().toISOString();
        UserInfo.ConnectTime = UTCTime;
        SashaUsers[ConnectionId] = UserInfo;
        console.log('About to emit Add SASHA Connection to Monitor');
        console.log (UserInfo);
        io.sockets.in('monitor').emit('Add SASHA Connection to Monitor', {
            ConnectionId: ConnectionId,
            UserInfo: UserInfo
        });
    });

    socket.on('Register Monitor User', function() {
        console.log('Registered Monitor Type User');
        socket.join('monitor');
    });

    socket.on('Notify Server Begin SASHA Flow', function(data) {
        console.log('In Notify Server Begin SASHA Flow');
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
        console.log('about to emit Notify Monitor Begin SASHA Flow to monitors');
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
        console.log('i am good');
        if (UserStatus != 'In Process') {
            console.log('not in proces');
            return;
        }
        console.log('was in process');
        UserInfo.FlowName = FlowName;
        UserInfo.StepName = StepName;
        console.log('stepName of ' + StepName + 'Flowname of ' + FlowName);
        UserInfo.StepStartTime =  new Date().toUTCString();
        UserInfo.FlowHistory.push(FlowName);
        UserInfo.StepHistory.push(StepName);
        UserInfo.StepTime.push(Date.now());
        SashaUsers[ConnectionId] = UserInfo;
        console.log('about to do one more broadcast to monitors');
        io.sockets.in('monitor').emit('Update Flow and Step Info', {
            ConnectionId: ConnectionId,
            UserInfo: UserInfo
        });
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
