var fs = require( "fs" ),
	semver = require( "semver" ),
	Step = require( "step" ),
	wordpress = require( "../lib/wordpress" ),
	pluginsDb = require( "../lib/pluginsdb" ),
	service = require( "../lib/service" ),
	logger = require( "../lib/logger" );

process.on( "uncaughtException", function( error ) {
	logger.error( "Uncaught exception: " + error.stack );
});

function isStable( version ) {
	return (/^\d+\.\d+\.\d+$/).test( version );
}

var actions = {};

actions.addRelease = function( data, fn ) {
	var repo = service.getRepoById( data.repo ),
		manifest = data.manifest,
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
					type: "jquery_plugin",
					status: "publish",
					title: manifest.title,
					content: manifest.description,
					date: date,
					termNames: {
						post_tag: manifest.keywords.map(function( keyword ) {
							return keyword.toLowerCase();
						})
					},
					customFields: [
						{ key: "download_url", value: manifest.download || repo.downloadUrl( tag ) },
						{ key: "repo_url", value: repo.siteUrl },
						{ key: "manifest", value: JSON.stringify( manifest ) }
					]
				});
			}
		);
	}

	function mergeCustomFields( existing, current ) {
		current.forEach(function( customField ) {
			// if the field already exists, update the value
			for ( var i = 0, length = existing.length - 1; i < length; i++ ) {
				if ( existing[ i ].key === customField.key ) {
					existing[ i ].value = customField.value;
					return;
				}
			}

			// the field doesn't exist, so add it
			existing.push( customField );
		});

		return existing;
	}

	function getVersions( page ) {
		var versions, listed, latest;

		versions = (page.customFields || []).filter(function( customField ) {
			return customField.key === "versions";
		});
		versions = versions.length ? JSON.parse( versions[ 0 ].value ) : [];

		listed = versions
			.concat( manifest.version )
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

		return {
			all: versions,
			listed: listed,
			latest: latest
		};
	}

	Step(
		function getPageData() {
			getPageDetails( this.parallel() );
			pluginsDb.getMeta( manifest.name, this.parallel() );
			wordpress.getPostForPlugin( manifest.name, this.parallel() );
		},

		function updateMainPage( error, pageDetails, repoMeta, existingPage ) {
			if ( error ) {
				return fn( error );
			}

			this.parallel()( null, pageDetails );
			var versions = getVersions( existingPage ),
				mainPageCallback = this.parallel(),
				existingCustomFields = existingPage.customFields || [],
				mainPage = {
					customFields: existingCustomFields
				};

			// The main page starts as an empty object so that publishing a new
			// version which is not the latest version only updates the metadata
			// of the main page. If the new version is the latest, then use the
			// main page is constructed from the new version since pretty much
			// anything can change between versions.
			if ( versions.latest === manifest.version ) {
				mainPage = Object.create( pageDetails );
				mainPage.name = manifest.name;
				mainPage.customFields = mergeCustomFields(
					existingCustomFields, pageDetails.customFields );
			}

			// Always update the metadata for the main page
			mainPage.customFields = mergeCustomFields( mainPage.customFields, [
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

		function( error, versions, latest ) {
			if ( error ) {
				return fn( error );
			}

			logger.log( "Added " + manifest.name + " v" + manifest.version + " to WordPress" );
			fn( null );
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
			fs.writeFile( "last-action", action.id, this.parallel() );
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
	}
});

// Let the current action finish, then stop processing and exit
process.on( "SIGINT", function() {
	processActionsSince = function( actionId, fn ) {
		fn( null );
	};
});
