var Step = require( "step" ),
	pluginsDb = require( "./pluginsdb" ),
	retry = require( "./retrydb" ),
	logger = require( "./logger" );

function processHook( repo, fn ) {
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
				logger.log( "No tags to process for " + repo.id );
				return fn( null );
			}

			logger.log( "Processing", repo.id, tags );
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
				logger.log( "No valid releases for " + repo.id );
				return fn( null );
			}

			var group = this.group();
			releases.forEach(function( release ) {
				for ( var file in release.manifests ) {
					processRelease( repo, release.tag, file, release.manifests[ file ], group() );
				}
			});
		},

		function( error ) {
			fn( error );
		}
	);
}

function processRelease( repo, tag, file, manifest, fn ) {
	Step(
		// find out who owns this plugin
		// if there is no owner, then set the user as the owner
		function() {
			pluginsDb.getOrSetOwner( manifest.name, repo.userId, repo.id, this );
		},

		// verify the user is the owner
		function( error, owner ) {
			if ( error ) {
				retry.log( "processRelease", repo.id, tag, file );
				return fn( error );
			}

			// the plugin is owned by someone else
			if ( owner !== repo.userId ) {
				logger.log( repo.userId + " attempted to add " + manifest.name + " which is owned by " + owner );
				repo.informOtherOwner({
					tag: tag,
					name: manifest.name,
					owner: owner
				});

				// track the tag so we don't process it on the next update
				pluginsDb.addTag( repo.id, tag, function( error ) {
					if ( error ) {
						return fn( error );
					}

					fn( null, null );
				});
				return;
			}

			return owner;
		},

		// track the new release
		function( /*error, owner*/ ) {
			pluginsDb.addRelease( repo.id, tag, file, manifest, this );
		},

		// finished processing release
		function( error ) {
			if ( error ) {
				retry.log( "processRelease", repo.id, tag, file );
				return fn( error );
			}

			repo.informSuccess({ name: manifest.name, version: manifest.version });
			logger.log( "Added " + manifest.name + " v" + manifest.version + " to plugins DB" );
			fn( null, manifest );
		}
	);
}

function processMeta( repo, fn ) {
	Step(
		function() {
			pluginsDb.updateRepoMeta( repo.id, {
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
