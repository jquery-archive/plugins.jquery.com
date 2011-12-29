var sqlite = require( "sqlite3" );

var db;

function connect( fn ) {
	db = new sqlite.Database( "retry.db", fn );
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
	log: auto(function( method ) {
		var str, fn,
			args = [].slice.call( arguments, 1 );

		if ( typeof args[ args.length - 1 ] === "function" ) {
			fn = args.pop();
		}

		str = JSON.stringify({
			method: method,
			args: args
		});

		db.run( "INSERT OR IGNORE INTO retry( retry ) VALUES( ? )",
			[ str ], fn );
	}),

	_reset: function( fn ) {
		var fs = require( "fs" ),
			Step = require( "step" );

		Step(
			function() {
				fs.unlink( "retry.db", this );
			},

			function( error ) {
				if ( !error || error.code === "ENOENT" ) {
					return connect( this );
				}

				fn( error );
			},

			function( error ) {
				if ( error ) {
					return fn( error );
				}

				db.run( "CREATE TABLE retry (" +
					"retry TEXT PRIMARY KEY, " +
					"timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
				")", this );
			},

			function( error ) {
				fn( error );
			}
		);
	}
};
