$(document).ready(function () {
    // Set the location of the Node.JS server
    var serverAddress = 'http://10.100.49.104';
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
        version = 'DEFAULT (PRODUCTION)';
        break;
    }
    
    document.title = 'SAMS - ' + version + ' SCREENSHOT DATA';
    // Initialize variables
    window.socket = io.connect(socketURL)
	
	$('input#includeIncProcess').prop('checked',false);
	
    $('button#reloadlist').off('click').on('click', function () {
		$('div#screenshotdata').html('');
			if ($('input#includeInProgress').is(':checked')) {
			includeInProgress = "Y";
		} else {
			includeInProgress = "N";
		}
        socket.emit('Get Listing', {
			includeInProgress: includeInProgress
		});
    });

	$('input#includeInProgress').off('change').on('change', function() {
		$('div#screenshotdata').html('');
		if ($('input#includeInProgress').is(':checked')) {
			includeInProgress = "Y";
		} else {
			includeInProgress = "N";
		}
        socket.emit('Get Listing', {
			includeInProgress: includeInProgress
		});
	});
	
    socket.on('connect', function () {
		if ($('input#includeInProgress').is(':checked')) {
			includeInProgress = "Y";
		} else {
			includeInProgress = "N";
		}
        socket.emit('Get Listing', {
			includeInProgress: includeInProgress
		});		
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
	
	
	if (vars.id) {
		if (vars.connection) {
			$('body').html('<div id="retain">Screenshots are normally discarded upon completion of the flow.  As long as your SASHA session has not completed, you may click <button id="retainScreenshots">HERE</button> to request retention.</div><div id="screenshotdata"></div>');
//			$('button#retainScreenshots').off('click').on('click', function () {
//				socket.emit('Retain Screenshot Remote', {
//					connectionId: vars.connection
//				});
//				var url = window.location.href;
//				if (url.indexOf('&connection=')) {
//					index = url.indexOf('&connection=');
//					url = url.substr(0,index);
//				}
//				$('div#retain').html('Your screenshots will be accessible at: ' + url);				
//			});
//		} else {
//			$('body').html('<div id="screenshotdata"></div>');			
//		}

        socket.emit('Get ScreenShots', {
			smpSessionId: vars.id
		});
		}
	}	
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
