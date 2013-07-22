var fs = require( "fs" ),
	Step = require( "step" ),
	config = require( "../lib/config" ),
	wordpress = require( "../lib/wordpress" ),
	pluginsDb = require( "../lib/pluginsdb" ),
	service = require( "../lib/service" ),
	logger = require( "../lib/logger" );

logger.log( "wordpress-update started." );

process.on( "uncaughtException", function( error ) {
	logger.error( "Uncaught exception: " + error.stack );
});

function extend( a, b ) {
	for ( var p in b ) {
		a[ p ] = b[ p ];
	}

	return a;
}

var actions = {};

actions.addRelease = function( data, fn ) {
	var repo = service.getRepoById( data.repo ),
		manifest = data.manifest,
		tag = data.tag;

	Step(
		function getPageData() {
			wordpress.post.fromRelease({
				repo: repo,
				manifest: manifest,
				tag: tag
			}, this.parallel() );
			pluginsDb.getMeta( manifest.name, this.parallel() );
			wordpress.getPostForPlugin( manifest.name, this.parallel() );
		},

		function updateMainPage( error, pageDetails, repoMeta, existingPage ) {
			if ( error ) {
				return fn( error );
			}

			this.parallel()( null, pageDetails );
			var mainPageCallback = this.parallel(),
				existingCustomFields = existingPage.customFields || [],
				mainPage = {
					customFields: existingCustomFields
				},
				versions = wordpress.post.addVersion(
					wordpress.post.getVersions( existingPage ),
					manifest.version );

			// The main page starts as an empty object so that publishing a new
			// version which is not the latest version only updates the metadata
			// of the main page. If the new version is the latest, then the
			// main page is constructed from the new version since pretty much
			// anything can change between versions.
			if ( versions.latest === manifest.version ) {
				extend( mainPage, pageDetails );
				// Don't update the post date on the main page
				delete mainPage.date;
				mainPage.name = manifest.name;
				mainPage.customFields = wordpress.post.mergeCustomFields(
					existingCustomFields, pageDetails.customFields );
			}

			// Always update the metadata for the main page
			mainPage.customFields = wordpress.post.mergeCustomFields( mainPage.customFields, [
				{ key: "versions", value: JSON.stringify( versions.listed ) },
				{ key: "latest", value: versions.latest },
				{ key: "watchers", value: repoMeta.watchers },
				{ key: "forks", value: repoMeta.forks }
			]);

			if ( !existingPage.id ) {
				wordpress.newPost( mainPage, mainPageCallback );
			} else {
				wordpress.editPost( existingPage.id, mainPage, function( error ) {
					if ( error ) {
						return mainPageCallback( error );
					}

					mainPageCallback( null, existingPage.id );
				});
			}
		},

		function createVersionPage( error, pageDetails, mainPageId ) {
			if ( error ) {
				return fn( error );
			}

			pageDetails.name = manifest.version;
			pageDetails.parent = mainPageId;
			wordpress.newPost( pageDetails, this.parallel() );
		},

		function( error /*, versions, latest*/ ) {
			if ( error ) {
				return fn( error );
			}

			logger.log( "Added " + manifest.name + " v" + manifest.version + " to WordPress" );
			fn( null );
		}
	);
};





function processActions( fn ) {
	logger.log( "Processing actions." );
	Step(
		function() {
			fs.readFile( config.lastActionFile, "utf8", this );
		},

		function( error, lastAction ) {
			if ( error && error.code === "ENOENT" ) {
				logger.log( "No last-action file." );
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

var processActionsSince = function( actionId, fn ) {
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
			fs.writeFile( config.lastActionFile, action.id, this.parallel() );
		},

		function( error, action ) {
			if ( error ) {
				return fn( error );
			}

			processActionsSince( action.id, fn );
		}
	);
};

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

processActions(function( error ) {
	if ( error ) {
		logger.error( "Error updating WordPress: " + error.stack );

		// Kill the process with an error code and let the manager restart it
		process.exit( 1 );
	}
});

// Let the current action finish, then stop processing and exit
function shutdownHook() {
	logger.log( "Shutting down wordpress-update." );
	processActionsSince = function( actionId, fn ) {
		fn( null );
	};
}

process.once( "SIGINT", shutdownHook );
process.once( "SIGTERM", shutdownHook );
