var hook = require( "./hook" ),
	logger = require( "./logger" );

process.on( "uncaughtException", function( error ) {
	logger.error( "Uncaught exception: " + error.stack );
});

hook.processHook({
	url: "http://github.com/scottgonzalez/temp-jquery-foo",
	watchers: 25,
	forks: 3
}, function( error, data ) {
	if ( error ) {
		logger.error( "Error processing hook: " + error.stack );
	}
});
