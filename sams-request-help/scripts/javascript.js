
$(document).ready(function () {
    var hostname = window.location.hostname.split('.')[0];
    // Set the location of the Node.JS server
    var serverAddress = 'http://108.226.174.227';
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

    socket.on('connect', function () {
        showMainScreen();
    });

    socket.on('Request Connection Type', function(data) {
        var ServerStartTime = data.ServerStartTime;
        ServerStartTime = toLocalDateTime(ServerStartTime);
        $('span#serverStartTime').html(ServerStartTime);
        socket.emit('Register Helper User');
    });

    socket.on('Send Help Request to Helper', function (data) {
        alert('here');
        var HelpRequest = data.HelpRequest;
        var html = 'AttUID: ' + HelpRequest.AttUID + '<br />';
        html += 'First Name: ' + HelpRequest.FirstName + '<br />';
        html += 'Last Name: ' + HelpRequest.LastName + '<br />';
        html += 'Reverse Name: ' + HelpRequest.ReverseName + '<br />';
        html += 'Full Name: ' + HelpRequest.FullName + '<br />';
        html += 'Skill Group: ' + HelpRequest.SkillGroup + '<br />';
        html += 'Request: ' + HelpRequest.Request + '<br />';
        html += 'Request Status: ' + HelpRequest.RequestStatus + '<br />';
        html += 'Request Opened: ' + HelpRequest.RequestOpened + '<br />';
        $('div.helpRequests').append(html);
        alert(html);
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


// Convert Time to DateTime as MM/DD/YY @ HH:MM:SS
let toLocalDateTime = function (timestamp) {
    if (timestamp !== null) {
        timestamp = new Date(timestamp);
        var month = timestamp.getMonth();
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
};