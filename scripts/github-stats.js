var https = require( "https" ),
	logger = require( "../lib/logger" );

module.exports = function ( plugin, callback ) {

	function response ( res ) {
		var data = "",
			error = null;

		res.on ( "data", function(chunk){ data += chunk; } );

		res.on ( "end", function(){
			if ( res.statusCode === 304 ) {
				logger.log("304, no work to do");
			} else if ( res.statusCode === 200 ) {
				try {
					data = JSON.parse(data);
					plugin.watchers = data.watchers_count;
					plugin.forks = data.forks_count;

					logger.log("Plugin " + plugin.plugin + " updated!");
					logger.log("Watchers: " + data.watchers_count + " Forks: " + data.forks_count + "\n");
				} catch (err) {
					error = err;
				}
			} else {
				// Well that's weird, wat do?
				logger.log("Unexpected reply, take a look:\n\n" + data);
			}

			callback(null, plugin);
		});
	}

	function errorHandler(error) {
		logger.log("Error: " + error);
	}

	logger.log("Processing plugin " + plugin.plugin);

	var options = {
		host: "api.github.com",
		path: "/repos/" + plugin.repo.split("/").slice(1).join("/"),
		headers: {
			"user-agent": "stats/0.1 (+http://plugins.jquery.com)"
		}
	};

	https.request( options, response ).on( "error", errorHandler ).end();
};

