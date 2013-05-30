var https = require( "https" ),
	logger = require( "../lib/logger" );

module.exports = function( plugin, callback ) {

	function response( res ) {
		var data = "";

		res.on( "data", function(chunk){ data += chunk; } );

		res.on( "end", function(){
			if ( res.statusCode === 200 ) {
				try {
					data = JSON.parse( data );
					plugin.watchers = data.watchers_count;
					plugin.forks = data.forks_count;
					logger.log( "Updated " + plugin.plugin + ". Watchers(" + plugin.watchers + ") Forks(" + plugin.forks + ")" );
				} catch ( e ) {
					callback( e );
				}
			} else {
				logger.error( "Unexpected reply: " + data );
			}

			callback( null, plugin );
		});
	}

	var options = {
		host: "api.github.com",
		path: "/repos/" + plugin.repo.split( "/" ).slice( 1 ).join( "/" ),
		headers: {
			"user-agent": "stats/0.1 (+http://plugins.jquery.com)"
		}
	};

	https.request( options, response ).on( "error", logger.error ).end();
};

