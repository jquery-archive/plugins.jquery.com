var http = require( "http" ),
	hook = require( "../lib/hook" ),
	logger = require( "../lib/logger" );

var port = (function() {
	var index = process.argv.indexOf( "-p" );
	return index === -1 ? 8001 : +process.argv[ index + 1 ];
})();

process.on( "uncaughtException", function( error ) {
	logger.error( "Uncaught exception: " + error.stack );
});

var server = http.createServer(function( request, response ) {
	var json = "";
	request.setEncoding( "utf8" );
	request.on( "data", function( chunk ) {
		json += chunk;
	});

	request.on( "end", function() {
		try {
			json = JSON.parse( json );
		} catch( e ) {
			// Invalid JSON, stop processing
			logger.error( "Invalid request: " + json );
			response.writeHead( 400 );
			response.end();
			return;
		}

		// Accept the request and close the connection
		response.writeHead( 202 );
		response.end();

		// Process the request
		hook.processHook( json, function( error ) {
			if ( error ) {
				logger.error( "Error processing hook: " + error.stack );
			}
		});
	});
});

// If another process is using this port, keep retrying
server.on( "error", function( error ) {
	if ( error.code === "EADDRINUSE" ) {
		return setTimeout(function() {
			// server.close();
			server.listen( port );
		}, 100 );
	}
});

server.listen( port );

process.on( "SIGINT", function() {
	server.close();
});
