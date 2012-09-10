var sqlite = require( "sqlite3" ),
	path = require( "path" ),
	filename = path.join( __dirname, "../retry.db" );

var db;

function connect( fn ) {
	db = new sqlite.Database( filename, fn );
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

module.exports = {
	dbPath: filename,

	log: auto(function( method ) {
		var str,
			fn = function() {},
			args = [].slice.call( arguments, 1 );

		if ( typeof args[ args.length - 1 ] === "function" ) {
			fn = args.pop();
		}

		str = JSON.stringify({
			method: method,
			args: args
		});

		db.run( "INSERT INTO retry( retry ) VALUES( ? )", [ str ], function( error ) {
			if ( !error ) {
				return fn( null );
			}

			if ( error.code === "SQLITE_CONSTRAINT" ) {
				return db.run( "UPDATE retry SET tries = tries + 1 WHERE retry = ?",
					[ str ], fn );
			}

			fn( error );
		});
	}),

	getFailure: auto(function( fn ) {
		db.get( "SELECT * FROM retry ORDER BY timestamp ASC LIMIT 1",
			function( error, row ) {
				if ( error ) {
					return fn( error );
				}

				if ( !row ) {
					return fn( null, null );
				}

				var data = JSON.parse( row.retry );
				fn( null, {
					method: data.method,
					args: data.args,
					timestamp: row.timestamp,
					tries: row.tries,
					retry: row.retry
				});
			});
	}),

	remove: auto(function( retry, fn ) {
		db.run( "DELETE FROM retry WHERE retry = ?", [ retry ], fn );
	}),

	_setup: function( fn ) {
		var Step = require( "step" );

		Step(
			function( error ) {
				connect( this );
			},

			function( error ) {
				if ( error ) {
					return fn( error );
				}

				db.run( "CREATE TABLE retry (" +
					"retry TEXT PRIMARY KEY, " +
					"timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
					"tries INTEGER DEFAULT 0" +
				")", this );
			},

			function( error ) {
				fn( error );
			}
		);
	}
};
