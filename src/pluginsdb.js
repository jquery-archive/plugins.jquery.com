var sqlite = require( "sqlite3" ),
	config = require( "./config" );

var db;

function connect( fn ) {
	db = new sqlite.Database( config.pluginsDb, fn );
}

function auto( fn ) {
	return function() {
		var that = this,
			args = arguments;

		if ( db ) {
			return fn.apply( that, args );
		}

		connect(function( error ) {
			if ( error ) {
				return fn( error );
			}

			fn.apply( that, args );
		});
	};
}

var pluginsDb = module.exports = {
	getOwner: auto(function( plugin, fn ) {
		db.get( "SELECT owner FROM owners WHERE plugin = ?",
			[ plugin ], function( error, row ) {
				if ( error ) {
					return fn( error );
				}

				if ( !row ) {
					return fn( null, null );
				}

				return fn( null, row.owner );
			});
	}),

	setOwner: auto(function( plugin, owner, fn ) {
		db.run( "INSERT INTO owners( plugin, owner ) VALUES( ?, ? )",
			[ plugin, owner ], function( error ) {
				if ( error ) {
					return fn( error );
				}

				fn( null );
			});
	}),

	getOrSetOwner: auto(function( plugin, owner, fn ) {
		pluginsDb.setOwner( plugin, owner, function( error ) {
			// successfully set owner (new plugin)
			if ( !error ) {
				return fn( null, owner );
			}

			// there is already an owner
			if ( error.code === "SQLITE_CONSTRAINT" ) {
				return pluginsDb.getOwner( plugin, fn );
			}

			fn( error );
		});
	}),

	addVersion: auto(function( repoDetails, package, fn ) {
		// TODO: verify what data we need to store (build restore functionality to confirm)
		var data = JSON.stringify({
			git: repoDetails.git,
			package: package
		});
		// TODO: should we track timestamps so we can replay actions since a specific date?
		db.run( "INSERT INTO actions( action, data ) VALUES( ?, ? )",
			[ "addVersion", data ], function( error ) {
				if ( error ) {
					return fn( error );
				}

				fn( null );
			});
	}),

	getAllActions: auto(function( fn ) {
		db.all( "SELECT * FROM actions", fn );
	})
};
