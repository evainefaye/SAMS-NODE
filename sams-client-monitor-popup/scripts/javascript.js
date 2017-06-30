$(document).ready(function () {

    var hostname = window.location.hostname.split('.')[0];
    // Set the location of the Node.JS server
    var serverAddress = 'http://108.226.174.227';
    switch (hostname) {
    case 'dev':
        var socketURL = serverAddress +':5500';
        var version = 'DEVELOPMENT - WINDOWS MONITOR';
        break;
    case 'fde':
        var socketURL = serverAddress + ':5010';
        var version = 'FDE (FLOW DEVELOPMENT ENVIRONMENT)';
        break;
    case 'beta':
        var socketURL = serverAddress + ':5520';
        version = 'BETA (PRE-PROD)';
        break;
    case 'prod':
        var socketURL = serverAddress + ':5530';
        version = 'PRODUCTION';
        break;
    default:
        var socketURL = serverAddress + ':5510';
        version = 'DEFAULT (FDE)';
        break;
    }

	// Initialize variables
    window.socket = io.connect(socketURL)
	
	socket.on('connect', function () {
		vars = getURLVars();
		connectionId = vars.id;
        window.SASHAClientId = connectionId;
		socket.emit('Request Client Detail from Server', {
			ConnectionId: connectionId
		});
	});

	socket.on('disconnect', function () {
	});

	
    $('#flowHistoryTree').hide();
    $('.flowHistoryWrapper').off('click.showHistory').on('click.showHistory', function () {
        $('#flowHistoryTree').toggle(400, function () {
            if ($('#flowHistoryTree').is(':visible')) {
                $('#flowHistoryWrapperStatus').html("HIDE ");
            } else {
                $('#flowHistoryWrapperStatus').html("SHOW ");
            }
        });
    });



    // Receives Client Information from server
	socket.on('Receive Client Detail from Server', function (data) {
		UserInfo = data.UserInfo
		connectionId = UserInfo.ConnectionId;
		attUID = UserInfo.AttUID;
		agentName = UserInfo.FullName;
		locationCode = UserInfo.LocationCode;
		smpSessionId = UserInfo.SmpSessionId;
		skillGroup = UserInfo.SkillGroup;
		sessionStartTime = UserInfo.SessionStartTime;
		flowName = UserInfo.FlowName;
		stepName = UserInfo.StepName;
		stepStartTime = UserInfo.StepStartTime;
        sessionStartTimestamp = new Date(sessionStartTime);
        sessionStartTime = toLocalTime(sessionStartTime);
        stepStartTimestamp = new Date(stepStartTime);
        stepStartTime = toLocalTime(stepStartTime);
        if (skillGroup === null || skillGroup === "null" || skillGroup === "") {
            skillGroup = "UNKNOWN";
        }
        row = "<table class='noborder center'>" +
            "<tbody>" +
            "<tr><td class='head text-right'>AGENT NAME:</td><td class='data text-left'>" + agentName + " (" + attUID + ")</td>" +
            "<td class='head text-right'>SKILL GROUP:</td><td class='data text-left'>" + skillGroup + "</td></tr>" +
            "<tr><td class='head text-right'>SMP SESSION ID:</td><td class='data text-left'>" + smpSessionId + "</td></tr>" +
            "<tr><td class='head text-right'>SESSION START TIME:</td><td class='data text-left'>" + sessionStartTime + "</td>" +
            "<td class='head text-right'>SESSION DURATION:</td><td class='data text-left'><div id='sessionDuration_" + connectionId + "'></div></td></tr>" +
            "<tr><td class='head text-right'>STEP START TIME:</td><td id='stepStartTime_" + connectionId + "' class='data text-left'>" + stepStartTime + "</td>" +
            "<td class='head text-right'>STEP DURATION:</td><td class='data text-left'><div id='stepDuration_" + connectionId + "'></div></td></tr>" +
            "<tr><td class='head text-right'>FLOW NAME:</td><td id='flowName_" + connectionId + "' class='data text-left'>" + flowName + "</td>" +
            "<td class='head text-right'>STEP NAME:</td><td id='nodeName_" + connectionId + "' class='data text-left'>" + stepName + "</td></tr>" +
            "</tbody>" +
            "</table>";
        $('div.header').html(row);
        $('span#specificSkillGroup').html(skillGroup);

        $('div#sessionDuration_' + connectionId).countdown({
            since: sessionStartTimestamp,
            compact: true,
            layout: '{d<} {dn} {d1} {d>} {h<} {hnn} {sep} {h>} {mnn} {sep} {snn}',
            format: 'yowdhMS',
            onTick: checkTimerStylingSession
        });
        $('div#stepDuration_' + connectionId).countdown({
            since: stepStartTimestamp,
            compact: true,
            layout: '{d<} {dn} {d1} {d>} {h<} {hnn} {sep} {h>} {mnn} {sep} {snn}',
            format: 'yowdhMS',
            onTick: checkTimerStylingStep
        });
        document.title = "SAMS - " + agentName + " (" + attUID + ")";
        socket.emit('Request SASHA ScreenShot from Server', {
			ConnectionId: connectionId
		});
        socket.emit('Request SASHA Dictionary from Server', {
			ConnectionId: connectionId
		});
		getSkillGroupInfo(skillGroup);
    });
	
	socket.on('Update Flow and Step Info', function (data) {
		ConnectionId = data.ConnectionId;
		UserInfo = data.UserInfo;
		FlowName = UserInfo.FlowName;
		StepName = UserInfo.StepName;
		StepStartTime = UserInfo.StepStartTime;
		/* TO DO ITEM HERE TO ADD IN ADDING TO HISTORY TREE ALSO */
		if (ConnectionId === window.SASHAClientId) {
            StepStartTimestamp = new Date(StepStartTime);
            StepStartTime = toLocalTime(StepStartTime);
            $('div#stepDuration_' + connectionId).countdown('destroy');
            $('td#flowName_' + connectionId).html(FlowName);
            $('td#nodeName_' + connectionId).html(StepName);
            $('td#stepStartTime_' + connectionId).html(StepStartTime);
            $('div#stepDuration_' + connectionId).countdown({
                since: StepStartTimestamp,
                compact: true,
                layout: '{d<} {dn} {d1} {d>} {h<} {hnn} {sep} {h>} {mnn} {sep} {snn}',
                format: 'yowdhMS',
                onTick: checkTimerStylingStep
            });
        }
	});

});

toLocalTime = function (timestamp) {
    if (timestamp !== null) {
        timestamp = new Date(timestamp);
        hours = "0" + timestamp.getHours();
        hours = hours.slice(-2);
        minutes = "0" + timestamp.getMinutes();
        minutes = minutes.slice(-2);
        seconds = "0" + timestamp.getSeconds();
        seconds = seconds.slice(-2);
        return hours + ":" + minutes + ":" + seconds;
    }
};

toDisplayTimestamp = function (timestamp) {
    timestamp = toLocalTime(timestamp);
    return "[ " + timestamp + " ] ";
};

// Read a page's GET URL variables and return them as an associative array.
getURLVars = function () {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
};

// Add Styling on Timer if over threshold
checkTimerStylingSession = function (periods) {
    if ($.countdown.periodsToSeconds(periods) > 1200) {
        $(this).addClass('highlightDuration');
    } else {
        $(this).removeClass('highlightDuration');
    }
};


// Add Styling on Timer if over threshold
checkTimerStylingStep = function (periods) {
    if ($.countdown.periodsToSeconds(periods) > 300) {
        $(this).addClass('highlightDuration');
    } else {
        $(this).removeClass('highlightDuration');
    }
};

reloadDictionary = function () {
    $("ul#dict").empty();
    $('div#SASHADictionary').parent().css('background-image', 'url(Stylesheets/Images/loading.gif)');
    $('div.dictionaryInfo').html(dictionaryTime).addClass('hidden');
    $('div.dictionary').addClass('pending hidden');
    myHub.server.pullSASHADictionary(window.SASHAClientId);
};

getSkillGroupInfo = function (skillGroup) {
    // set skillGroup Specic Data Requests
    var requestValue = new Object();
    switch (skillGroup) {
        case "TSC":
            // You may use the below to have an empty column space if desired:
            // requstValue["blank"] == ""; 
            requestValue["VenueCode"] = "Venue Code";
            requestValue["VenueName"] = "Venue Name";
            requestValue["blank"] = "";
            requestValue["MAC"] = "MAC Address";
            requestValue["IP"] = "IP Address";
            requestValue["DeviceRole"] = "Device Type";
            break;
        default:
            break;
    }
    if (Object.keys(requestValue).length == 0) {
        $("div.skillGroup").hide();
        return;
    } else {
        myHub.server.pullSASHADictionaryValue(connectionId, requestValue);
    }
    setTimeout(function () { getSkillGroupInfo(skillGroup) }, 20000);
};


    // Close the window
//    myHub.client.closeWindow = function () {
//       window.close();
//    };

//    // Display SASHA screenshot
//    myHub.client.pushSASHAScreenshot = function (img) {
//        $('img#SASHAScreenshot').attr('src', img).show();
//        $('img#SASHAScreenshot').parent().css('background-image', 'none');
//        screenshotTime = new Date().toString();
//        screenshotTime = toLocalTime(screenshotTime);
//        $('div.screenshotInfo').html(screenshotTime).removeClass('hidden');
//        $('div.screenshot').removeClass('pending');
//        setTimeout(function () {
//            myHub.server.pullSASHAScreenshot(window.SASHAClientId);
//        }, 20000);
//    };

    // Display SASHA Dictionary
//    myHub.client.pushSASHADictionary = function (dictionary) {
//        $('ul#dict').html(dictionary);
//        var dictionaryTree = $('ul#dict').treeview({
//            collapsed: true,
//        });
//        $('div#SASHADictionary').parent().css('background-image', 'none');
//        dictionaryTime = new Date().toString();
//        dictionaryTime = toLocalTime(dictionaryTime);
//        $('div.dictionaryInfo').html(dictionaryTime).removeClass('hidden');
//        $('div.dictionary').removeClass('pending hidden');
//    };


	

//    myHub.client.pushSASHADictionaryValue = function (requestValue) {
//        var column = 1;
//        var items = 0;
//        row = "";
//        $.each(requestValue, function (key, value) {
//            if (column == 1) {
//                row = row + "<tr>";
//            }
//            row = row + "<td class='text-right labelCol'>" + key + "</td><td class='text-left dataCol'>" + value + "</td>";
//            items++;
//            column++;
//            if (column == 4) {
//                row = row + "</tr>";
//                column = 1;
//            }
//        });
//        if (items > 0) {
//            if (column == 2) {
//                row = row + "<td class='dataCol'>&nbsp;</td><td class='labelCol'>&nbsp;</td><td class='labelCol'>&nbsp;</td><td class='dataCol'>&nbsp;</td></tr>";
//            }
//            if (column == 3) {
//                row = row + "<td class='labelCol'>&nbsp;</td><td class='dataCol'>&nbsp;</td>";
//            }
//        } else {
//            row = row + "<tr><td colspan=6 center>NONE</td></tr>";
//        }
//        skillGroupTime = new Date().toString();
//        skillGroupTime = toLocalTime(skillGroupTime);
//        $('div#skillGroupTime').html(skillGroupTime).removeClass('hidden');
//        $("div#skillGroupInfoDisplay table tbody").empty();
//        $("div#skillGroupInfoDisplay table tbody:last").append(row);
//    };

//    myHub.client.dumpHistory = function (flowHistory, nodeHistory) {
//        var lastFlowName = "";
//        var historyJSON = '[';
//        for (i = 0; i < flowHistory.length; i++) {
//            flowName = flowHistory[i];
//            nodeName = nodeHistory[i];
//            if (i == 0) {
//                historyJSON = historyJSON + '{"name":"' + flowName + '", "children":[{"name":"' + nodeName + '"}';
//                lastFlowName = flowName;
//            }
//            if (i > 0) {
//                if (flowName == lastFlowName) {
//                    historyJSON = historyJSON + ', {"name":"' + nodeName + '"}';
//                    lastFlowName = flowName;
//                } else {
//                    historyJSON = historyJSON + ']}, {"name":"' + flowName + '", "children":[{"name":"' + nodeName + '"}';
//                    lastFlowName = flowName;
//                }
//            }
//        }
//        historyJSON = historyJSON + "]}]";
//        json = $.parseJSON(historyJSON);
//        $('#flowHistoryTree').tree({
//            data: json,
//            autoOpen: true
//        });
//    };

//    $.connection.hub.start()
//        .done(function () {
//            vars = getURLVars();
//            connectionId = vars.id;
//            window.SASHAClientId = connectionId;
//            myHub.server.requestClientDetail(connectionId);
//        });

//    $.connection.hub.disconnected(function () {
//        setTimeout(function () {
//            $.connection.hub.start()
//                .done(function () {
//                    disconnectNotified = false;
//                });
//        }, 5000); // Restart connection after 5 seconds.
//    });
//});