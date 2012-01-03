var semver = require( "semver" ),
	Step = require( "step" ),
	UserError = require( "./user-error" ),
	pluginsDb = require( "./pluginsdb" ),
	service = require( "./service" ),
	retry = require( "./retrydb" );

function processHook( data, fn ) {
	var repo = service.getRepoByHook( data );

	if ( !repo ) {
		// TODO: log and bail (no retry)
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
			pluginsDb.getTags( repo.getId(), this.parallel() );
			repo.getVersionTags( this.parallel() );
		},

		// filter to new versions
		function( error, processedTags, tags ) {
			if ( error ) {
				retry.log( "processVersions", repo.getId() );
				return fn( error );
			}

			return tags.filter(function( tag ) {
				return !(tag in processedTags);
			});
		},

		// get releases
		function( error, tags ) {
			if ( error ) {
				retry.log( "processVersions", repo.getId() );
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
				retry.log( "processVersions", repo.getId() );
				return fn( error );
			}

			var releasesCb = this.parallel(),
				invalidGroup = this.group();
			releasesCb( null, releases.filter(function( release, i ) {
				if ( release ) {
					return true;
				}

				// TODO: gracefully handle duplicates in case of retry
				// track invalid tags so we don't process them on each update
				pluginsDb.addTag( repo.getId(), tags[ i ], invalidGroup() );
				return false;
			}));
		},

		// process the releases
		function( error, releases ) {
			if ( error ) {
				retry.log( "processVersions", repo.getId() );
				return fn( error );
			}

			if ( !releases.length ) {
				return fn( null );
			}

			var group = this.group();
			releases.forEach(function( release ) {
				processRelease( repo, release, group() );
			});
		},

		function( error ) {
			fn( error );
		}
	);
}

function processRelease( repo, release, fn ) {
	Step(
		// find out who owns this plugin
		// if there is no owner, then set the user as the owner
		function() {
			pluginsDb.getOrSetOwner( release.package.name, repo.userName, this );
		},

		// verify the user is the owner
		function( error, owner ) {
			if ( error ) {
				retry.log( "processRelease", repo.getId(), release.tag );
				return fn( error );
			}

			// the plugin is owned by someone else
			if ( owner !== repo.userName ) {
				// TODO: report error to user
				return fn( new UserError( "Plugin " + release.package.name + " is owned by " + owner + "." ) );
			}

			return owner;
		},

		// track the new release
		function( error, owner ) {
			pluginsDb.addRelease( repo.getId(), release, this );
		},

		// finished processing release
		function( error ) {
			if ( error ) {
				retry.log( "processRelease", repo.getId(), release.tag );
				return fn( error );
			}

			console.log( "Added " + release.package.name + " " + release.package.version + " to plugins DB" );
			fn( null, release );
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
				retry.log( "processMeta", repo.getId() );
				return fn( error );
			}

			if ( !package || !package.name ) {
				return fn( null );
			}

			pluginsDb.updatePlugin( package.name, repo.userName, {
				watchers: repo.watchers,
				forks: repo.forks
			}, this );
		},

		function( error ) {
			if ( error ) {
				retry.log( "processMeta", repo.getId() );
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
