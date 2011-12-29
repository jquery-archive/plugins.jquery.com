var fs = require( "fs" ),
	semver = require( "semver" ),
	Step = require( "step" ),
	template = require( "./template" ),
	wordpress = require( "./wordpress" ),
	pluginsDb = require( "./pluginsdb" ),
	service = require( "./service" );

process.on( "uncaughtException", function( error ) {
	// TODO: log error to file
	console.error( "uncaught exception" );
	console.error( error );
	console.error( error.stack );
});

function isStable( version ) {
	return /^\d+\.\d+\.\d+$/.test( version );
}

var actions = {};

actions.addRelease = function( data, fn ) {
	var repo = service.getRepoById( data.repo ),
		package = data.package,
		tag = data.tag;

	Step(
		// generate the version page for WordPress
		function() {
			repo.getReleaseDate( tag, this.parallel() );

			var pluginData = Object.create( package );
			pluginData._downloadUrl = repo.downloadUrl( tag );
			pluginData.url = repo.siteUrl;
			template.render( "page", pluginData, this.parallel() );
		},

		// create the version page in WordPress
		function( error, date, page ) {
			if ( error ) {
				// TODO: log failure for retry
				return fn( error );
			}

			wordpress.addVersionedPlugin( package, page, date, this );
		},

		// get existing versions
		function( error ) {
			if ( error ) {
				// TODO: log failure for retry
				return fn( error );
			}

			console.log( "Added " + package.name + " " + package.version + " to WordPress" );
			wordpress.getVersions( package.name, this );
		},

		// update WordPress to list new versions
		function( error, versions ) {
			if ( error ) {
				// TODO: log failure for retry
				return fn( error );
			}

			var latest, filteredVersions;

			versions = versions.concat( package.version ).sort( semver.compare ).reverse();
			filteredVersions = versions.filter(function( version ) {
				if ( latest ) {
					return isStable( version );
				}
				if ( isStable( version ) ) {
					latest = version;
				}
				return true;
			});

			// no stable relases yet, show latest pre-release
			if ( !latest ) {
				latest = filteredVersions[ 0 ];
			}

			wordpress.setVersions( package.name, filteredVersions, latest, this );
		},

		// finalize/publish versioned page
		function( error ) {
			if ( error ) {
				// TODO: log failure for retry
				return fn( error );
			}

			wordpress.finalizePendingVersions( package.name, this );
		},

		// get watchers and forks from plugins DB
		function( error ) {
			if ( error ) {
				// TODO: log failure for retry
				return fn( error );
			}

			pluginsDb.getMeta( package.name, this );
		},

		// update watchers and forks in WordPress
		function( error, meta ) {
			if ( error ) {
				// TODO: log failure for retry
				return fn( error );
			}

			wordpress.updateMeta( package.name, meta, this );
		},

		// flush redirect rules
		function( error ) {
			if ( error ) {
				// TODO: log failure for retry
				return fn( error );
			}

			console.log( "Updated " + package.name + " in WordPress" );
			wordpress.flush( this );
		},

		function( error ) {
			if ( error ) {
				// TODO: log failure for retry
				return fn( error );
			}

			fn( null );
		}
	);
};

function processActionsSince( actionId, fn ) {
	Step(
		function() {
			processNextAction( actionId, this );
		},

		function( error, action ) {
			if ( error ) {
				return fn( error );
			}

			// no more actions, wait then try again
			if ( !action ) {
				setTimeout(function() {
					processActionsSince( actionId, fn );
				}, 5000 );
				return;
			}

			this.parallel()( null, action );
			fs.writeFile( "last-action", action.id, this.parallel() );
		},

		function( error, action ) {
			if ( error ) {
				return fn( error );
			}

			processActionsSince( action.id, fn );
		}
	);
}

function processNextAction( actionId, fn ) {
	Step(
		function() {
			if ( actionId ) {
				pluginsDb.getNextAction( actionId, this );
			} else {
				pluginsDb.getFirstAction( this );
			}
		},

		function( error, action ) {
			if ( error ) {
				return fn( error );
			}

			if ( !action ) {
				return fn( null, null );
			}

			this.parallel()( null, action );
			actions[ action.action ]( JSON.parse( action.data ), this.parallel() );
		},

		function( error, action ) {
			if ( error ) {
				return fn( error );
			}

			fn( null, action );
		}
	);
}

function processActions( fn ) {
	Step(
		function() {
			fs.readFile( "last-action", "utf8", this );
		},

		function( error, lastAction ) {
			if ( error && error.code === "ENOENT" ) {
				return null;
			}

			if ( error ) {
				return fn( error );
			}

			return JSON.parse( lastAction );
		},

		function( error, actionId ) {
			processActionsSince( actionId, this );
		},

		function( error ) {
			fn( error );
		}
	);
}

processActions(function( error ) {
	console.error( error );
});
