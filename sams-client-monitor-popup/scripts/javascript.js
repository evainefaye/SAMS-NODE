// How many seconds between Auto refresh
var AutoRefresh = '30';
var skillgroupInfoTimer;
var screenshotTimer;

$(document).ready(function () {

    var vars = getURLVars();
    var env = vars.env;
    switch (env) {
    case 'fde':
        var socketURL = serverAddress + ':5510';
        break;
    case 'dev':
		var socketURL = serverAddress + ':5510';
        break;
    case 'beta':
        var socketURL = serverAddress + ':5520';
        break;
        case 'pre-prod':
        var socketURL = serverAddress + ':5520';
        break;
    case 'prod':
        var socketURL = serverAddress + ':5530';
        break;
    default:
        var socketURL = serverAddress + ':5530';
        break;
        }
    }
    // Initialize variables
    window.socket = io.connect(socketURL)

    socket.on('connect', function () {
        var vars = getURLVars();
        var connectionId = vars.id;
        window.SASHAClientId = connectionId;
        socket.emit('Request Client Detail from Server', {
            ConnectionId: connectionId
        });
    });

    socket.on('disconnect', function () {
    });

    $('img.fancybox').each(function(){
        var src = $(this).attr('src');
        var a = $('<a href="#" class="fancybox"></a>').attr('href', src);
        $(this).wrap(a);
        $('a.fancybox').fancybox({
            titlePositon: 'inside'
        });
    });

    $('button#dictionary-button').off('click').on('click', function () {
        $('div#SASHADictionary').parent().css('background-image', 'url(stylesheets/images/loading.gif)');
        reloadDictionary();
    });

    $('button#pushMessageButton').off('click.broadcast').on('click.broadcast', function () {
        var broadcastText = $('textarea#pushMessage').val().replace(/\r\n|\r|\n/g,'<br />')
        socket.emit('Send User Message to Server', {
            ConnectionId: window.SASHAClientId,
            BroadcastText: broadcastText
        });
        $('textarea#pushMessage').val('');
    });

    $('button#storeInfoButton').off('click.storeInfo').on('click.StoreInfo', function () {
        var headerData = $('div[class="headerInfo"]').html();		
        var stepHistory = $('div[class="flowHistoryWrapper"]').html();
        var imageTimestamp = $('div.screenshotInfo').html();
        var imageData = $('img#SASHAScreenshot').prop('src');
        var dictionaryTimestamp = $('div.dictionaryInfo').html();
        var dictionaryData = $('ul#dict').html();
        var dictionaryData = dictionaryData.replace(/'/g, '&#39;');
        socket.emit('Store Data To Database', {
            FirstName: window.UserInfo.FirstName,
            LastName: window.UserInfo.LastName,
            AttUID: window.UserInfo.AttUID,
            SMPSessionId: window.UserInfo.SmpSessionId,
            ConnectionId: window.SASHAClientId,
            headerInfo: headerData,
            stepHistory: stepHistory,
            imageTimestamp,
            imageData: imageData,
            dictionaryTimestamp: dictionaryTimestamp,
            dictionaryData: dictionaryData,
        });
    });	
	
    $('button#keepScreenshots').off('click.keepScreenshots').on('click.keepScreenshots', function () {
        socket.emit('Retain Screenshot Remote', {
            connectionId: window.SASHAClientId
        });
    });

    // Receives Client Information from server
    socket.on('Receive Client Detail from Server', function (data) {
        var UserInfo = data.UserInfo;
        window.UserInfo = UserInfo;
        var connectionId = UserInfo.ConnectionId;
        var attUID = UserInfo.AttUID;
        var agentName = UserInfo.FullName;
        var smpSessionId = UserInfo.SmpSessionId;
        var skillGroup = UserInfo.SkillGroup;
        var sessionStartTime = UserInfo.SessionStartTime;
        var flowName = UserInfo.FlowName;
        var stepName = UserInfo.StepName;
        var stepStartTime = UserInfo.StepStartTime;
        var sessionStartTimestamp = new Date(sessionStartTime);
        var sessionStartTime = toLocalTime(sessionStartTime);
        var stepStartTimestamp = new Date(stepStartTime);
        stepStartTime = toLocalTime(stepStartTime);
        if (skillGroup === null || skillGroup === 'null' || skillGroup === '') {
            skillGroup = 'UNKNOWN';
        }
        var row = '<table class="noborder center">' +
            '<tbody>' +
            '<tr><td class="head text-right">AGENT NAME:</td><td class="data text-left">' + agentName + ' (' + attUID + ')</td>' +
            '<td class="head text-right">SKILL GROUP:</td><td class="data text-left">' + skillGroup + '</td></tr>' +
            '<tr><td class="head text-right">SMP SESSION ID:</td><td class="data text-left">' + smpSessionId + '</td></tr>' +
            '<tr><td class="head text-right">SESSION START TIME:</td><td class="data text-left">' + sessionStartTime + '</td>' +
            '<td class="head text-right">SESSION DURATION:</td><td class="data text-left"><div id="sessionDuration_' + connectionId + '"></div></td></tr>' +
            '<tr><td class="head text-right">STEP START TIME:</td><td id="stepStartTime_' + connectionId + '" class="data text-left">' + stepStartTime + '</td>' +
            '<td class="head text-right">STEP DURATION:</td><td class="data text-left"><div id="stepDuration_' + connectionId + '"></div></td></tr>' +
            '<tr><td class="head text-right">FLOW NAME:</td><td id="flowName_' + connectionId + '" class="data text-left">' + flowName + '</td>' +
            '<td class="head text-right">STEP NAME:</td><td id="nodeName_' + connectionId + '" class="data text-left">' + stepName + '</td></tr>' +
            '</tbody>' +
            '</table>';
        $('div.header span.data').remove();
        $('div.headerInfo').append(row);
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
        document.title = 'SAMS - ' + agentName + ' (' + attUID + ')';
        socket.emit('Request SASHA ScreenShot from Server', {
            ConnectionId: connectionId
        });
        setTimeout(function () {
            socket.emit('Request SASHA Dictionary from Server', {
                ConnectionId: connectionId
            });
        },2000);
        getSkillGroupInfo(skillGroup);
        showFlowHistory(UserInfo);
    });

    socket.on('Update Flow and Step Info', function (data) {
        var connectionId = data.ConnectionId;
        var UserInfo = data.UserInfo;
        window.UserInfo = UserInfo;
        var FlowName = UserInfo.FlowName;
        var StepName = UserInfo.StepName;
        var StepStartTime = UserInfo.StepStartTime;
        var flowHistory = UserInfo.FlowHistory;
        var stepTime = UserInfo.StepTime;
        var itemCount = flowHistory.length;
        var StepType = UserInfo.StepTypeHistory[itemCount-1];
        var FormName = UserInfo.FormNameHistory[itemCount-1];
        var lastFlowName = flowHistory[itemCount-2];
        var stepDuration = stepTime[itemCount-1] - stepTime[itemCount-2];
        var stepDurationHours = Math.floor(stepDuration / 3600);
        stepDuration = stepDuration - stepDurationHours * 3600;
        var stepDurationMinutes = Math.floor(stepDuration / 60);
        stepDuration = stepDuration - stepDurationMinutes * 60;
        var stepDurationSeconds = stepDuration
        stepDurationHours = ('00' + stepDurationHours).slice(-2) + ':';
        stepDurationMinutes = ('00' + stepDurationMinutes).slice(-2) + ':';
        stepDurationSeconds = ('00' + stepDurationSeconds).slice(-2);
        var stepDurationString = stepDurationHours + stepDurationMinutes + stepDurationSeconds;
        var html = '';
        
        if (FlowName != lastFlowName) {        
            html = html + '<tr><td class="flow text-left">' + FlowName + '</td>';
        } else {
            html = html + '<tr><td class="flow text-left">&nbsp</td>'
        }
        html = html + '<td class="step text-left">' + StepName + '</td>';
        html = html + '<td class="type text-left">' + StepType + '</td>';
        html = html + '<td class="formname text-left">' + FormName + '</td>';
        html = html + '<td class="output text-left">&nbsp;</td>';        
        lastFlowName = FlowName;
        html = html + '<td class="duration text-right">&nbsp</td></tr>';
        $('table#flowHistoryTable tbody td:last').html(stepDurationString);
        $('table#flowHistoryTable > tbody').append(html);
        $('table#flowHistoryTable >tbody > td:odd').removeClass('stripe');
        $('table#flowHistoryTable > tbody > tr:even').addClass('stripe');
        if (connectionId === window.SASHAClientId) {
            var StepStartTimestamp = new Date(StepStartTime);
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

    socket.on('No Such Client', function () {
        $('body').empty();
        $('body').append('<div class="header text-center"><span class="data">NO SUCH CONNECTION</span></div>');
        socket.disconnect();
        setTimeout(function() { window.close(); }, AutoRefresh * 1000);
    });

    socket.on('Send SASHA ScreenShot to Monitor', function (data) {
        var ImageURL = data.ImageURL
        $('img#SASHAScreenshot').attr('src', ImageURL).show();
        $('img#SASHAScreenshot').parent().css('background-image', 'none');
        $('a.fancybox').attr('href',ImageURL);
        $('img.fancybox-image').attr('src', ImageURL);
        var screenshotTime = new Date().toString();
        screenshotTime = toLocalTime(screenshotTime);
        $('div.screenshotInfo').html(screenshotTime).removeClass('hidden');
        $('div.screenshot').removeClass('pending');
        // Request fresh screenshot every xx seconds
        screenshotTimer = setTimeout(function () {
            socket.emit('Request SASHA ScreenShot from Server', {
                ConnectionId: window.SASHAClientId
            });
        }, AutoRefresh * 1000);
    });

    socket.on('Send SASHA Dictionary to Monitor', function (data) {
        var Dictionary = data.Dictionary;
        $('ul#dict').html(Dictionary);
        $('ul#dict').treeview({
            collapsed: true,
        });
        $('div#SASHADictionary').parent().css('background-image', 'none');
        var dictionaryTime = new Date().toString();
        dictionaryTime = toLocalTime(dictionaryTime);
        $('div.dictionaryInfo').html(dictionaryTime).removeClass('hidden');
        $('div.dictionary').removeClass('pending hidden');
    });

    // Display Skill Group Dictionary Call out Data
    socket.on('Send SASHA Skill Group Info to Monitor', function(data) {
        var resultValue = data.ResultValue;
        var column = 1;
        var items = 0;
        var row = '';
        $.each(resultValue, function (key, value) {
            if (column == 1) {
                row = row + '<tr>';
            }
            row = row + '<td class="text-right labelCol">' + key + '</td><td class="text-left dataCol">' + value + '</td>';
            items++;
            column++;
            if (column == 4) {
                row = row + '</tr>';
                column = 1;
            }
        });
        if (items > 0) {
            if (column == 2) {
                row = row + '<td class="dataCol">&nbsp;</td><td class="labelCol">&nbsp;</td><td class="labelCol">&nbsp;</td><td class="dataCol">&nbsp;</td></tr>';
            }
            if (column == 3) {
                row = row + '<td class="labelCol">&nbsp;</td><td class="dataCol">&nbsp;</td>';
            }
        } else {
            row = row + '<tr><td colspan=6 center>NONE</td></tr>';
        }
        var skillGroupTime = new Date().toString();
        skillGroupTime = toLocalTime(skillGroupTime);
        $('div#skillGroupTime').html(skillGroupTime).removeClass('hidden');
        $('div#skillGroupInfoDisplay table tbody').empty();
        $('div#skillGroupInfoDisplay table tbody:last').append(row);
    });

    socket.on('Send Agent Inputs to Monitor', function(data) {
        var Output = data.Output
        var html = '<table class="table-bordered">';
        Object.keys(Output).forEach(function (key) { 
            html += '<tr>';
            html += '<td style="padding: 3px;">' + key + '</td>';
            html += '<td style="padding: 3px;">' + Output[key] + '</td>';
        });
        html += '</tr>';
        html += '</table>';
        $('table#flowHistoryTable > tbody > tr:last').find('.output').html(html);
    });

    socket.on('Notify Popup Session Closed', function () {
        if (!$('input#autoclose').is(':checked')) {
            clearTimeout(skillgroupInfoTimer);
            clearTimeout(screenshotTimer);
            $('button#dictionary-button').off('click');
            $('input#autoclose').closest('div').removeClass('text-left').addClass('data text-center').html('SESSION CLOSED');
            $('button#dictionary-button').remove();
        }
    });
});

let toLocalTime = function (timestamp) {
    if (timestamp !== null) {
        timestamp = new Date(timestamp);
        var hours = '0' + timestamp.getHours();
        hours = hours.slice(-2);
        var minutes = '0' + timestamp.getMinutes();
        minutes = minutes.slice(-2);
        var seconds = '0' + timestamp.getSeconds();
        seconds = seconds.slice(-2);
        return hours + ':' + minutes + ':' + seconds;
    }
};

// Read a page's GET URL variables and return them as an associative array.
let getURLVars = function () {
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
let checkTimerStylingSession = function (periods) {
    if ($.countdown.periodsToSeconds(periods) > 1200) {
        $(this).addClass('highlightDuration');
    } else {
        $(this).removeClass('highlightDuration');
    }
};


// Add Styling on Timer if over threshold
let checkTimerStylingStep = function (periods) {
    if ($.countdown.periodsToSeconds(periods) > 300) {
        $(this).addClass('highlightDuration');
    } else {
        $(this).removeClass('highlightDuration');
    }
};

let reloadDictionary = function () {
    $('ul#dict').empty();
    $('div#SASHADictionary').parent().css('background-image', 'url(stylesheets/images/loading.gif)');
    var dictionaryTime = new Date().toString();
    dictionaryTime = toLocalTime(dictionaryTime);
    $('div.dictionaryInfo').html(dictionaryTime).addClass('hidden');
    $('div.dictionary').addClass('pending hidden');
    socket.emit('Request SASHA Dictionary from Server', {
        ConnectionId: window.SASHAClientId
    });
};

let getSkillGroupInfo = function (skillGroup) {
    // set skillGroup Specic Data Requests
    var requestValue = new Object();
    switch (skillGroup) {
    case 'TSC':
        // You may use the below to have an empty column space if desired:
        // requestValue["blank"] == ''; 
        requestValue['VenueCode'] = 'Venue Code:';
        requestValue['VenueName'] = 'Venue Name:';
        requestValue['TicketNum'] = 'Ticket Number:';
        requestValue['MAC'] = 'MAC Address:';
        requestValue['IP'] = 'IP Address:';
        requestValue['DeviceRole'] = 'Device Type:';
        break;
    case 'UNKNOWN':
        requestValue['userName'] = 'ATT UID:';
    default:
        break;
    }
    if (Object.keys(requestValue).length == 0) {
        $('div.skillGroup').hide();
        return;
    } else {
        socket.emit('Request SASHA Skill Group Info from Server', {
            ConnectionId: window.SASHAClientId,
            RequestValue: requestValue
        });
    }
    skillgroupInfoTimer = setTimeout(function () { getSkillGroupInfo(skillGroup) }, AutoRefresh * 1000);
};

let showFlowHistory = function(UserInfo) {
    var flowHistory = UserInfo.FlowHistory;
    var stepHistory = UserInfo.StepHistory;
    var stepTypeHistory = UserInfo.StepTypeHistory;
    var formNameHistory = UserInfo.FormNameHistory;
    var outputHistory = UserInfo.OutputHistory;
    var stepTime = UserInfo.StepTime;
    var html = '<table id="flowHistoryTable">';
    html += '<thead>';
    html += '<tr>';
    html += '<th class="col-sm-3 text-center">FLOW NAME</th>';
    html += '<th class="col-sm-3 text-center">STEP NAME</th>';
    html += '<th class="col-sm-1 text-center">STEP TYPE</th>';
    html += '<th class="col-sm-1 text-center">FORM NAME</th>';
    html += '<th class="col-sm-3 text-center">USER INPUT</th>';
    html += '<th class="col-sm-1 text-center">STEP DURATION</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody>';
    html += '<tr>';
    html += '<td class="flow text-left">' + flowHistory[0] + '</td>';
    html += '<td class="step text-left">' + stepHistory[0] + '</td>';
    html += '<td class="type text-left">' + stepTypeHistory[0] + '</td>';
    html += '<td class="formname text-left">' + formNameHistory[0] + '</td>';
    try {
        var Output = outputHistory[0];
        var outputhtml = '<table class="table-bordered">';
        outputhtml += '<tr>';
        Object.keys(Output).forEach(function (key) { 
            outputhtml += '<td style="padding: 3px;">' + key + '</td>';
            outputhtml += '<td style="padding: 3px;">' + Output[key] + '</td>';
        });
        outputhtml += '</tr>';
        outputhtml += '</table>';
    }
    catch(err) {
        outputhtml = '';
    }
    html += '<td class="output text-left">' + outputhtml + '</td>';
    var lastFlowName = flowHistory[0];
    for (var i = 1; i < flowHistory.length; i++) {
        var stepDuration = stepTime[i] - stepTime[i-1];
        var stepDurationHours = Math.floor(stepDuration / 3600);
        stepDuration = stepDuration - stepDurationHours * 3600;
        var stepDurationMinutes = Math.floor(stepDuration / 60);
        stepDuration = stepDuration - stepDurationMinutes * 60;
        var stepDurationSeconds = stepDuration        
        stepDurationHours = ('00' + stepDurationHours).slice(-2) + ':';
        stepDurationMinutes = ('00' + stepDurationMinutes).slice(-2) + ':';
        stepDurationSeconds = ('00' + stepDurationSeconds).slice(-2);
        var stepDurationString = stepDurationHours + stepDurationMinutes + stepDurationSeconds;
        var flowName = flowHistory[i];
        var stepName = stepHistory[i];
        var stepType = stepTypeHistory[i];
        var formName = formNameHistory[i];
        try {
            var Output = outputHistory[i];
            var outputhtml = '<table class="table-bordered">';

            Object.keys(Output).forEach(function (key) { 
                outputhtml += '<tr>';                            
                outputhtml += '<td style="padding: 3px;">' + key + '</td>';
                outputhtml += '<td style="padding: 3px;">' + Output[key] + '</td>';
                outputhtml += '</tr>';                
            });
            outputhtml += '</table>';
        }
        catch (err) {
            outputhtml = '';
        }
        if (flowName == lastFlowName) {
            html += '<td class="duration text-right">' + stepDurationString + '</td>';
            html += '</tr>';
            html += '<tr><td class="flow text-left">&nbsp;</td>';
            html += '<td class="step text-left">' + stepName + '</td>';
            html += '<td class="type text-left">' + stepType + '</td>';
            html += '<td class="formname text-left">' + formName + '</td>';
            html += '<td class="output text-left">' + outputhtml + '</td>';
            lastFlowName = flowName;
        } else {
            html += '<td class="duration text-right">' + stepDurationString + '</td>';
            html += '</tr>';
            html += '<tr><td class="flow text-left">' + flowName + '</td>';
            html += '<td class="step text-left">' + stepName + '</td>';
            html += '<td class="type text-left">' + stepType + '</td>';
            html += '<td class="formname text-left">' + formName + '</td>';
            html += '<td class="output text-left">' + outputhtml + '</td>';            
            lastFlowName = flowName;
        }
    }
    html += '<td class="duration text-right">&nbsp</td></tr>';
    html += '</tbody>';
    html += '</table>';
    $('div#flowHistory').html(html);
    $('table#flowHistoryTable > tbody > tr:odd').removeClass('stripe');
    $('table#flowHistoryTable > tbody > tr:even').addClass('stripe');
    window.lastFlowName = flowName;
};

