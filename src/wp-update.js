var fs = require( "fs" ),
	semver = require( "semver" ),
	Step = require( "step" ),
	wordpress = require( "./wordpress" ),
	pluginsDb = require( "./pluginsdb" ),
	service = require( "./service" ),
	logger = require( "./logger" );

process.on( "uncaughtException", function( error ) {
	wordpress.end();
	logger.error( "Uncaught exception: " + error.stack );
});

function isStable( version ) {
	return /^\d+\.\d+\.\d+$/.test( version );
}

var actions = {};

actions.addRelease = function( data, fn ) {
	var repo = service.getRepoById( data.repo ),
		package = data.package,
		tag = data.tag;

	function getPageDetails( fn ) {
		Step(
			function() {
				repo.getReleaseDate( tag, this );
			},

			function( error, date ) {
				if ( error ) {
					return fn( error );
				}

				fn( null, {
					title: package.title,
					content: package.description,
					date: date,
					meta: {
						download_url: repo.downloadUrl( tag ),
						repo_url: repo.siteUrl
					}
				});
			}
		);
	}

	Step(
		function() {
			getPageDetails( this.parallel() );
			wordpress.getVersions( package.name, this.parallel() );
		},

		function( error, pageDetails, versions ) {
			if ( error ) {
				return fn( error );
			}

			var mainPage, latest,
				listed = versions
					.concat( package.version )
					.sort( semver.compare )
					.reverse()
					.filter(function( version ) {
						if ( latest ) {
							return isStable( version );
						}
						if ( isStable( version ) ) {
							latest = version;
						}
						return true;
					})
					.reverse();

			// no stable relases yet, show latest pre-release
			if ( !latest ) {
				latest = listed[ listed.length - 1 ];
			}

			this.parallel()( null, listed );
			this.parallel()( null, latest );
			this.parallel()( null, pageDetails );

			if ( latest === package.version ) {
				mainPage = Object.create( pageDetails );
				mainPage.name = package.name;
				mainPage.draft = true;
				wordpress.createPage( mainPage, package, pageDetails.meta, this.parallel() );
			} else {
				wordpress.getPageId( package.name, this.parallel() );
			}
		},

		function( error, versions, latest, pageDetails, mainPageId ) {
			if ( error ) {
				return fn( error );
			}

			this.parallel()( null, versions );
			this.parallel()( null, latest );

			pluginsDb.getMeta( package.name, this.parallel() );

			pageDetails.name = package.version;
			pageDetails.parent = mainPageId;
			wordpress.createPage( pageDetails, package, pageDetails.meta, this.parallel() );
		},

		function( error, versions, latest, meta ) {
			if ( error ) {
				return fn( error );
			}

			wordpress.setVersions( package.name, versions, latest, this.parallel() );
			wordpress.setMeta( package.name, meta, this.parallel() );
			wordpress.publish( package.name, this.parallel() );
		},

		function( error ) {
			if ( error ) {
				return fn( error );
			}

			wordpress.flush( this );
		},

		function( error ) {
			logger.log( "Added " + package.name + " v" + package.version + " to WordPress" );
			fn( error );
		}
	);
};





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

processActions(function( error ) {
	wordpress.end();
	logger.error( "Error updating WordPress: " + error.stack );
});
