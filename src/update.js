var hook = require( "./hook" );

process.on( "uncaughtException", function( error ) {
	// TODO: log error to file
	console.error( "uncaught exception" );
	console.error( error );
	console.error( error.stack );
});

hook.processHook({
	url: "http://github.com/scottgonzalez/temp-jquery-foo",
	watchers: 25,
	forks: 3
}, function( error, data ) {
	// TODO: log error to file
	if ( error ) {
		console.error( error );
		console.error( error.stack );
	}
});
