var semver = require( "semver" ),
	Step = require( "step" ),
	pluginsDb = require( "./pluginsdb" ),
	service = require( "./service" ),
	retry = require( "./retrydb" ),
	logger = require( "./logger" );

function processHook( data, fn ) {
	var repo = service.getRepoByHook( data );

	if ( !repo ) {
		logger.warn( "Could not parse hook: " + JSON.stringify( data ) );
		return fn( new Error( "Could not parse hook." ) );
	}

	Step(
		function() {
			processVersions( repo, this );
		},

		function( error ) {
			if ( error ) {
				return fn( error );
			}

			processMeta( repo, this );
		},

		function( error ) {
			fn( error );
		}
	);
}

function processVersions( repo, fn ) {
	Step(
		// get all tags for the repo
		function() {
			pluginsDb.getTags( repo.id, this.parallel() );
			repo.getVersionTags( this.parallel() );
		},

		// filter to new versions
		function( error, processedTags, tags ) {
			if ( error ) {
				retry.log( "processVersions", repo.id );
				return fn( error );
			}

			return tags.filter(function( tag ) {
				return !(tag in processedTags);
			// only process up to 10 tags per run
			// this keeps the number of open file descriptors lower
			// it's unlikely that any update will have more than 10 tags
			}).slice( -10 );
		},

		// get releases
		function( error, tags ) {
			if ( error ) {
				retry.log( "processVersions", repo.id );
				return fn( error );
			}

			if ( !tags.length ) {
				return fn( null );
			}

			this.parallel()( null, tags );
			var group = this.group();
			tags.forEach(function( tag ) {
				repo.getRelease( tag, group() );
			});
		},

		// filter to valid releases
		function( error, tags, releases ) {
			if ( error ) {
				retry.log( "processVersions", repo.id );
				return fn( error );
			}

			var releasesCb = this.parallel(),
				invalidGroup = this.group();
			releasesCb( null, releases.filter(function( release, i ) {
				if ( release ) {
					return true;
				}

				// track invalid tags so we don't process them on each update
				pluginsDb.addTag( repo.id, tags[ i ], invalidGroup() );
				return false;
			}));
		},

		// process the releases
		function( error, releases ) {
			if ( error ) {
				retry.log( "processVersions", repo.id );
				return fn( error );
			}

			if ( !releases.length ) {
				return fn( null );
			}

			var group = this.group();
			releases.forEach(function( release ) {
				for ( file in release.packages ) {
					processRelease( repo, release.tag, file, release.packages[ file ], group() );
				}
			});
		},

		function( error ) {
			fn( error );
		}
	);
}

function processRelease( repo, tag, file, package, fn ) {
	// TODO: track plugin name for retry in suites
	Step(
		// find out who owns this plugin
		// if there is no owner, then set the user as the owner
		function() {
			pluginsDb.getOrSetOwner( package.name, repo.userId, this );
		},

		// verify the user is the owner
		function( error, owner ) {
			if ( error ) {
				retry.log( "processRelease", repo.id, tag, file );
				return fn( error );
			}

			// the plugin is owned by someone else
			if ( owner !== repo.userId ) {
				// TODO: report error to user
				logger.log( repo.userId + " attempted to add " + package.name + " which is owned by " + owner );
				return fn( null, null );
			}

			return owner;
		},

		// track the new release
		function( error, owner ) {
			pluginsDb.addRelease( repo.id, tag, file, package, this );
		},

		// finished processing release
		function( error ) {
			if ( error ) {
				retry.log( "processRelease", repo.id, tag, file );
				return fn( error );
			}

			logger.log( "Added " + package.name + " v" + package.version + " to plugins DB" );
			fn( null, package );
		}
	);
}

function processMeta( repo, fn ) {
	Step(
		function() {
			repo.getPackageJson( null, this );
		},

		function( error, package ) {
			if ( error ) {
				retry.log( "processMeta", repo.id );
				return fn( error );
			}

			if ( !package || !package.name ) {
				return fn( null );
			}

			pluginsDb.updatePlugin( package.name, repo.userId, {
				watchers: repo.watchers,
				forks: repo.forks
			}, this );
		},

		function( error ) {
			if ( error ) {
				retry.log( "processMeta", repo.id );
				return fn( error );
			}

			fn( null );
		}
	);
}

module.exports = {
	processHook: processHook,
	processVersions: processVersions,
	processRelease: processRelease,
	processMeta: processMeta
};
