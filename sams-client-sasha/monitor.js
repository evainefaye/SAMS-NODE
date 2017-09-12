let StartSAMSConnection = function () {
	
    /* If DisableSAMS is Set, then don't do anything */
    if (window.DisableSAMS) {
        return;
    }
	
    if ('Notification' in window) {
        if (Notification.permission !== 'granted' && !window.askNotification) {
            SASHA.motive.getMultipleVariables([
                { name: 'IsItLiveSAMSRequestNotification', expression: 'environmentProperties["IsItLiveSAMSRequestNotification"]'}
            ], function (variables) {
                var IsItLiveSAMSRequestNotification = variables.IsItLiveSAMSRequestNotification;
                if (IsItLiveSAMSRequestNotification.toLowerCase() == 'yes') {
                    Notification.requestPermission();
                    window.askNotification = true;
                }
            });
        }
    }

    /* If Node contains an attribute of StartSAMSConnection then connect */
    if ($('[StartSAMSConnection]').length > 0) {
        /* io is defined as a function once this is loaded. */
        /* If this is enabled, you have already connected and can skip connection proces */
        if (typeof io != 'function') {
            SASHA.motive.getMultipleVariables([
                'userName','smpSessionId',
                { name: 'environment', expression: 'environmentProperties["SASHAEnvironment"]'},
                { name: 'IsItLiveNodeIntegration', expression: 'environmentProperties["IsItLiveNodeIntegration"]'},
                { name: 'IsItLiveSAMSNotification', expression: 'environmentProperties["IsItLiveSAMSNotification"]'},
                { name: 'NodeServerAddress', expression: 'environmentProperties["NodeServerAddress"]'},
                { name: 'wp_city', expression: 'testModules["M5_webPhoneDetails"]["properties"]["InvokeRuleResponse"]["InvokeRuleSyncResponse"]["returnData"]["webphone_details"]["city"]'},
                { name: 'wp_country', expression: 'testModules["M5_webPhoneDetails"]["properties"]["InvokeRuleResponse"]["InvokeRuleSyncResponse"]["returnData"]["webphone_details"]["country"]'},
                { name: 'wp_firstname', expression: 'testModules["M5_webPhoneDetails"]["properties"]["InvokeRuleResponse"]["InvokeRuleSyncResponse"]["returnData"]["webphone_details"]["firstName"]'},
                { name: 'wp_lastname', expression: 'testModules["M5_webPhoneDetails"]["properties"]["InvokeRuleResponse"]["InvokeRuleSyncResponse"]["returnData"]["webphone_details"]["lastName"]'},
                { name: 'wp_location', expression: 'testModules["M5_webPhoneDetails"]["properties"]["InvokeRuleResponse"]["InvokeRuleSyncResponse"]["returnData"]["webphone_details"]["location"]'},
                { name: 'wp_manager', expression: 'testModules["M5_webPhoneDetails"]["properties"]["InvokeRuleResponse"]["InvokeRuleSyncResponse"]["returnData"]["webphone_details"]["manager"]'},
                { name: 'wp_state', expression: 'testModules["M5_webPhoneDetails"]["properties"]["InvokeRuleResponse"]["InvokeRuleSyncResponse"]["returnData"]["webphone_details"]["state"]'},
                { name: 'wp_zip', expression: 'testModules["M5_webPhoneDetails"]["properties"]["InvokeRuleResponse"]["InvokeRuleSyncResponse"]["returnData"]["webphone_details"]["zip"]'},
            ], function (variables) {	
                var environment = variables.environment;
                var IsItLiveNodeIntegration = variables.IsItLiveNodeIntegration;
                var NodeServerAddress = variables.NodeServerAddress;
                var username = variables.userName;
                var city = variables.wp_city;
                var country = variables.wp_country;
                var firstname = variables.wp_firstname;
                var lastname = variables.wp_lastname;
                var locationCode = variables.wp_location;
                var manager = variables.wp_manager;
                var state = variables.wp_state;
                var zip = variables.wp_zip;
                var smpsessionid = variables.smpSessionId;
                if (IsItLiveNodeIntegration.toLowerCase() != 'yes') {
                    window.DisableSAMS = true;
                    return;
                }
                window.IsItLiveSAMSNotification = variables.IsItLiveSAMSNotification;				
                $.getScript('https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.3/socket.io.js', function() {
                    var socketURL;
                    switch (environment) {
                    case 'FDE':
                        socketURL = NodeServerAddress + ':5510'; /* FDE* */
                        break;
                    case 'Pre-Prod':
                        socketURL = NodeServerAddress + ':5520'; /* PRE-PROD (BETA) */ 
                        break;
                    case 'Prod - FF':
                        socketURL = NodeServerAddress + ':5530'; /* PRODUCTION */
                        break;
                    case 'Prod - KC':
                        socketURL = NodeServerAddress + ':5530'; /* PRODUCTION */
                        break;
                    default:
                        socketURL = NodeServerAddress + ':5510'; /* DEFAULT (FDE) */
                        break;
                    }
                    window.socket = io.connect(socketURL, {'max reconnection attempts' : '25'});
                    window.socket.on('Request Connection Type', function(data) {
                        var ConnectionId = data.ConnectionId;
                        var UserInfo = new Object();
                        UserInfo.ConnectionId = ConnectionId;
                        UserInfo.AttUID = username;	/* attUID */
                        UserInfo.FirstName = firstname;
                        UserInfo.LastName = lastname;
                        UserInfo.FullName = firstname + ' ' + lastname;
                        UserInfo.ReverseName = lastname + ', ' + firstname;
                        UserInfo.LocationCode = locationCode; /* locationCode */
                        UserInfo.City = city;
                        UserInfo.Country = country;
                        UserInfo.State = state;
                        UserInfo.Zip = zip;
                        UserInfo.Manager = manager;
                        UserInfo.SmpSessionId = smpsessionid;
                        UserInfo.FlowHistory = new Array();
                        UserInfo.StepHistory = new Array();
                        UserInfo.StepTypeHistory = new Array();
                        UserInfo.FormNameHistory = new Array();
                        UserInfo.OutputHistory = new Array();
                        UserInfo.StepTime = new Array();
                        UserInfo.UserStatus = 'Inactive';
                        /* Perform the following only once */
                        if (window.SAMSConnected) {
                            return false;
                        } else {
                            /* Begin Setup of One Time Listeners */
                            /* Begin Define Listener for Requesting ScreenShot from SASHA. */
                            window.socket.on('Request SASHA ScreenShot from SASHA', function () {
                                $.getScript('http://www.hawkbane.net/html2canvas.min.js', function () {
                                    var element = $('#content');
                                    var img;
                                    html2canvas(element).then(function(canvas) {
                                        try {
                                            img = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
                                        }
                                        catch(e)
                                        {
                                            img = canvas.toDataURL().split(',')[1];
                                        }
                                        var ImageURL = 'data:image/jpeg;base64,' + img;
                                        window.socket.emit('Send SASHA ScreenShot to Server', {
                                            ImageURL: ImageURL
                                        });
                                    });
                                });
                            });
                            // End Screenshot request Definition

                            // Begin Define Listener for Requesting Dictionary from SASHA.
                            window.socket.on('Request SASHA Dictionary from SASHA', function () {
                                var context = wf.getContext();
                                $.ajax({url: '/wf/Dictionary.do?context=' + context}).done(function(data) {
                                    var results = ($(data).find('ul#dict')).html();
                                    window.socket.emit('Send SASHA Dictionary to Server', {
                                        Dictionary: results
                                    });
                                });
                            });
                            // End Request SASHA Dictionary 

                            // Begin Request Skill Group Specific Dictionary Call Outs 
                            window.socket.on('Request SASHA Skill Group Info from SASHA', function(data) {
                                var requestValue = data.RequestValue;
                                SASHA.motive.getMultipleVariables(Object.keys(requestValue), function (variables) {
                                    var resultValue = new Object();
                                    $.each(requestValue, function (key, value) {
                                        resultValue[value] = variables[key];
                                    });
                                    window.socket.emit('Send SASHA Skill Group Info to Server', {
                                        ResultValue: resultValue
                                    });
                                });
                            });
                            // End Request Skill Group Dictionary Call Outs

                            // Handle Broadcast Message from Monitor Popup
                            window.socket.on('Send User Message to User', function(data) {
                                var ConnectionId = data.ConnectionId;
                                DisplayNotification('You have received a message', true, true, true, ConnectionId);				    
                                var BroadcastText = data.BroadcastText;
                                var Timestamp = new Date().toLocaleString();
                                $('<div title="' + Timestamp + '">' + BroadcastText + '</div>').dialog({
                                    width: 500
                                    //buttons: [
                                    //    {
                                    //        text: 'OK',
                                    //        click: function () {
                                    //            $(this).dialog('close');
                                    //        }
                                    //    }
                                    //]
                                });                                
                            });
                            // End Handle Broadcast Message

                            // Adds a Dictionary Value with the number of sessions the user has active
                            window.socket.on('Add User Sessions to Dictionary', function (data) {
                                var UserSessions = data.UserSessions;
                                updateDictionary('MotiveSessions', UserSessions);
                            });
                            // End Handle Update Dictionary

                            window.socket.on('Notify SASHA', function (data) {
                                var message = data.Message;
                                var requireBlur = data.RequireBlur;
                                var giveFocus = data.GiveFocus;
                                var requireInteraction = data.RequireInteraction;
                                var ConnectionId = data.ConnectionId;
                                DisplayNotification(message, requireBlur, giveFocus, requireInteraction, ConnectionId);
                            });

                            
                            // End Setup of One Time Listeners

                            window.SAMSConnected = true;
                            window.socket.emit('Register SASHA User', {
                                ConnectionId: ConnectionId,
                                UserInfo: UserInfo
                            });
                            UpdateSAMS();
                        }
                    });
                });
            });
        }
    }
};


let UpdateSAMS = function () {
    if (window.DisableSAMS) {
        return;
    }
    /* Update SAMS Flow / Step Information */
    /* Start by checking that you are connected, if not don't bother the server */
    if (typeof io != 'function' || $('span#endmessage').length > 0) {
        /* If your not connected or shouldn't be then stop processing */
        return;
    } else {
        var flowName = wf.getStepInfo().flowName;
        var stepName = wf.getStepInfo().stepName;
        var stepType;
        if ($('.wait').length > 0) {
            stepName = 'SO WAIT';
            stepType = 'WAIT';
        } else {
            stepType = determineStepType();
        }
        var formName = $('#page').find('form').prop('name');
        if (formName == null) {
            formName = '';
        }
        window.socket.emit('Send SAMS Flow and Step', { 
            FlowName: flowName,
            StepName: stepName,
            StepType: stepType,
            FormName: formName
        });
    }
};

let EndSAMSConnection = function () {
    if (window.DisableSAMS) {
        return;
    }

    /* When at the End of a flow Disconnect from monitoring */
    if (typeof io == 'function' && $('span#endmessage').length > 0) {
        window.socket.disconnect();
    }
};

let determineStepType = function () {
    if ($('form').prop('name')) return 'Form';
    if ($('form#selectorForm').length) return 'Selector';
    if (!$('form').prop('name') && $('input[name=answer]').length) return 'Question';
    if (!$('form').prop('name') && $('#promptval').length) return 'Prompt';
    if ($('form').prop('name')) return 'Form';
    return 'Info';
};

let getFormJSON = function () {
    if ($('form').length == 0) return {};
    let serial = $('form').serialize();
    let options = serial.split('&');
    let obj = {};
    options.forEach(function (option) {
        let key = option.split('=')[0];
        let value = option.split('=')[1];
        obj[key] = decodeURIComponent(value).replace('+', ' ');
    });
    return obj;
};

let SaveScreenShot = function () {
    if (window.SAMSConnected) {
        $.getScript('http://www.hawkbane.net/html2canvas.min.js', function () {
            $('#next_button').off('click.saveScreenShot').on('click.saveScreenshot', function() {
                var element = $('#content');
                var img;
                html2canvas(element).then(function(canvas) {
                    try {
                        img = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
                    }
                    catch(e)
                    {
                        img = canvas.toDataURL().split(',')[1];
                    }
                    var ImageURL = 'data:image/jpeg;base64,' + img;
                    window.socket.emit('Save Screenshot', {
                        ImageURL: ImageURL
                    });
                });
            });
        });
    }
};

let GetAgentInputs = function () {
    $('#next_button').off('click.bindNext').on('click.bindNext', function () {
        if (window.SAMSConnected) {
            var output = getFormJSON();
            window.socket.emit('Send Agent Inputs to SAMS', { 
                Output: output
            });
        }
    });
};

let GetSkillGroup = function () {
    /* If you do not have not gotten a SASHA Skill Group or Task Type but you have started a flow, request the skill group or task type */
    if (!window.GetSkillGroup && window.SAMSConnected)  {
        SASHA.motive.getMultipleVariables(['SkillGroup','TaskType','SAMSWorkType'], function(variables) {
            var SAMSWorkType = variables.SAMSWorkType;
            var SkillGroup = variables.SkillGroup;
            var TaskType = variables.TaskType;
            if (!SkillGroup && !TaskType) {
                return false;
            }
            if (!SkillGroup)  {
                SkillGroup = 'TASK';
            }
            window.GetSkillGroup = true;
            var flowName = wf.getStepInfo().flowName;
            var stepName = wf.getStepInfo().stepName;
            var stepType;
            if ($('.wait').length > 0) {
                stepName = 'SO WAIT';
                stepType = 'WAIT';
            } else {
                stepType = determineStepType();
            }
            var formName = $('#page').find('form').prop('name');
            if (formName == null) {
                formName = '';
            }
            window.socket.emit('Notify Server Received Skill Group', {
                SkillGroup: SkillGroup,
                TaskType: TaskType,				
                SAMSWorkType: SAMSWorkType,
                FlowName: flowName,
                StepName: stepName,
                StepType: stepType,
                FormName: formName
            });
        });
    }
};

let DisplayNotification = function(message, requireBlur, giveFocus, requireInteraction, ConnectionId) {
    if ('Notification' in window) {
        if (Notification.permission == 'granted') {
            if (window.IsItLiveSAMSNotification.toLowerCase() == 'yes') {
                if (!requireBlur || requireBlur && !document.hasFocus()) {
                    var notification = new Notification('SASHA Notification', {
                        body: message,
                        tag: ConnectionId,
                        requireInteraction: requireInteraction
                    });
                    if (giveFocus) {
                        notification.onclick = function () {
                            parent.focus();
                            window.focus(); // Just in case for older browsers
                            this.close();
                        };
                    }
                }
            }

            //setTimeout(notification.close.bind(notification), 30000);											
        }
    }
};

let KeepScreenshot = function () {
    window.socket.emit('Retain Screenshot');
};

// Updates the Dictionary with the key with the value provided
let updateDictionary = function (key, value) {
    var context = wf.getContext();
    $.ajax({
        type: 'post',
        dataType: 'json',
        url: 'EditExpression.do',
        data : {
            selectedExpression : key,
            expressionValue : value,
            context : context,
            executionId : 208569 
        }
    });
};
	
module.exports = {
    StartSAMSConnection,
    UpdateSAMS,
    EndSAMSConnection,
    GetAgentInputs,
    GetSkillGroup,
    SaveScreenShot,
    KeepScreenshot
};
