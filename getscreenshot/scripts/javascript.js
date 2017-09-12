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

    // Initialize variables
    window.socket = io.connect(socketURL)

    $('button#reloadlist').off('click').on('click', function () {
        socket.emit('Get Listing');		
    });

    socket.on('connect', function () {
        socket.emit('Get Listing');		
    });
	
    socket.on('Receive Listing', function(data) {
        var rows = data.data
        var html = "SESSION ID: <SELECT ID='id' name='id'>";
        html += "<option value='false'>-- SELECT SESSION --</option>";		
        $.each( rows, function (key, value) {
            var value2 = value.smpSessionId;
            html += '<option value="' + value2 + '">' + value2 + '</option>';
        });
        html += '</select>';
        $('div#selector').html(html);
        $('select#id').off('change').on('change', function () {
            $('div#screenshotdata').html('');							
            var smpSessionId = $('select#id :selected').val();
            if (smpSessionId) {
                socket.emit('Get ScreenShots', {
                    smpSessionId: smpSessionId
                });
            }
        });
    });

    socket.on('Get ScreenShots', function (data) {
        var timestamp = data.timestamp;
        var flowName = data.flowName;
        var stepName = data.stepName;
        var imageData = data.imageData;
        var html = '<p>Timestamp: ' + timestamp + '<br />' + 'Flow: ' + flowName + ' -> ' + stepName + '<br /><img src="' + imageData + '">';
        $('div#screenshotdata').append(html);
    });
});

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
