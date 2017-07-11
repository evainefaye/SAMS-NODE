// Store the time of the server boot
var ServerStartTime = new Date().toUTCString();
var SashaUsers = new Object();
var HelpRequests = new Object();


if (process.argv.length < 3) {
    console.log('Environment not selected, defaulting to fde');
    var instance='FDE';
    var port='5510';
} else {
    var environment = process.argv[2].toLowerCase();
    switch (environment) {
    case 'fde':
        var instance='FDE';
        var port='5510';
        break;
    case 'pre-prod':
        var instance='BETA';
        var port='5520';
        break;
    case 'production':
        var instance='PRODUCTION';
        var port='5530'
        break;
    default:
        var instance='DEFAULT (FDE)';
        var port='5510';
        break;
    }
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
    // functions based on it being a SASHA client, Monitor Client, or SASHA Detail Client
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
        // Join Rooms
        socket.join(UserInfo.LocationCode);
        socket.join(UserInfo.City);
        socket.join(UserInfo.Country);
        socket.join(UserInfo.State);
        socket.join(UserInfo.Zip);
        socket.join(UserInfo.Manager);
        io.sockets.in('monitor').emit('Add SASHA Connection to Monitor', {
            ConnectionId: ConnectionId,
            UserInfo: UserInfo
        });
    });

    socket.on('Register Monitor User', function() {
        socket.join('monitor');
    });

    socket.on('Notify Server Received Skill Group', function(data) {
        var ConnectionId = socket.connectionId;
        if (typeof SashaUsers[ConnectionId] == 'undefined') {
            return;
        }
        var UserInfo = SashaUsers[ConnectionId];
        if (UserInfo.UserStatus != 'Inactive') {
            return;
        }
        UserInfo.UserStatus = 'In Process';
        var FlowName = data.FlowName;
        var StepName = data.StepName;
        var StepType = data.StepType;
        //var FormName = data.FormName;
        var SkillGroup = data.SkillGroup;
        UserInfo['SessionStartTime'] = new Date().toUTCString();
        UserInfo['StepStartTime'] = new Date().toUTCString();
        UserInfo['FlowName'] = FlowName;
        UserInfo['StepName'] = StepName;
        if  (SkillGroup === null || SkillGroup == 'null' || SkillGroup == '' || SkillGroup == 'undefined') {
            SkillGroup = 'UNKNOWN';
        }
        UserInfo['SkillGroup'] = SkillGroup;
        socket.join(SkillGroup);
        //UserInfo.FlowHistory.push(FlowName);
        //UserInfo.StepHistory.push(StepName);
        //UserInfo.StepTypeHistory.push(StepType);
        //UserInfo.FormNameHistory.push(FormName);
        if (StepType == 'WAIT') {
            UserInfo.OutputHistory.push(new Object());
        }
        //UserInfo.StepTime.push(Math.floor(Date.now()/1000));
        SashaUsers[ConnectionId] = UserInfo;
        io.sockets.in('monitor').emit('Notify Monitor Begin SASHA Flow', {
    	    ConnectionId: ConnectionId,
     	    UserInfo: UserInfo
        });
    });

    socket.on('Send SAMS Flow and Step', function(data) {
        var ConnectionId = socket.connectionId;
        if (typeof SashaUsers[ConnectionId] == 'undefined') {
            return;
        }
        var FlowName = data.FlowName;
        var StepName = data.StepName;
        var StepType = data.StepType;
        var FormName = data.FormName;
        var UserInfo = SashaUsers[ConnectionId];
        UserInfo.FlowName = FlowName;
        UserInfo.StepName = StepName;
        UserInfo.StepStartTime =  new Date().toUTCString();
        UserInfo.FlowHistory.push(FlowName);
        UserInfo.StepHistory.push(StepName);
        UserInfo.StepTypeHistory.push(StepType);
        UserInfo.FormNameHistory.push(FormName);
        if (StepType == 'WAIT') {
            UserInfo.OutputHistory.push(new Object());
        }
        UserInfo.StepTime.push(Math.floor(Date.now()/1000));
        SashaUsers[ConnectionId] = UserInfo;
        io.sockets.in('monitor').in(ConnectionId).emit('Update Flow and Step Info', {
            ConnectionId: ConnectionId,
            UserInfo: UserInfo
        });
    });

    socket.on('Alert Server of Stalled Session', function(data) {
        var ConnectionId = data.ConnectionId;
        if (typeof SashaUsers[ConnectionId] == 'undefined') {
            return;
        }
        var UserInfo = SashaUsers[ConnectionId];
        io.sockets.in('monitor').emit('Alert Monitor of Stalled Session', {
            UserInfo: UserInfo
        });
    });

    socket.on('Request Current Connection Data', function(data) {
        var ConnectionId = socket.connectionId;
        var ActiveTab = data.ActiveTab;
        for (var key in SashaUsers) {
            var UserInfo = SashaUsers[key];
            if (UserInfo.UserStatus == 'Inactive') {
                socket.emit('Add SASHA Connection to Monitor', {
                    ConnectionId: key,
                    UserInfo: UserInfo
                });
            } else {
                socket.emit('Notify Monitor Begin SASHA Flow', {
                    ConnectionId: ConnectionId,
                    UserInfo: UserInfo
                });
            }
        }
        if (ActiveTab != 'none') {
            socket.emit('Reset Active Tab', {
                ActiveTab: data.ActiveTab
            });
        }
    });

    socket.on('Request Client Detail from Server', function(data) {
        var ClientId = data.ConnectionId;
        socket.join(ClientId);
        if (typeof SashaUsers[ClientId] == 'undefined') {
            socket.emit('No Such Client');
            return;
        }
        var UserInfo = SashaUsers[ClientId];
        socket.emit('Receive Client Detail from Server', {
            UserInfo: UserInfo
        });
    });

    socket.on('Request SASHA ScreenShot from Server', function(data) {
        var ConnectionId = data.connectionId;
        io.emit('Request SASHA ScreenShot from SASHA', {
            ConnectionId: ConnectionId
        });
    });

    socket.on('Send SASHA ScreenShot to Server', function(data) {
        var ImageURL = data.ImageURL;
        var ConnectionId = socket.connectionId;
        io.in(ConnectionId).emit('Send SASHA ScreenShot to Monitor', {
            ImageURL: ImageURL
        });
    });

    socket.on('Request SASHA Dictionary from Server', function(data) {
        var ConnectionId = data.connectionId;
        io.emit('Request SASHA Dictionary from SASHA', {
            ConnectionId: ConnectionId
        });
    });

    socket.on('Send SASHA Dictionary to Server', function(data) {
        var Dictionary = data.Dictionary;
        var ConnectionId = socket.connectionId;
        io.in(ConnectionId).emit('Send SASHA Dictionary to Monitor', {
            Dictionary: Dictionary
        });
    });

    socket.on('Request SASHA Skill Group Info from Server', function(data) {
        var ConnectionId = data.ConnectionId;
        var RequestValue = data.RequestValue
        io.emit('Request SASHA Skill Group Info from SASHA', {
            RequestValue: RequestValue,
            ConnectionId: ConnectionId
        });
    });

    socket.on('Send SASHA Skill Group Info to Server', function(data) {
        var ResultValue = data.ResultValue
        var ConnectionId = socket.connectionId
        io.in(ConnectionId).emit('Send SASHA Skill Group Info to Monitor', {
            ResultValue: ResultValue
        });
    });

    socket.on('Send Agent Inputs to SAMS', function(data) {
        var ConnectionId = socket.connectionId;
        var Output = data.Output;
        var UserInfo = SashaUsers[ConnectionId];
        UserInfo.OutputHistory.push(Output);
        SashaUsers[ConnectionId] = UserInfo;
        io.in(ConnectionId).emit('Send Agent Inputs to Monitor', {
            Output: Output
        });
    });

    socket.on('Request Help', function() {
        var ConnectionId = socket.connectionId;
        var UserInfo = SashaUsers[ConnectionId];
        var HelpInfo = new Object();
        HelpInfo.ConnectionId = UserInfo.ConnectionId;
        HelpInfo.Name = UserInfo.ReverseName;
        HelpInfo.SkillGroup = UserInfo.SkillGroup;
        var UTCTime = new Date().toISOString();
        UserInfo.RequestTime = UTCTime;
        HelpInfo.RequestStatus = 'Received';
        HelpRequests[ConnectionId] = HelpInfo;
        //io.in(ConnectionId).emit('Send Output to Monitor', {
        //Output: Output
        //});
    });

    socket.on('Notify Server Session Closed', function (data) {
        var ConnectionId = data.ConnectionId;
        io.in(ConnectionId).emit('Notify Popup Session Closed');
    });
});
