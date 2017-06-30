module.exports = function () {
    if (window.DisableNode) {
        return;
    }
    var serverAddress = 'http://108.226.174.227';    
    /* Register a new SASHA Connection to SAMS */
    if ($('.registerSASHAConnection').length > 0)  {
        /* If typeof is not yet defined, you have not conncted so you may */
        if (typeof io != 'function') {
            SASHA.motive.getMultipleVariables([
                'userName','smpSessionId',
                { name: 'environment', expression: 'environmentProperties["SASHAEnvironment"]'},
                { name: 'IsItLiveNodeIntegration', expression: 'environmentProperties["IsItLiveNodeIntegration"]'},                
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

                var IsItLiveNodeIntegration = variables.IsItLiveNodeIntegration
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
                    window.DisableNode = true;
                    return;
                }
                $.getScript('https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.3/socket.io.js', function() {
                    var socketURL;
                    switch (environment) {
                    case 'FDE':
                        socketURL = serverAddress + ':5510'; /* FDE* */
                        break;
                    case 'Pre-Prod':
                        socketURL = serverAddress + ':5520'; /* PRE-PROD (BETA) */ 
                        break;
                    case 'Prod - FF':
                        socketURL = serverAddress + ':5530'; /* PRODUCTION */
                        break;
                    case 'Prod - KC':
                        socketURL = serverAddress + ':5530'; /* PRODUCTION */
                        break;
                    default:
                        socketURL = serverAddress + ':5510'; /* DEFAULT (FDE) */
                        break;
                    }
                    window.socket = io.connect(socketURL);
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
                        UserInfo.StepTime = new Array();
                        UserInfo.UserStatus = 'Inactive';
                        window.socket.emit('Register SASHA User', {
                            ConnectionId: ConnectionId,
                            UserInfo: UserInfo
                        });
                    });
                });
            });
        }
    }

    /* Update SAMS to understand that you have started a SASHA Flow */
    if ($('.beginSASHAFlow').length > 0)  {
        SASHA.motive.getExpressionOnce('skillGroup', function (skillGroup) {	
            var flowName = wf.getStepInfo().flowName;
            var stepName = wf.getStepInfo().stepName;
            window.socket.emit('Notify Server Begin SASHA Flow', {
                SkillGroup: skillGroup,
                FlowName: flowName,
                StepName: stepName
            });
        });
    }

    /* Update SAMS Flow / Step Information */
    /* Start by checking that you are connected, if not don't bother the server */
    if (typeof io != 'function') {
        /* If your not connected or shouldn't be then stop processing */
        return;
    } else {		
        var flowName = wf.getStepInfo().flowName;
        var stepName = wf.getStepInfo().stepName;
        if ($('.wait').length > 0) {
            stepName = 'WAIT SCREEN';
        }
        window.socket.emit('Send SAMS Flow and Step', { 
            FlowName: flowName,
            StepName: stepName
        });
    }
	
    /* When at the End of a flow Disconnect from monitoring */
    if (typeof io == 'function' && $('span#endmessage').length > 0) {
        window.socket.disconnect();
    }
};
