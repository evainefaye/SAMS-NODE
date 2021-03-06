// Store the time of the server boot
var ServerStartTime = new Date().toUTCString();
var SashaUsers = new Object();
var HelpRequests = new Object();
var StepTimers = new Object;
var StepTimersInstance = new Object;
var FlowTimers = new Object;
var FlowTimersInstance = new Object;
var SessionCounter = new Object;

var FlowTimeLog = new Object;
var StepTimeLog = new Object;

var NotifyStalledStepTime = 300000;
var NotifyStalledFlowTime = 1200000;

var db_config = {};
global.con = '';

var argv = require('minimist')(process.argv.slice(2));
var env = argv.e
switch(env) {
case 'fde':
    var instance = 'FDE';
    var port = '5510';
    var UseDB = true;
    var LogStalledStep = true;
    var LogLongFlow = true;
    var database = 'sams_fde';	
    break;
case 'dev':
    var instance = 'FDE';
    var port = '5510';
    var UseDB = true;
    var LogStalledStep = true;
    var LogLongFlow = true;
    var database = 'sams_fde';	
case 'beta':
    var instance = 'PRE-PROD';
    var port = '5520';
    var UseDB = true;
    var LogStalledStep = true;
    var LogLongFlow = true;
    var database = 'sams_preprod';	
    break;
case 'pre-prod':
    var instance = 'PRE-PROD';
    var port = '5520';
    var UseDB = true;
    var LogStalledStep = true;
    var LogLongFlow = true;
    var database = 'sams_preprod';	
    break;
case 'prod':
    var instance = 'PROD';
    var port = '5530';
    var UseDB = true;
    var LogStalledStep = true;
    var LogLongFlow = true;
    var database = 'sams_prod';	
    break;
default:
    console.log('USAGE: node sams-server.js -e [fde | beta | prod]');
    process.exit();
    break;

//if (process.argv.length < 3) {
//    console.log('Environment not selected, defaulting to fde');
//    var instance='FDE';
//    var port='5510';
//} else {
//    var environment = process.argv[2].toLowerCase();
//    switch (environment) {
//    case 'fde':
//        var instance='FDE';
//        var port='5510';
//        break;
//    case 'pre-prod':
//        var instance='BETA';
//        var port='5520';
//        break;
//    case 'production':
//        var instance='PRODUCTION';
//        var port='5530'
//        break;
//    default:
//        var instance='DEFAULT (FDE)';
//        var port='5510';
//        break;
//    }
}


if (UseDB) {
    var mysql = require('mysql');
    var db_config = {
        host: 'localhost',
        user: 'sams',
        password: 'develop',
        database: database		
    };
    var connectDB = function(db_config) {
        global.con = mysql.createConnection(db_config);
        global.con.connect(function(err) {
            if (err) {
                if (err.fatal) {
                    UseDB = false;
                    console.log(new Date().toString(), 'Fatal Database Error: ' + err.code);
					console.log(new Date().toString(), 'Database Logging has been disabled.');
                }
            } else {
                UseDB = true;
                global.con.on('error', function(err) {
                    if (!err.fatal) {
                        return;
                    } else {
                        UseDB = false;
                        switch (err.code) {
                        case 'PROTOCOL_CONNECTION_LOST':
                            console.log(new Date().toString(), 'Database Connection Lost');
                            console.log(new Date().toString(), 'Database Logging temporarily unavailable');							
                            setTimeout(function() {
                                connectDB(db_config);
                            }, 10000);
                            break;
                        default:
                            console.log(new Date().toString(), 'Fatal Database Error: ' + err.code);
							console.log(new Date().toString(), 'Database Logging has been disabled.');							
                            break;
                        }
                    }
                });
                console.log(new Date().toString(),'Database Connection successful');
                console.log(new Date().toString(),'Database: ' + database);                
                var year = new Date().getFullYear();
                var month = new Date().getMonth() +1;
                var day = new Date().getDate();
                var expungeDate = year + '-' + month + '-' + day;
                var sql = "DELETE FROM screenshots WHERE timestamp < '" + expungeDate + "' and retain IS NULL";
                global.con.query(sql);
                var sql = "DELETE FROM duration_log_step_automation WHERE in_progress = 'Y'";
                global.con.query(sql);
                var sql = "DELETE FROM duration_log_step_manual WHERE in_progress = 'Y'";
                global.con.query(sql);				
            }
        });
    }
    connectDB(db_config);
}


// Create SignalR Server listening on port 5501
var io = require('socket.io').listen(port);
console.log(new Date().toString(), 'Server running instance ' + instance + ' on port ' + port)
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
            delete FlowTimersInstance[ConnectionId];
            delete StepTimersInstance[ConnectionId];
            clearInterval(FlowTimers[ConnectionId]);
            clearInterval(StepTimers[ConnectionId]);
            var AttUID = UserInfo.AttUID;
            if (typeof SessionCounter[AttUID] != 'undefined') {
                SessionCounter[AttUID]--;
            }
            if (!UserInfo.KeepScreenshots) {
                if (UseDB) {
                    var smpSessionId = UserInfo.SmpSessionId;
                    if (smpSessionId) {
                        var sql = "DELETE FROM screenshots WHERE smpsessionId='" + smpSessionId + "'";
                        global.con.query(sql);
                    }
                }
            } else {
                if (UseDB) {
                    var smpSessionId = UserInfo.SmpSessionId;
                    if (smpSessionId) {
                        var sql = "UPDATE screenshots set retain='Y' WHERE smpsessionId='" + smpSessionId + "'";
                        global.con.query(sql);
                    }
                }
            }
			if (UseDB) {
				flowStartTime = UserInfo['SessionStartTime'];
				flowStopTime = new Date().toUTCString();
				elapsedTime = (Date.parse(flowStopTime)-Date.parse(flowStartTime))/1000;
				if (!isNaN(elapsedTime)) {
					flowStartTime = new Date(flowStartTime).toISOString().slice(0, 19).replace('T', ' ');
					flowStopTime = new Date(flowStopTime).toISOString().slice(0, 19).replace('T', ' ');
					var sql = 'REPLACE INTO duration_log_session (smp_session_id, start_time, stop_time, elapsed_time, att_uid, first_name, last_name, manager_id, work_source, business_line, task_type, threshold_exceeded) VALUES(' + 
						mysql.escape(UserInfo.SmpSessionId) + ',' + 
						mysql.escape(flowStartTime) + ',' +
						mysql.escape(flowStopTime) + ',' + 
						mysql.escape(elapsedTime) + ',' +
						mysql.escape(UserInfo.AttUID) + ',' + 
						mysql.escape(UserInfo.FirstName) + ',' + 
						mysql.escape(UserInfo.LastName) + ',' +
						mysql.escape(UserInfo.Manager) + ',' +
						mysql.escape(UserInfo.SAMSWorkType) + ',' + 
						mysql.escape(UserInfo.SkillGroup) + ',' + 
						mysql.escape(UserInfo.TaskType) + ',';
					if (elapsedTime > 1200) {
						sql = sql + mysql.escape('Y');
					} else {
						sql = sql + mysql.escape('N');
					}
					sql = sql + ')';
					global.con.query(sql);
				}
				var OldFlowName = UserInfo.FlowName;
				var OldStepName = UserInfo.StepName;
				var OldStepStartTime =  UserInfo.StepStartTime;
				var StepStopTime = new Date().toUTCString();
				elapsedTime = (Date.parse(StepStopTime)-Date.parse(OldStepStartTime))/1000;
				if (!isNaN(elapsedTime)) {
					var sql = '';
					switch (OldStepName) {
					case "SO WAIT":
						OldStepStartTime = new Date(OldStepStartTime).toISOString().slice(0, 19).replace('T', ' ');
						StepStopTime = new Date(StepStopTime).toISOString().slice(0, 19).replace('T', ' ');
						var sql = 'INSERT INTO duration_log_step_automation (smp_session_id, start_time, stop_time, elapsed_time, att_uid, first_name, last_name, manager_id, work_source, business_line, task_type, flow_name, step_name, in_progress, threshold_exceeded) VALUES(' + 
							mysql.escape(UserInfo.SmpSessionId) + ',' + 
							mysql.escape(OldStepStartTime) + ',' +
							mysql.escape(StepStopTime) + ',' + 
							mysql.escape(elapsedTime) + ',' +
							mysql.escape(UserInfo.AttUID) + ',' + 
							mysql.escape(UserInfo.FirstName) + ',' + 
							mysql.escape(UserInfo.LastName) + ',' +
							mysql.escape(UserInfo.Manager) + ',' +
							mysql.escape(UserInfo.SAMSWorkType) + ',' + 
							mysql.escape(UserInfo.SkillGroup) + ',' + 
							mysql.escape(UserInfo.TaskType) + ',' +
							mysql.escape(OldFlowName) + ',' +
							mysql.escape(OldStepName) +	 ',' +
							mysql.escape('N') + ',';
						if (elapsedTime > 30) {
							sql = sql + mysql.escape('Y') + ')';
						} else {
							sql = sql + mysql.escape('N') + ')';
						}
						break;
					default:
						OldStepStartTime = new Date(OldStepStartTime).toISOString().slice(0, 19).replace('T', ' ');
						StepStopTime = new Date(StepStopTime).toISOString().slice(0, 19).replace('T', ' ');				
						var sql = 'INSERT INTO duration_log_step_manual (smp_session_id, start_time, stop_time, elapsed_time, att_uid, first_name, last_name, manager_id, work_source, business_line, task_type, flow_name, step_name, in_progress, threshold_exceeded) VALUES(' + 
							mysql.escape(UserInfo.SmpSessionId) + ',' + 
							mysql.escape(OldStepStartTime) + ',' +
							mysql.escape(StepStopTime) + ',' + 
							mysql.escape(elapsedTime) + ',' +
							mysql.escape(UserInfo.AttUID) + ',' + 
							mysql.escape(UserInfo.FirstName) + ',' + 
							mysql.escape(UserInfo.LastName) + ',' +
							mysql.escape(UserInfo.Manager) + ',' +
							mysql.escape(UserInfo.SAMSWorkType) + ',' + 
							mysql.escape(UserInfo.SkillGroup) + ',' + 
							mysql.escape(UserInfo.TaskType) + ',' +
							mysql.escape(OldFlowName) + ',' +
							mysql.escape(OldStepName) +
							mysql.escape('N') + ',';
						if (elapsedTime > 300) {
							sql = sql + mysql.escape('Y')
						} else {
							sql = sql + mysql.escape('N');
						}
						break;
					}
					if (sql != '') {
						global.con.query(sql);
					}
					var sql = 'UPDATE duration_log_step_manual SET in_progress="N" WHERE smp_session_id ="' + UserInfo.SmpSessionId + '"';
					global.con.query(sql);
					var sql = 'UPDATE duration_log_step_automation SET in_progress="N" WHERE smp_session_id ="' + UserInfo.SmpSessionId + '"';
					global.con.query(sql);					
				}
			}
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
        UserInfo.KeepScreenshots = false;
        SashaUsers[ConnectionId] = UserInfo;
        // Join Rooms
        socket.join(UserInfo.LocationCode);
        socket.join(UserInfo.City);
        socket.join(UserInfo.Country);
        socket.join(UserInfo.State);
        socket.join(UserInfo.Zip);
        socket.join(UserInfo.Manager);
        var AttUID = UserInfo.AttUID;
        if (typeof SessionCounter[AttUID] == 'undefined') {
            SessionCounter[AttUID] = 0;
        }
        SessionCounter[AttUID]++;
        socket.emit('Add User Sessions to Dictionary', {   		
            UserSessions: SessionCounter[AttUID]
        });
        io.sockets.in('monitor').emit('Add SASHA Connection to Monitor', {
            ConnectionId: ConnectionId,
            UserInfo: UserInfo
        });
    });
	
    socket.on('Register Monitor User', function() {
        socket.join('monitor');
    });

    socket.on('Register Helper User', function() {
        socket.join('helper');
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
        var SAMSWorkType = data.SAMSWorkType;
        var TaskType = data.TaskType;
        UserInfo['SessionStartTime'] = new Date().toUTCString();
        UserInfo['StepStartTime'] = new Date().toUTCString();
        UserInfo['FlowName'] = FlowName;
        UserInfo['StepName'] = StepName;
        if  (SkillGroup === null || SkillGroup == 'null' || SkillGroup == '' || SkillGroup == 'undefined') {
            SkillGroup = 'UNKNOWN';
        }
        UserInfo['SkillGroup'] = SkillGroup;
        UserInfo['SAMSWorkType'] = SAMSWorkType;
        UserInfo['TaskType'] = TaskType;
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
		
        FlowTimersInstance[ConnectionId] = 0;
        FlowTimers[ConnectionId] = setInterval(function () {
            FlowTimersInstance[ConnectionId]++;
            var elapsed = Math.floor(FlowTimersInstance[ConnectionId] * (NotifyStalledFlowTime / 1000) / 60);
            if (elapsed == 0 || elapsed > 1 ) {
                elapsedtext = elapsed + ' minutes';
            } else {
                var elapsedtext = elapsed + ' minute';
            }
            // if (instance == "PROD") {
            io.sockets.connected[ConnectionId].emit('Notify SASHA', {
                Message: 'You have a SASHA Flow that has been active for ' + elapsedtext + ' without completion.',
                RequireBlur: false,
                GiveFocus: true,
                RequireInteraction: true,
                ConnectionId: ConnectionId
            });
            // }
        }, NotifyStalledFlowTime);
        StepTimersInstance[ConnectionId] = 0;
        StepTimers[ConnectionId] = setInterval(function () {
            StepTimersInstance[ConnectionId]++;
            var elapsed = Math.floor(StepTimersInstance[ConnectionId] * (NotifyStalledStepTime / 1000) / 60);
            if (elapsed == 0 || elapsed > 1) {
                var elapsedtext = elapsed + ' minutes';
            } else {
                elapsedtext = elapsed + ' minute';
            }
            // if (instance == "PROD") {
            io.sockets.connected[ConnectionId].emit('Notify SASHA', {
                Message: 'SASHA Flow has not seen movement in  ' + elapsedtext + ' for your non-active SASHA window.',
                RequireBlur: true,
                GiveFocus: true,
                RequireInteraction: true,
                ConnectionId: ConnectionId
            });
            // }
        }, NotifyStalledStepTime);
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
		/* start debug */
		if (UseDB) {
			UserInfo = SashaUsers[ConnectionId];			
			var OldFlowName = UserInfo.FlowName;
			var OldStepName = UserInfo.StepName;
			var OldStepStartTime =  UserInfo.StepStartTime;
			var StepStopTime = new Date().toUTCString();
			elapsedTime = (Date.parse(StepStopTime)-Date.parse(OldStepStartTime))/1000;
			if (!isNaN(elapsedTime)) {
				var sql = '';
				switch (OldStepName) {
				case "SO WAIT":
					OldStepStartTime = new Date(OldStepStartTime).toISOString().slice(0, 19).replace('T', ' ');
					StepStopTime = new Date(StepStopTime).toISOString().slice(0, 19).replace('T', ' ');
					var sql = 'INSERT INTO duration_log_step_automation (smp_session_id, start_time, stop_time, elapsed_time, att_uid, first_name, last_name, manager_id, work_source, business_line, task_type, flow_name, step_name, in_progress, threshold_exceeded) VALUES(' + 
						mysql.escape(UserInfo.SmpSessionId) + ',' + 
						mysql.escape(OldStepStartTime) + ',' +
						mysql.escape(StepStopTime) + ',' + 
						mysql.escape(elapsedTime) + ',' +
						mysql.escape(UserInfo.AttUID) + ',' + 
						mysql.escape(UserInfo.FirstName) + ',' + 
						mysql.escape(UserInfo.LastName) + ',' +
						mysql.escape(UserInfo.Manager) + ',' +
						mysql.escape(UserInfo.SAMSWorkType) + ',' + 
						mysql.escape(UserInfo.SkillGroup) + ',' + 
						mysql.escape(UserInfo.TaskType) + ',' +
						mysql.escape(OldFlowName) + ',' +
						mysql.escape(OldStepName) + ',' +
						mysql.escape('Y') + ',';
					if (elapsedTime > 30) {
						sql = sql + "," + mysql.escape("Y");
					} else {
						sql = sql + mysql.escape('N');
					}
					sql = sql + ')';						
					break;
				default:
					OldStepStartTime = new Date(OldStepStartTime).toISOString().slice(0, 19).replace('T', ' ');
					StepStopTime = new Date(StepStopTime).toISOString().slice(0, 19).replace('T', ' ');				
					var sql = 'INSERT INTO duration_log_step_manual (smp_session_id, start_time, stop_time, elapsed_time, att_uid, first_name, last_name, manager_id, work_source, business_line, task_type, flow_name, step_name, in_progress, threshold_exceeded) VALUES(' + 
						mysql.escape(UserInfo.SmpSessionId) + ',' + 
						mysql.escape(OldStepStartTime) + ',' +
						mysql.escape(StepStopTime) + ',' + 
						mysql.escape(elapsedTime) + ',' +
						mysql.escape(UserInfo.AttUID) + ',' + 
						mysql.escape(UserInfo.FirstName) + ',' + 
						mysql.escape(UserInfo.LastName) + ',' +
						mysql.escape(UserInfo.Manager) + ',' +
						mysql.escape(UserInfo.SAMSWorkType) + ',' + 
						mysql.escape(UserInfo.SkillGroup) + ',' + 
						mysql.escape(UserInfo.TaskType) + ',' +
						mysql.escape(OldFlowName) + ',' +
						mysql.escape(OldStepName) + ',' +
						mysql.escape('Y') + ',';
					if (elapsedTime > 300) {
						sql = sql + mysql.escape('Y');
					} else {
						sql = sql + mysql.escape('N');
					}
					sql = sql + ')';
					break;
				}
				global.con.query(sql);
			}
		}
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
        if (UserInfo.UserStatus == 'In Process') {
            clearInterval(StepTimers[ConnectionId]);
            StepTimersInstance[ConnectionId] = 0;
            StepTimers[ConnectionId] = setInterval(function () {
                StepTimersInstance[ConnectionId]++;
                var elapsed = Math.floor(StepTimersInstance[ConnectionId] * (NotifyStalledStepTime / 1000) / 60);
                if (elapsed == 0 || elapsed > 1 ) {
                    var elapsedtext = elapsed + ' minutes';
                } else {
                    elapsedtext = elapsed + ' minute';
                }                
                io.sockets.connected[ConnectionId].emit('Notify SASHA', {
                    Message: 'SASHA Flow has not seen movement in  ' + elapsedtext + ' for your non-active SASHA window.',
                    RequireBlur: false,
                    GiveFocus: true,
                    RequireInteraction: true,
                    ConnectionId: ConnectionId
                });
            }, NotifyStalledStepTime);
        }
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
        if (typeof UserInfo != 'undefined') {
            UserInfo.OutputHistory.push(Output);
            SashaUsers[ConnectionId] = UserInfo;
            io.in(ConnectionId).emit('Send Agent Inputs to Monitor', {
                Output: Output
            });
        }
    });

    socket.on('Send User Message to Server', function(data) {
        var ConnectionId = data.ConnectionId;
        var BroadcastText = data.BroadcastText;
        if (BroadcastText.trim()) {
            io.sockets.connected[ConnectionId].emit('Send User Message to User', {        
                BroadcastText: BroadcastText,
                ConnectionId: ConnectionId
            });
        }
    })

    socket.on('Send Help Request to Server', function(data) {
        var ConnectionId = socket.connectionId;        
        var UserInfo = SashaUsers[ConnectionId];
        if (UserInfo) {
            var HelpInfo = new Object();
            HelpInfo['AttUID'] = UserInfo.AttUID;
            HelpInfo['FirstName'] = UserInfo.FirstName;
            HelpInfo['LastName'] = UserInfo.LastName;
            HelpInfo['ReverseName'] = UserInfo.ReverseName;
            HelpInfo['FullName'] = UserInfo.FullName;
            HelpInfo['SkillGroup'] = UserInfo.SkillGroup;
            HelpInfo['Request'] = data.Request;
            HelpInfo['RequestStatus'] = 'open';
            HelpInfo['RequestOpened'] = new Date().toUTCString();
            HelpRequests[ConnectionId] = HelpInfo;
            console.log('sending help request to helper');
            io.in('helper').emit('Send Help Request to Helper', {
                HelpRequest: HelpRequests[ConnectionId]
            });
        } else {
            console.log('User Did not exist');
        }
    });

    socket.on('Notify Server Session Closed', function (data) {
        var ConnectionId = data.ConnectionId;
        io.in(ConnectionId).emit('Notify Popup Session Closed');
    });
	
    socket.on('Store Data To Database', function (data) {
        if (UseDB) {
            var currentTime = new Date();			
            var FirstName = data.FirstName;
            var LastName = data.LastName;
            var AttUID = data.AttUID;
            var SMPSessionId = data.SMPSessionId;
            var headerInfo = data.headerInfo;
            var stepHistory = data.stepHistory;
            var imageTimestamp = data.imageTimestamp;
            var imageData = data.imageData;
            var dictionaryTimestamp = data.dictionaryTimestamp;
            var dictionaryData = data.dictionaryData;
            var sql = 'INSERT INTO stored_detail_view (GUID, headerInfo, stepHistory, imageTimestamp, imageData, dictionaryTimestamp, dictionaryData, first_name, last_name, attuid, smpsessionid, savedate) VALUES(UUID(), ' + 
			    mysql.escape(headerInfo) + ',' + 
                mysql.escape(stepHistory) + ',' + 
                mysql.escape(imageTimestamp) + ',' +
                mysql.escape(imageData) + ',' + 
                mysql.escape(dictionaryTimestamp) + ',' + 
                mysql.escape(dictionaryData) + ',' +
                mysql.escape(FirstName) + ',' +
                mysql.escape(LastName) + ',' +
                mysql.escape(AttUID) + ',' +
                mysql.escape(SMPSessionId) + ',' + 
                mysql.escape(currentTime) +
                ')';
			global.con.query(sql);
        }
    });
	
    socket.on('Save Screenshot', function(data) {
        if (UseDB) {
            var ConnectionId = socket.connectionId;        
            if (typeof SashaUsers[ConnectionId] != 'undefined') {
                var UserInfo = SashaUsers[ConnectionId];
                var ImageURL = data.ImageURL;
                var smpSessionId = UserInfo.SmpSessionId;
                var flowName = UserInfo.FlowName;
                var stepName = UserInfo.StepName;
                var currentTime = new Date();	
                if (smpSessionId) {
                    var sql = 'INSERT INTO screenshots (GUID, smpsessionId, timestamp, flowName, stepName, imageData) VALUES(UUID(),' + mysql.escape(smpSessionId) + ',' + mysql.escape(currentTime) + ',' + mysql.escape(flowName) + ',' + mysql.escape(stepName) + ',' + mysql.escape(ImageURL) + ')';
                    global.con.query(sql);
                }
            }
        }
    });

    socket.on('Retain Screenshot', function () {
        var ConnectionId = socket.connectionId;
        if (typeof SashaUsers[ConnectionId] != 'undefined') {		
            var UserInfo = SashaUsers[ConnectionId];
            UserInfo.KeepScreenshots = true;
            SashaUsers[ConnectionId] = UserInfo;
        }
    });

    socket.on('Retain Screenshot Remote', function (data) {
        var ConnectionId = data.connectionId;
        if (typeof SashaUsers[ConnectionId] != 'undefined') {		
            var UserInfo = SashaUsers[ConnectionId];		
            UserInfo.KeepScreenshots = true;
            SashaUsers[ConnectionId] = UserInfo;
        }
    });

    socket.on('Get Listing', function (data) {
        if (UseDB) {
            var includeIncomplete = data.includeIncomplete;
            if (includeIncomplete == 'N') {
                var sql = 'SELECT DISTINCT smpSessionId from screenshots WHERE retain="Y" ORDER BY timestamp ASC';  
            } else {
                var sql = 'SELECT DISTINCT smpSessionId from screenshots ORDER BY timestamp ASC';
            }
            global.con.query(sql, (err, rows) => {
                socket.emit('Receive Listing', {
                    data: rows
                });
            });
        }
    });
	
    socket.on('Get ScreenShots', function(data) {
        if (UseDB) {
            var smpSessionId = data.smpSessionId;
            if (smpSessionId) {
                var sql = 'SELECT * FROM screenshots WHERE smpsessionId="' + smpSessionId + '" ORDER BY timestamp ASC';
  			    global.con.query(sql, (err, rows) => {
                    rows.forEach((row) => {
                        var timestamp = row.timestamp;
                        var flowName = row.flowName;
                        var stepName = row.stepName;
                        var imageData = row.imageData;
                        socket.emit('Get ScreenShots', {
                            timestamp: timestamp,
                            flowName: flowName,
                            stepName: stepName,
                            imageData: imageData
                        });
                    });
                });
            }
        }
    });	
});
