var windowManager = new Object();

$(document).ready(function () {
    var hostname = window.location.hostname.split('.')[0];
    // Set the location of the Node.JS server
    var serverAddress = 'http://10.100.49.104';
    switch (hostname) {
    case 'fde':
        var socketURL = serverAddress + ':5510';
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
        var vars = getURLVars();
        var env = vars.env;
        switch (env) {
        case 'fde':
            var socketURL = serverAddress + ':5510';
            var version = 'FDE (FLOW DEVELOPMENT ENVIRONMENT)';
            break;
        case 'dev':
            var socketURL = serverAddress + ':5510';
            var version = 'FDE (FLOW DEVELOPMENT ENVIRONMENT)';
            break;
        case 'beta':
            var socketURL = serverAddress + ':5520';
            version = 'BETA (PRE-PROD)';
            break;
        case 'pre-prod':
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
    }

    document.title = 'SAMS - ' + version + ' SASHA ACTIVE MONITORING SYSTEM';

    // Set the Version Type
    $('span#version').html(version);

    // Initialize variables
    window.socket = io.connect(socketURL)

    // If you close this window, then use the window manager to locate and close any detail windows opened by this window
    $(window).on('unload', function () {
        $.each(windowManager, function (key) {
            windowManager[key].close();
            delete windowManager[key];
        });
    });

    socket.on('connect', function () {
        showMainScreen();
        socket.emit('Request Current Connection Data', {
            ActiveTab: 'none'
        });
    });

    socket.on('disconnect', function () {
        $('div.initializationScreen').html('CONNECTION LOST. ATTEMTPING RECONNECT...').show();
        $('div.mainScreen').hide();
        // store currently active tab
        var active = $('li.active').attr('tabId');
        // Remove any countdown timers
        $('.is-countdown').countdown('destroy');
        // Empty information
        $('ul#Tabs').empty();
        $('div#Contents').empty();
        // Close any detail windows and remove them from window manager
        $.each(windowManager, function (key) {
            windowManager[key].close();
            delete windowManager[key];
        });
        // Add the custom Tabs back
        socket.emit('Request Current Connection Data', {
            ActiveTab: active
        });
        addCustomTabs();
    });
	
    socket.on('Request Connection Type', function(data) {
        var ServerStartTime = data.ServerStartTime;
        ServerStartTime = toLocalDateTime(ServerStartTime);
        $('span#serverStartTime').html(ServerStartTime);
        socket.emit('Register Monitor User');
    });

    // Add a SASHA User Row to Monitor for a Connecting Client
    socket.on('Add SASHA Connection to Monitor', function(data) {
        var UserInfo = data.UserInfo;
        var connectionId = UserInfo.ConnectionId;
        var attUID = UserInfo.AttUID;
        var reverseName = UserInfo.ReverseName;
        var sessionStartTime = UserInfo.ConnectTime;
        var sessionStartTimestamp = new Date(sessionStartTime);
        sessionStartTime = toLocalTime(sessionStartTime);
        // If there is no row matching the row your about to add, then go ahead and add it
        if (!$('table.INACTIVESESSIONS tbody tr[connectionId="' + connectionId + '"]').length) {
            if (vars.env) {
                var href= '../screenshots/index.html?env=' + vars.env + '&id=' + UserInfo.SmpSessionId + '&connection=' + UserInfo.ConnectionId;
			} else {
				href = '../screenshots/index.html?id=' + UserInfo.SmpSessionId + '&connection=' + UserInfo.ConnectionId;
			}
            var row = '<tr connectionId="' + connectionId + '">'
                + '<td class="text-centers"><a href="' + href + '" target="_blank">' + attUID + '</a></td>'
                + '<td class="text-left">' + reverseName + '</td>'
                + '<td class="text-center">' + sessionStartTime + '</td>'
                + '<td class="text-right"><div InactiveSessionDurationId="sessionDuration_' + connectionId + '"></div></td>'
                + '</tr>';
            $('table.INACTIVESESSIONS tbody:last').append(row);
            $('table.INACTIVESESSIONS').trigger('update');

            $('[name="INACTIVESESSIONS].groupOption').off('change.groupOption').on('change.groupOption', function () {
                var value = $(this).val();
                name = $(this).attr('name');
                if (value == 'none') {
                    $('table.' + name).trigger('removeWidget', 'group');
                }
                if (value == 'agentname') {
                    $('table.' + name).trigger('removeWidget', 'group');
                    $('table.' + name).data('tablesorter').widgets = ['group'];
                    $('table.' + name).data('tablesorter').widgetOptions.group_forceColumn = [1];
                    $('table.' + name).data('tablesorter').widgetOptions.group_enforceSort = false;
                    $('table.' + name).trigger('applyWidgets');
                }
                if (value == 'skillgroup') {
                    $('table.' + name).trigger('removeWidget', 'group');
                    $('table.' + name).data('tablesorter').widgets = ['group'];
                    $('table.' + name).data('tablesorter').widgetOptions.group_forceColumn = [6];
                    $('table.' + name).data('tablesorter').widgetOptions.group_enforceSort = false;
                    $('table.' + name).trigger('applyWidgets');
                }
            });

            // Initialize Counters for the connection just added
            $('div[InactiveSessionDurationId="sessionDuration_' + connectionId + '"]').countdown({
                since: sessionStartTimestamp,
                compact: true,
                layout: '{d<} {dn} {d1} {d>} {h<} {hnn} {sep} {h>} {mnn} {sep} {snn}',
                format: 'yowdhMS'
            });
            // Request the table to resort
            $('table.INACTIVESESSIONS').trigger('update');

            // Update Count(s) of users on table(s)
            var userCount = $('table.INACTIVESESSIONS tbody tr').not('.group-header').length;
            $('a[skillGroup="INACTIVESESSIONS"] span').html(userCount);
        }

        // Update on doubleclick events to launch detail window
        $('table tbody tr').not('.group-header').off('dblclick').on('dblclick', function () {
            // if ($(this).closest('table').hasClass('INACTIVESESSIONS')) {
            //      return;
            //  }
            var id = $(this).attr('connectionId');
            var winName = 'window_' + id;
            if (typeof windowManager[winName] != 'undefined') {
                var win = windowManager[winName];
                win.close();
            }
            vars = getURLVars();
            if (vars.env) {
                windowManager[winName] = window.open('../popup/index.html?env=' + vars.env + '&id=' + id, winName);
            } else {
                windowManager[winName] = window.open('../popup/index.html?id=' + id, winName);
            }
        });
    });


    // Add a SASHA User Row to Monitor for a Connecting Client
    socket.on('Notify Monitor Begin SASHA Flow', function(data) {
        var UserInfo = data.UserInfo;
        var connectionId = UserInfo.ConnectionId;
        // Remove timer associated with connection before removing row to prevent a javascript error
        $('div[inactivesessionDurationId="sessionDuration_' + connectionId + '"]').countdown('destroy');
        $('table.INACTIVESESSIONS tbody tr[connectionId="' + connectionId + '"]').remove();
        // force the groupable pages to refresh since their categories may now be empty
        $('table.INACTIVESESSIONS').trigger('update');
        // Update Count(s) of users on table(s)
        var userCount = $('table.INACTIVESESSIONS tbody tr').not('.group-header').length;
        $('a[skillGroup="INACTIVESESSIONS"] span').html(userCount);
        var attUID = UserInfo.AttUID;
        var reverseName = UserInfo.ReverseName;
        var skillGroup = UserInfo.SkillGroup;
        var taskType = UserInfo.TaskType;
        var workType = UserInfo.SAMSWorkType;
        var sessionStartTime = UserInfo.SessionStartTime;
        var flowName = UserInfo.FlowName;
        var stepName = UserInfo.StepName;
        var stepStartTime = UserInfo.StepStartTime;
        // If skillGroup is not set, then set it as UNKNOWN
        if (skillGroup === null || skillGroup === 'null' || skillGroup === '' || skillGroup == 'undefined') {
            skillGroup = 'UNKNOWN';
        }
        // If there is no tab for the skillGroup your about to work with, then add it
        if (!$('ul#Tabs li[tabId="' + skillGroup + '"]').length) {
            var row = '<li tabId="' + skillGroup + '">' +
                '<a class="nav-link" data-toggle="tab" skillGroup="' + skillGroup + '" href="#' + skillGroup + '">' + skillGroup + ' (<span>0</span>)</a>' +
                '</li>';
            $('ul#Tabs').append(row);
            row = '<div id="' + skillGroup + '" class="tab-pane">' +
                '<div class="buttonrow">' +
                '<span class="buttons">' +
                'GROUP BY: ' +
                '<input type="radio" name="' + skillGroup + '" class="groupOption" value="none" checked="checked">NONE' +
                '<input type="radio" name="' + skillGroup + '" class="groupOption" value="agentname">AGENT NAME' +
                '</span>' + 
                '</div> ' +
                '<table class="table table-bordered center hover-highlight serviceline ' + skillGroup + '" >' +
                '<thead>' +
                '<tr>' +
                '<th class="col-sm-1 text-center attUID">ATT UID</th>' +
                '<th class="col-sm-2 text-center agentName group-text">AGENT NAME</th>' +
                '<th class="col-sm-1 text-center workType group-text">WORK SOURCE</th>' +
                '<th class="col-sm-1 text-center workType group-text">TASK TYPE</th>' +				
                '<th class="col-sm-1 text-center sessionDuration sorter-false">WORKFLOW<br />SESSION DURATION</th>' +
                '<th class="col-sm-1 text-center stepDuration sorter-false">STEP<br />DURATION</th>' +
                '<th class="col-sm-2 text-center flowName sorter-false">FLOW NAME</th>' +
                '<th class="col-sm-3 text-center stepName sorter-false">STEP NAME</th>' +
                '</tr>' +
                '</thead>' +
                '<tbody >' +
                '</tbody>' +
                '</table>' +
                '</div>';
            $('div#Contents').append(row);
            // Sort Tabs in Alphabetical order
            sortTabs('ul#Tabs');
            //  Make the added table sortable
            $('table.' + skillGroup).tablesorter({
                theme: 'custom',
                sortList: [[5,1]],
                sortReset: true,
                widgets: ['zebra']
            });
            // Create event or changing the group option button
            $('.groupOption').off('change.groupOption').on('change.groupOption', function () {
                var value = $(this).val();
                name = $(this).attr('name');
                if (value == 'none') {
                    $('table.' + name).trigger('removeWidget', 'group');
                }
                if (value == 'agentname') {
                    $('table.' + name).trigger('removeWidget', 'group');
                    $('table.' + name).data('tablesorter').widgets = ['group'];
                    $('table.' + name).data('tablesorter').widgetOptions.group_forceColumn = [1];
                    $('table.' + name).data('tablesorter').widgetOptions.group_saveGroups = false;
                    $('table.' + name).data('tablesorter').widgetOptions.group_enforceSort = false;
                    $('table.' + name).trigger('applyWidgets');
                }
                if (value == 'skillgroup') {
                    $('table.' + name).trigger('removeWidget', 'group');
                    $('table.' + name).data('tablesorter').widgets = ['group'];
                    $('table.' + name).data('tablesorter').widgetOptions.group_forceColumn = [6];
                    $('table.' + name).data('tablesorter').widgetOptions.group_saveGroups = false;
                    $('table.' + name).data('tablesorter').widgetOptions.group_enforceSort = false;
                    $('table.' + name).trigger('applyWidgets');
                }
            });
            // Resort the table anytime its tab is clicked
            $('a[data-toggle="tab"]').off('shown.bs.tab.resort').on('shown.tab.bs.resort', function(e) { 
                var target = $(e.target).attr('skillGroup');
                $('table.' + target).trigger('update');
            });
        }

        // If there is no row matching the row your about to add, then go ahead and add it
        if (!$('table.' + skillGroup + ' tbody tr[connectionId="' + connectionId + '"]').length) {
            var sessionStartTimestamp = new Date(sessionStartTime);
            sessionStartTime = toLocalTime(sessionStartTime);
            var stepStartTimestamp = new Date(stepStartTime);
            stepStartTime = toLocalTime(stepStartTime);
            if (vars.env) {
                var href= '../screenshots/index.html?env=' + vars.env + '&id=' + UserInfo.SmpSessionId  + '&connection=' + UserInfo.ConnectionId;
			} else {
				href = '../screenshots/index.html?id=' + UserInfo.SmpSessionId  + '&connection=' + UserInfo.ConnectionId;
			}
            row = '<tr connectionId="' + connectionId + '">'
                + '<td class="text-centers"><a href="' + href + '" target="_blank">' + attUID + '</a></td>'
                + '<td class="text-left">' + reverseName + '</td>'
                + '<td class="text-left">' + workType + '</td>'
                + '<td class="text-center">' + taskType + '</td>'								
                + '<td class="text-right" title="Session Started ' + sessionStartTime + '"><div sessionDurationId="sessionDuration_' + connectionId + '" title="Session Started ' + sessionStartTime + '"></div></td>'
                + '<td class="text-right" stepStartTitle="stepStartTitle_' + connectionId + '" title="Step Started ' + stepStartTime + '"><div stepDurationId="stepDuration_' + connectionId + '" title="Step Started ' + stepStartTime + '"></div></td>'
                + '<td class="text-left" flowNameId="flowName_' + connectionId + '">' + flowName + '</td>'
                + '<td class="text-left" stepNameId="stepName_' + connectionId + '"><span class="stepInfo">' + stepName + '</span></td>'
                + '</tr>';
            $('table.' + skillGroup + ' tbody:last').append(row);
            $('table.' + skillGroup).trigger('update');

            // Also add to All Sessions tab.  New row defined here as that includes SkillGroup
            if (vars.env) {
                var href= '../screenshots/index.html?env=' + vars.env + '&id=' + UserInfo.SmpSessionId  + '&connection=' + UserInfo.ConnectionId;
			} else {
				href = '../screenshots/index.html?id=' + UserInfo.SmpSessionId  + '&connection=' + UserInfo.ConnectionId;
			}
            row = '<tr connectionId="' + connectionId + '">'
                + '<td class="text-centers"><a href="' + href + '" target="_blank">' + attUID + '</a></td>'
                + '<td class="text-left">' + reverseName + '</td>'
                + '<td class="text-center">' + workType + '</td>'				
                + '<td class="text-center">' + taskType + '</td>'												
                + '<td class="text-left">' + skillGroup + '</td>'				
                + '<td class="text-right" title="Session Started ' + sessionStartTime + '"><div sessionDurationId="sessionDuration_' + connectionId + '" title="Session Started ' + sessionStartTime + '"></div></td>'
                + '<td class="text-right" stepStartTitle="stepStartTitle_' + connectionId + '" title="Step Started ' + stepStartTime + '"><div stepDurationId="stepDuration_' + connectionId + '" title="Step Started ' + stepStartTime + '"></div></td>'
                + '<td class="text-left" flowNameId="flowName_' + connectionId + '">' + flowName + '</td>'
                + '<td class="text-left" stepNameId="stepName_' + connectionId + '"><span class="stepInfo">' + stepName + '</span></td>'
                + '</tr>';
            $('table.ALLSESSIONS tbody:last').append(row);
            $('table.ALLSESSIONS').trigger('update');

            $('[name="ALLSESSIONS].groupOption').off('change.groupOption').on('change.groupOption', function () {
                var value = $(this).val();
                name = $(this).attr('name');
                if (value == 'none') {
                    $('table.' + name).trigger('removeWidget', 'group');
                }
                if (value == 'agentname') {
                    $('table.' + name).trigger('removeWidget', 'group');
                    $('table.' + name).data('tablesorter').widgets = ['group'];
                    $('table.' + name).data('tablesorter').widgetOptions.group_forceColumn = [1];
                    $('table.' + name).data('tablesorter').widgetOptions.group_enforceSort = false;
                    $('table.' + name).trigger('applyWidgets');
                }
                if (value == 'skillgroup') {
                    $('table.' + name).trigger('removeWidget', 'group');
                    $('table.' + name).data('tablesorter').widgets = ['group'];
                    $('table.' + name).data('tablesorter').widgetOptions.group_forceColumn = [6];
                    $('table.' + name).data('tablesorter').widgetOptions.group_enforceSort = false;
                    $('table.' + name).trigger('applyWidgets');
                }
            });

            // Initialize Counters for the connection just added
            $('div[sessionDurationId="sessionDuration_' + connectionId + '"]').countdown({
                since: sessionStartTimestamp,
                compact: true,
                layout: '{d<} {dn} {d1} {d>} {h<} {hnn} {sep} {h>} {mnn} {sep} {snn}',
                format: 'yowdhMS',
                onTick: checkStalledSessions,
                tickInterval: 1
            });
            $('div[stepDurationId="stepDuration_' + connectionId + '"]').countdown({
                since: stepStartTimestamp,
                compact: true,
                layout: '{d<} {dn} {d1} {d>} {h<} {hnn} {sep} {h>} {mnn} {sep} {snn}',
                format: 'yowdhMS',
                onTick: checkTimerStyling,
                tickInterval: 1
            });
            // Request the tables to resort
            $('table.' + skillGroup).trigger('update');
            $('table.ALLSESSIONS').trigger('update');

            // Update Count(s) of users on table(s)
            var userCount = $('table.' + skillGroup + ' tbody tr').not('.group-header').length;
            $('a[skillGroup="' + skillGroup + '"] span').html(userCount);
            userCount = $('table.ALLSESSIONS tbody tr').not('.group-header').length;
            $('a[skillGroup="ALLSESSIONS"] span').html(userCount);
        }

        // Update on doubleclick events to launch detail window
        $('table tbody tr').not('.group-header').off('dblclick').on('dblclick', function () {
            var id = $(this).attr('connectionId');
            var winName = 'window_' + id;
            if (typeof windowManager[winName] != 'undefined') {
                var win = windowManager[winName];
                win.close();
            }
            vars = getURLVars();
            if (vars.env) {
                windowManager[winName] = window.open('../popup/index.html?env=' + vars.env + '&id=' + id, winName);
            } else {
                windowManager[winName] = window.open('../popup/index.html?id=' + id, winName);
            }
        });
    });


    // Remove a SASHA User Row for a disconnected SASHA User from Monitor
    socket.on('Remove SASHA Connection from Monitor', function(data) {
        var connectionId = data.ConnectionId;
        var UserInfo = data.UserInfo;
        var skillGroup = UserInfo.SkillGroup;
        // Remove timer(s) associated with connection before removing row to prevent a javascript error
        $('div[inactivesessionDurationId="sessionDuration_' + connectionId + '"]').countdown('destroy');
        $('div[sessionDurationId="sessionDuration_' + connectionId + '"]').countdown('destroy');
        $('div[stepDurationId="stepDuration_' + connectionId + '"]').countdown('destroy');		
        $('tr[connectionId="' + connectionId + '"]').remove();
        // force the groupable pages to refresh since their categories may now be empty
        $('table.INACTIVESESSIONS').trigger('update');
        $('table.STALLEDSESSIONS').trigger('update');
        $('table.ALLSESSIONS').trigger('update');
        // Update Count(s) of users on table(s)
        var userCount = $('table.' + skillGroup + ' tbody tr').not('.group-header').length;
        $('a[skillGroup="' + skillGroup + '"] span').html(userCount);
        userCount = $('table.INACTIVESESSIONS tbody tr').not('.group-header').length;
        $('a[skillGroup="INACTIVESESSIONS"] span').html(userCount);
        userCount = $('table.ALLSESSIONS tbody tr').not('.group-header').length;
        $('a[skillGroup="ALLSESSIONS"] span').html(userCount);
        userCount = $('table.STALLEDSESSIONS tbody tr').not('.group-header').length;
        $('a[skillGroup="STALLEDSESSIONS"] span').html(userCount);
        // Close any detail windows associated to connection
        var winName = 'window_' + connectionId;
        if (typeof windowManager[winName] === 'object') {
            if (windowManager[winName].$('input#autoclose').is(':checked')) {
                windowManager[winName].close();
            } else {
                socket.emit('Notify Server Session Closed', {
                    ConnectionId: connectionId
                });
            }
            delete windowManager[winName];
        }
    });

    socket.on('Update Flow and Step Info', function(data) {
        var connectionId = data.ConnectionId;
        var UserInfo = data.UserInfo;
        var flowName = UserInfo.FlowName;
        var stepName = UserInfo.StepName;
        var stepStartTime = UserInfo.StepStartTime;
        var stepStartTimestamp = new Date(stepStartTime);
        var stepStartTime = toLocalTime(stepStartTime);
        // first remove any countdown to avoid javascript errors
        $('div[stepDurationId="stepDuration_' + connectionId + '"]').removeClass('warnWaitScreenDuration');
        $('div[stepDurationId="stepDuration_' + connectionId + '"]').countdown('destroy');
        $('td[flowNameId="flowName_' + connectionId + '"]').html(flowName);
        $('td[stepNameId="stepName_' + connectionId + '"]').html('<span class="stepInfo">' + stepName + '</span>');
        $('[stepStartTitle="stepStartTitle_' + connectionId + '"]').prop('title', 'Step Started ' + stepStartTime);
        $('div[stepDurationId="stepDuration_' + connectionId + '"]').prop('title', 'Step Started ' + stepStartTime);
        // restart countdown
        $('div[stepDurationId="stepDuration_' + connectionId + '"]').removeClass('warnWaitScreenDuration');
        $('div[stepDurationId="stepDuration_' + connectionId + '"]').countdown({
            since: stepStartTimestamp,
            compact: true,
            layout: '{d<} {dn} {d1} {d>} {h<} {hnn} {sep} {h>} {mnn} {sep} {snn}',
            format: 'yowdhMS',
            onTick: checkTimerStyling,
            tickInterval: 1
        });
    });

    // Restore the Active Tab
    socket.on('Reset Active Tab', function(data) {
        var activeTab = data.ActiveTab;
        $('a[skillGroup="' + activeTab + '"]').click();
        $('table.' + activeTab).trigger('update');
    });


    // Stalled Session detected, add an entry under STALLEDSESSIONS
    socket.on('Alert Monitor of Stalled Session', function(data) {
        // If it isn't already in stalled sessions then add it
        var UserInfo = data.UserInfo;
        var connectionId = UserInfo.ConnectionId;
        if (!$('table.STALLEDSESSIONS tbody tr[connectionId="' + connectionId + '"]').length) {
            var attUID = UserInfo.AttUID;
            var reverseName = UserInfo.ReverseName;
            var skillGroup = UserInfo.SkillGroup;
            var workType = UserInfo.SAMSWorkType;
            var taskType = UserInfo.TaskType;
            var sessionStartTime = UserInfo.SessionStartTime;
            var flowName = UserInfo.FlowName;
            var stepName = UserInfo.StepName;
            var stepStartTime = UserInfo.StepStartTime;
            var sessionStartTimestamp = new Date(sessionStartTime);
            sessionStartTime = toLocalTime(sessionStartTime);
            var stepStartTimestamp = new Date(stepStartTime);
            stepStartTime = toLocalTime(stepStartTime);
            // If skill group was not set, set it to UNKNOWN
            if (skillGroup === null || skillGroup === 'null' || skillGroup === '') {
                skillGroup = 'UNKNOWN';
            }
            if (vars.env) {
                var href= '../screenshots/index.html?env=' + vars.env + '&id=' + UserInfo.SmpSessionId + '&connection=' + UserInfo.ConnectionId;
			} else {
				href = '../screenshots/index.html?id=' + UserInfo.SmpSessionId  + '&connection=' + UserInfo.ConnectionId;
			}
            var row = '<tr connectionId="' + connectionId + '">'
                + '<td class="text-centers"><a href="' + href + '" target="_blank">' + attUID + '</a></td>'
                + '<td class="text-left">' + reverseName + '</td>'
                + '<td class="text-left">' + workType + '</td>'				
                + '<td class="text-left">' + taskType + '</td>'
                + '<td class="text-center">' + skillGroup + '</td>'				
                + '<td class="text-right" title="Session Started ' + sessionStartTime + '"><div sessionDurationId="sessionDuration_' + connectionId + '" title="Session Started ' + sessionStartTime + '"></div></td>'
                + '<td class="text-right" title="Step Started ' + stepStartTime + '"><div stepDurationId="stepDuration_' + connectionId + '" title="Step Started ' + stepStartTime + '"></div></td>'
                + '<td class="text-left" flowNameId="flowName_' + connectionId + '">' + flowName + '</td>'
                + '<td class="text-left" stepNameId="stepName_' + connectionId + '"><span class="stepInfo">' + stepName + '</span></td>'
                + '</tr>';
            $('table.STALLEDSESSIONS tbody:last').append(row);
            // initialize Countdown
            $('div[sessionDurationId="sessionDuration_' + connectionId + '"]').countdown({
                since: sessionStartTimestamp,
                compact: true,
                layout: '{d<} {dn} {d1} {d>} {h<} {hnn} {sep} {h>} {mnn} {sep} {snn}',
                format: 'yowdhMS',
                onTick: checkTimerStyling,
                tickInterval: 1
            });
            $('div[stepDurationId="stepDuration_' + connectionId + '"]').countdown({
                since: stepStartTimestamp,
                compact: true,
                layout: '{d<} {dn} {d1} {d>} {h<} {hnn} {sep} {h>} {mnn} {sep} {snn}',
                format: 'yowdhMS',
                onTick: checkTimerStyling,
                tickInterval: 1
            });
            // update user count
            var userCount = $('table.STALLEDSESSIONS tbody tr').not('.group-header').length;
            $('a[skillGroup="STALLEDSESSIONS"] span').html(userCount);

            // Create event for changing the group option button
            $('[name="STALLEDSESSIONS].groupOption').off('change.groupOption').on('change.groupOption', function () {
                var value = $(this).val();
                name = $(this).attr('name');
                if (value == 'none') {
                    $('table.' + name).trigger('removeWidget', 'group');
                }
                if (value == 'agentname') {
                    $('table.' + name).trigger('removeWidget', 'group');
                    $('table.' + name).data('tablesorter').widgets = ['group'];
                    $('table.' + name).data('tablesorter').widgetOptions.group_forceColumn = [1];
                    $('table.' + name).data('tablesorter').widgetOptions.group_enforceSort = false;
                    $('table.' + name).trigger('applyWidgets');
                }
                if (value == 'skillgroup') {
                    $('table.' + name).trigger('removeWidget', 'group');
                    $('table.' + name).data('tablesorter').widgets = ['group'];
                    $('table.' + name).data('tablesorter').widgetOptions.group_forceColumn = [6];
                    $('table.' + name).data('tablesorter').widgetOptions.group_enforceSort = false;
                    $('table.' + name).trigger('applyWidgets');
                }
            });

            // Trigger table to sort
            $('table.STALLEDSESSIONS').trigger('update');
        }
    });


    // Clear all tables and reload
    $('button#RefreshSASHAConnections').off('click').on('click', function () {
        // store currently active tab
        var active = $('li.active').attr('tabId');
        // Remove any countdown timers
        $('.is-countdown').countdown('destroy');
        // Empty information
        $('ul#Tabs').empty();
        $('div#Contents').empty();
        // Close any detail windows and remove them from window manager
        $.each(windowManager, function (key) {
            windowManager[key].close();
            delete windowManager[key];
        });
        // Add the custom Tabs back
        socket.emit('Request Current Connection Data', {
            ActiveTab: active
        });
        addCustomTabs();
    });

    // Add custom Tabs
    addCustomTabs();
});

// Convert Time to Local Time as HH:MM:SS
let toLocalTime = function (timestamp) {
    if (timestamp !== null) {
        timestamp = new Date(timestamp);
        var hours = '0' + timestamp.getHours();
        var hours = hours.slice(-2);
        var minutes = '0' + timestamp.getMinutes();
        minutes = minutes.slice(-2);
        var seconds = '0' + timestamp.getSeconds();
        seconds = seconds.slice(-2);
        return hours + ':' + minutes + ':' + seconds;
    }
};

// Convert Time to DateTime as MM/DD/YY @ HH:MM:SS
let toLocalDateTime = function (timestamp) {
    if (timestamp !== null) {
        timestamp = new Date(timestamp);
        var month = timestamp.getMonth()+1;
        var date = timestamp.getDate();
        var year = timestamp.getFullYear();
        var hours = '0' + timestamp.getHours();
        hours = hours.slice(-2);
        var minutes = '0' + timestamp.getMinutes();
        minutes = minutes.slice(-2);
        var seconds = '0' + timestamp.getSeconds();
        seconds = seconds.slice(-2);
        return month + '/' + date + '/' + year + ' @ ' + hours + ':' + minutes + ':' + seconds;
    }
};


// Hide the initialization screen and show the main screen
let showMainScreen = function () {
    $('div.initializationScreen').hide();
    $('div.mainScreen').show();
    // Update Server Start Time
};

// Sort Tabs
let sortTabs = function (element) {
    var myList = $(element);
    var listItems = myList.children('li').get();
    listItems.sort(function (a, b) {
        var compA = $(a).text().toUpperCase();
        var compB = $(b).text().toUpperCase();
        return compA < compB ? -1 : compA > compB ? 1 : 0;
    });
    myList.empty();
    $.each(listItems, function (idx, itm) {
        myList.append(itm);
    });
};

// Checks if SESSION is showing as over threshold for being stalled and adds it to the stalled sessions if so
let checkStalledSessions = function (periods) {
    if ($.countdown.periodsToSeconds(periods) > 1200) {
        $(this).addClass('highlightDuration');
        var connectionId = $(this).closest('tr').attr('connectionId');
        if (!$('table.STALLEDSESSIONS tbody tr[connectionId="' + connectionId + '"]').length) {
            socket.emit('Alert Server of Stalled Session', {
                ConnectionId: connectionId
            });
        }
    }
};

// Add Styling on Timer if over threshold
let checkTimerStyling = function (periods) {
    if ($.countdown.periodsToSeconds(periods) > 30) {
        var stepInfo = $(this).parent().parent().find('span.stepInfo');
        if (stepInfo.html() == 'SO WAIT') {
            $(this).addClass('warnWaitScreenDuration');
            return;
        } else {
            $(this).removeClass('warnWaitScreenDuration');
        }
    }
    if ($.countdown.periodsToSeconds(periods) > 300) {
        $(this).addClass('highlightDuration');
    } else {
        $(this).removeClass('highlightDuration');
    }
}


// Add INACTIVESESSION, STALLEDSESSIONS and ALLSESSIONS tabs
let addCustomTabs = function () {
    // Start by adding All Sessions Tab
    var row = '<li class="pull-right" tabId="ALLSESSIONS">' +
        '<a class="nav-link" data-toggle="tab" skillGroup="ALLSESSIONS" href="#ALLSESSIONS">IN PROCESS (<span>0</span>)</a>' +
        '</li>';
    $('ul#Tabs').append(row);
    row = '<div id="ALLSESSIONS" class="tab-pane">' +
        '<div class="buttonrow">' +
        '<span class="buttons">' +
        'GROUP BY: ' +
        '<input type="radio" name="ALLSESSIONS" class="groupOption" value="none" checked="checked">NONE' +
        '<input type="radio" name="ALLSESSIONS" class="groupOption" value="agentname">AGENT NAME' +
        '<input type="radio" name="ALLSESSIONS" class="groupOption" value="skillgroup">SKILL GROUP' +
        '</span>' + 
        '</div> ' +
        '<table class="table table-bordered center groupable hover-highlight ALLSESSIONS">' +
        '<thead>' +
        '<tr>' +
        '<th class="col-sm-1 text-center attUID group-letter">ATT UID</th>' +
        '<th class="col-sm-2 text-center agentName group-text">AGENT NAME</th>' +
        '<th class="col-sm-1 text-center workType group-text">WORK SOURCE</th>' +
        '<th class="col-sm-1 text-center taskType group-text">TASK TYPE</th>' +
        '<th class="col-sm-1 text-center skillGroup group-word">BUSINESS UNIT</th>' +		
        '<th class="col-sm-1 text-center sessionDuration sorter-false">WORKFLOW<br />SESSION DURATION</th>' +
        '<th class="col-sm-1 text-center stepDuration sorter-false">STEP<br />DURATION</th>' +
        '<th class="col-sm-2 text-center flowName sorter-false">FLOW NAME</th>' +
        '<th class="col-sm-2 text-center stepName sorter-false">STEP NAME</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody >' +
        '</tbody>' +
        '</table>' +
        '</div>';
    $('div#Contents').append(row);
    // Set ALLSessions as default tab
    $('.nav-tabs a[skillGroup="ALLSESSIONS"]').tab('show');
    $('table.ALLSESSIONS').trigger('update');
    // Make table sortable
    $('table.ALLSESSIONS').tablesorter({
        theme: 'custom',
        sortReset: true,
        sortList: [[5,1]],
        widgets: ['zebra'],
    });
    $('a[data-toggle="tab"]').off('shown.bs.tab.resort').on('shown.tab.bs.resort', function (e) {
        var target = $(e.target).attr('skillGroup');
        $('table.' + target).trigger('update');
    });
    // Add FLOW NOT STARTED Tab
    row = '<li class="pull-right" tabId="INACTIVESESSIONS">' +
        '<a class="nav-link" data-toggle="tab" skillGroup="INACTIVESESSIONS" href="#INACTIVESESSIONS">NOT STARTED (<span>0</span>)</a>' +
        '</li> ';
    $('ul#Tabs').append(row);
    row = '<div id="INACTIVESESSIONS" class="tab-pane">' +
        '<div class="buttonrow">' +
        '<span class="buttons">' + 
        'GROUP BY: ' +
        '<input type="radio" name="INACTIVESESSIONS" class="groupOption" value="none" checked="checked">NONE' +
        '<input type="radio" name="INACTIVESESSIONS" class="groupOption" value="agentname">AGENT NAME' +
        '</span>' +
        '</div> ' +
        '<table class="table table-bordered center groupable hover-highlight INACTIVESESSIONS">' +
        '<thead>' +
        '<tr>' +
        '<th class="col-sm-3 text-center attUID group-letter">ATT UID</th>' +
        '<th class="col-sm-3 text-center agentName group-text">AGENT NAME</th>' +
        '<th class="col-sm-3 text-center sessionStartTime">SASHA CONNECTION STARTED</th>' +
        '<th class="col-sm-3 text-center sessionDuration sorter-false">CONNECTION DURATION</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody >' +
        '</tbody>' +
        '</table>' +
        '</div>';
    $('div#Contents').append(row);
    // Create event or changing the group option button
    $('.groupOption').off('change.groupOption').on('change.groupOption', function () {
        var value = $(this).val();
        name = $(this).attr('name');
        if (value == 'none') {
            $('table.' + name).trigger('removeWidget', 'group');
        }
        if (value == 'agentname') {
            $('table.' + name).trigger('removeWidget', 'group');
            $('table.' + name).data('tablesorter').widgets = ['group'];
            $('table.' + name).data('tablesorter').widgetOptions.group_forceColumn = [1];
            $('table.' + name).data('tablesorter').widgetOptions.group_enforceSort = false;
            $('table.' + name).trigger('applyWidgets');
        }
        if (value == 'skillgroup') {
            $('table.' + name).trigger('removeWidget', 'group');
            $('table.' + name).data('tablesorter').widgets = ['group'];
            $('table.' + name).data('tablesorter').widgetOptions.group_forceColumn = [6];
            $('table.' + name).data('tablesorter').widgetOptions.group_enforceSort = false;
            $('table.' + name).trigger('applyWidgets');
        }
    });
    // Make Table Sortable
    $('table.INACTIVESESSIONS').tablesorter({
        theme: 'custom',
        sortList: [[5,1]],
        sortReset: true,
        widgets: ['zebra'],
    });
    // When tab is clicked, it should resort the table for it
    $('a[data-toggle="tab"]').off('shown.bs.tab.resort').on('shown.tab.bs.resort', function (e) {
        var target = $(e.target).attr('skillGroup');
        $('table.' + target).trigger('update');
    });
    // Add StalledSessions Tab
    row = '<li class="pull-right" tabId="STALLEDSESSIONS">' +
        '<a class="nav-link" data-toggle="tab" skillGroup="STALLEDSESSIONS" href="#STALLEDSESSIONS">STALLED SESSIONS (<span>0</span>)</a>' +
        '</li> ';
    $('ul#Tabs').append(row);
    row = '<div id="STALLEDSESSIONS" class="tab-pane">' +
        '<div class="buttonrow">' +
        '<span class="buttons">' + 
        'GROUP BY: ' +
        '<input type="radio" name="STALLEDSESSIONS" class="groupOption" value="none" checked="checked">NONE' +
        '<input type="radio" name="STALLEDSESSIONS" class="groupOption" value="agentname">AGENT NAME' +
        '<input type="radio" name="STALLEDSESSIONS" class="groupOption" value="skillgroup">SKILL GROUP' +
        '</span>' +
        '</div> ' +
        '<table class="table table-bordered center groupable hover-highlight STALLEDSESSIONS">' +
        '<thead>' +
        '<tr>' +
        '<th class="col-sm-1 text-center attUID group-letter">ATT<br />UID</th>' +
        '<th class="col-sm-2 text-center agentName group-text">AGENT NAME</th>' +
        '<th class="col-sm-1 text-center workType group-text">WORK SOURCE</th>' +
        '<th class="col-sm-1 text-center taskType group-text">TASK TYPE</th>' +
        '<th class="col-sm-1 text-center skillGroup group-word">BUSINESS UNIT</th>' +
        '<th class="col-sm-1 text-center sessionDuration sorter-false">WORKFLOW<br />SESSION DURATION</th>' +
        '<th class="col-sm-1 text-center stepDuration sorter-false">STEP<br />DURATION</th>' +

        '<th class="col-sm-2 text-center flowName sorter-false">FLOW NAME</th>' +
        '<th class="col-sm-2 text-center stepName sorter-false">STEP NAME</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody >' +
        '</tbody>' +
        '</table>' +
        '</div>';
    $('div#Contents').append(row);
    // Create event or changing the group option button
    $('.groupOption').off('change.groupOption').on('change.groupOption', function () {
        var value = $(this).val();
        name = $(this).attr('name');
        if (value == 'none') {
            $('table.' + name).trigger('removeWidget', 'group');
        }
        if (value == 'agentname') {
            $('table.' + name).trigger('removeWidget', 'group');
            $('table.' + name).data('tablesorter').widgets = ['group'];
            $('table.' + name).data('tablesorter').widgetOptions.group_forceColumn = [1];
            $('table.' + name).data('tablesorter').widgetOptions.group_enforceSort = false;
            $('table.' + name).trigger('applyWidgets');
        }
        if (value == 'skillgroup') {
            $('table.' + name).trigger('removeWidget', 'group');
            $('table.' + name).data('tablesorter').widgets = ['group'];
            $('table.' + name).data('tablesorter').widgetOptions.group_forceColumn = [6];
            $('table.' + name).data('tablesorter').widgetOptions.group_enforceSort = false;
            $('table.' + name).trigger('applyWidgets');
        }
    });
    // Make Table Sortable
    $('table.STALLEDSESSIONS').tablesorter({
        theme: 'custom',
        sortList: [[5,1]],
        sortReset: true,
        widgets: ['zebra'],
    });
    // When tab is clicked, it should resort the table for it
    $('a[data-toggle="tab"]').off('shown.bs.tab.resort').on('shown.tab.bs.resort', function (e) {
        var target = $(e.target).attr('skillGroup');
        $('table.' + target).trigger('update');
    });

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
