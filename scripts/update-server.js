var http = require( "http" ),
	hook = require( "../lib/hook" ),
	logger = require( "../lib/logger" );

process.on( "uncaughtException", function( error ) {
	logger.error( "Uncaught exception: " + error.stack );
});

http.createServer(function( request, response ) {
	var json = "";
	request.setEncoding( "utf8" );
	request.on( "data", function( chunk ) {
		json += chunk;
	});
	request.on( "end", function() {
		response.writeHead( 200 );
		response.end();

		try {
			json = JSON.parse( json );
		} catch( e ) {
			logger.error( "Invalid request: " + json );
			return;
		}

		hook.processHook( json, function( error ) {
			if ( error ) {
				logger.error( "Error processing hook: " + error.stack );
			}
		});
	});
}).listen( 8001 );
