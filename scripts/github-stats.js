var https = require( "https" );

module.exports = function ( plugin, callback ) {

	function response ( res ) {
		var data = "",
			error = null;

		res.on ( "data", function(chunk){ data += chunk; } );

		res.on ( "end", function(){
			if ( res.statusCode === 304 ) {
				console.log("304, no work to do");
			} else if ( res.statusCode === 200 ) {
				try {
					data = JSON.parse(data);
					plugin.watchers = data.watchers_count;
					plugin.forks = data.forks_count;

					console.log("Plugin " + plugin.plugin + " updated!");
					console.log("Watchers: " + data.watchers_count + " Forks: " + data.forks_count + "\n");
				} catch (err) {
					error = err;
				}
			} else {
				// Well that's weird, wat do?
				console.log("Unexpected reply, take a look:\n\n" + data);
			}

			callback(null, plugin);
		});
	}

	function errorHandler(error) {
		console.log("Error: " + error);
	}

	console.log("Processing plugin " + plugin.plugin);

	var options = {
		host: "api.github.com",
		path: "/repos/" + plugin.repo.split("/").slice(1).join("/"),
		headers: {
			"user-agent": "stats/0.1 (+http://plugins.jquery.com)"
		}
	};

	https.request( options, response ).on( "error", errorHandler ).end();
};

