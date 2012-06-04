var fs = require( "fs" ),
	semver = require( "semver" ),
	Step = require( "step" ),
	wordpress = require( "./wordpress" ),
	pluginsDb = require( "./pluginsdb" ),
	service = require( "./service" ),
	logger = require( "./logger" );

process.on( "uncaughtException", function( error ) {
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
					type: "page",
					status: "publish",
					title: package.title,
					content: package.description,
					date: date,
					termNames: {
						// TODO: Should we use a custom taxonomy name?
						post_tag: package.keywords.map(function( keyword ) {
							return keyword.toLowerCase();
						})
					},
					customFields: [
						{ key: "download_url", value: repo.downloadUrl( tag ) },
						{ key: "repo_url", value: repo.siteUrl },
						{ key: "package_json", value: JSON.stringify( package ) }
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

		return {
			all: versions,
			listed: listed,
			latest: latest
		};
	}

	Step(
		function getPageData() {
			getPageDetails( this.parallel() );
			pluginsDb.getMeta( package.name, this.parallel() );
			wordpress.authenticatedCall( "jq-pjc.getPostForPlugin", package.name, this.parallel() );
		},

		function updateMainPage( error, pageDetails, repoMeta, existingPage ) {
			if ( error ) {
				return fn( error );
			}

			this.parallel()( null, pageDetails );
			var versions = getVersions( existingPage ),
				mainPageCallback = this.parallel(),
				existingCustomFields = existingPage && existingPage.customFields ?
					existingPage.customFields : [],
				mainPage = Object.create( pageDetails );

			mainPage.name = package.name;
			mainPage.customFields = mainPage.customFields.concat([
				{ key: "versions", value: JSON.stringify( versions.listed ) },
				{ key: "latest", value: versions.latest },
				{ key: "watchers", value: repoMeta.watchers },
				{ key: "forks", value: repoMeta.forks }
			]);
			mainPage.customFields = mergeCustomFields( existingCustomFields, mainPage.customFields );

			if ( !existingPage ) {
				wordpress.newPost( mainPage, mainPageCallback );
			} else {
				wordpres.editPost( existingPage.id, mainPage, function( error ) {
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

			pageDetails.name = package.version;
			pageDetails.parent = mainPageId;
			wordpress.newPost( pageDetails, this.parallel() );
		},

		function( error, versions, latest ) {
			if ( error ) {
				return fn( error );
			}

			logger.log( "Added " + package.name + " v" + package.version + " to WordPress" );
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
	logger.error( "Error updating WordPress: " + error.stack );
});
