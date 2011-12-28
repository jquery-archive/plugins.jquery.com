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
		db.get( "SELECT owner FROM plugins WHERE plugin = ?",
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
		db.run( "INSERT INTO plugins( plugin, owner ) VALUES( ?, ? )",
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

	getTags: auto(function( repoId, fn ) {
		db.all( "SELECT tag FROM repos WHERE repo = ?", [ repoId ], function( error, tags ) {
			if ( error ) {
				return fn( error );
			}

			var ret = {};
			tags.forEach(function( tag ) {
				ret[ tag.tag ] = true;
			});
			fn( null, ret );
		});
	}),

	addTag: auto(function( repoId, tag, fn ) {
		db.run( "INSERT INTO repos( repo, tag ) VALUES( ?, ? )", [ repoId, tag ], fn );
	}),

	addRelease: auto(function( repoId, release, fn ) {
		var data = JSON.stringify({
			repo: repoId,
			tag: release.tag,
			package: release.package
		});

		db.run( "INSERT INTO actions( action, data ) VALUES( ?, ? )",
			[ "addRelease", data ], function( error ) {
				if ( error ) {
					return fn( error );
				}

				pluginsDb.addTag( repoId, release.tag, fn );
			});
	}),

	updatePlugin: auto(function( plugin, owner, data, fn ) {
		db.run( "UPDATE plugins SET watchers = ?, forks = ? " +
			"WHERE plugin = ? AND owner = ?",
			[ data.watchers, data.forks, plugin, owner ], fn );
	}),

	getMeta: auto(function( plugin, fn ) {
		db.get( "SELECT watchers, forks FROM plugins WHERE plugin = ?",
			[ plugin ], fn );
	}),

	getFirstAction: auto(function( fn ) {
		db.get( "SELECT * FROM actions ORDER BY id ASC LIMIT 1", fn );
	}),

	getNextAction: auto(function( id, fn ) {
		db.get( "SELECT * FROM actions WHERE id > " + id + " ORDER BY id ASC LIMIT 1", fn );
	}),

	_reset: function( fn ) {
		var fs = require( "fs" ),
			Step = require( "step" );

		Step(
			function() {
				fs.unlink( config.pluginsDb, this );
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

				db.run( "CREATE TABLE plugins (" +
					"plugin TEXT PRIMARY KEY, " +
					"owner TEXT, " +
					"watchers INTEGER DEFAULT 0, " +
					"forks INTEGER DEFAULT 0" +
				")", this.parallel() );

				db.run( "CREATE TABLE repos (" +
					"repo TEXT, " +
					"tag TEXT" +
				")", this.parallel() );

				db.run( "CREATE TABLE actions (" +
					"id INTEGER PRIMARY KEY AUTOINCREMENT, " +
					"action TEXT, " +
					"data TEXT " +
				")", this.parallel() );
			},

			function( error ) {
				fn( error );
			}
		);
	}
};
