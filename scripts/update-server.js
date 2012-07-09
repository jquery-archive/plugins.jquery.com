var http = require( "http" ),
	service = require( "../lib/service" ),
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
	var data = "";
	request.setEncoding( "utf8" );
	request.on( "data", function( chunk ) {
		data += chunk;
	});

	request.on( "end", function() {
		var repo = service.getRepoByHook( data );
		if ( !repo ) {
			// Invalid data, stop processing
			logger.error( "Invalid request: " + data );
			response.writeHead( 400 );
			response.end();
			return;
		}

		// Accept the request and close the connection
		response.writeHead( 202 );
		response.end();

		// Process the request
		hook.processHook( repo, function( error ) {
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
