var hook = require( "./hook" ),
	logger = require( "./logger" );

process.on( "uncaughtException", function( error ) {
	logger.error( "Uncaught exception: " + error.stack );
});

var json = "";
process.stdin.resume();
process.stdin.setEncoding( "utf8" );
process.stdin.on( "data", function( chunk ) {
	json += chunk;
});
process.stdin.on( "end", function() {
	hook.processHook( JSON.parse( json ), function( error, data ) {
		if ( error ) {
			logger.error( "Error processing hook: " + error.stack );
		}
	});
});
