var fs = require( "fs" ),
	sqlite = require( "sqlite3" ),
	config = require( "./config" ),
	success = true;

try {
	fs.unlinkSync( config.pluginsDb );
} catch( error ) {
	if ( error.code !== "ENOENT" ) {
		return logError( "Could not check status of, or delete, plugin.db " );
	}
}

var db = new sqlite.Database( config.pluginsDb, function( error ) {
	if ( error ) {
		return logError( error, "Could not open database." );
	}

	setup();
});

function setup() {
	createOwnersTable(function( error ) {
		if ( error ) {
			return logError( error, "Could not create owners table." );
		}

		console.log( "Created owners table." );
	});

	createActionsTable(function( error ) {
		if ( error ) {
			return logError( error, "Could not create actions table." );
		}

		console.log( "Created actions table." );
	});
}

function logError( error, msg ) {
	console.log( "ERROR!", msg );
	console.log( error );
	success = false;
}

function createOwnersTable( fn ) {
	db.run( "CREATE TABLE owners (" +
		"plugin TEXT PRIMARY KEY, " +
		"owner TEXT " +
	");", fn );
}

function createActionsTable( fn ) {
	db.run( "CREATE TABLE actions (" +
		"id INTEGER PRIMARY KEY AUTOINCREMENT, " +
		"action TEXT, " +
		"data TEXT " +
	");", fn );
}

process.on( "exit", function() {
	if ( success ) {
		console.log( "SUCCESS!", "Setup complete." );
	} else {
		console.log( "ERROR!", "Setup failed." );
	}
});
