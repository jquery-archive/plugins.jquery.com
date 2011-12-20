var semver = require( "semver" ),
	Step = require( "step" ),
	UserError = require( "./user-error" ),
	template = require( "./template" ),
	wordpress = require( "./wordpress" ),
	pluginsDb = require( "./pluginsdb" ),
	service = require( "./service" ),
	config = require( "./config" );





function generatePage( package, fn ) {
	template.get( "page", function( error, template ) {
		if ( error ) {
			return fn( error );
		}

		try {
			var output = template( package );
		} catch( error ) {
			return fn( error );
		}

		fn( null, output );
	});
}





function processPlugin( data, fn ) {
	var repo = service.getRepo( data );

	if ( !repo ) {
		return fn( new Error( "Could not parse request." ) );
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
		// get all new versions of the plugin
		function() {
			repo.getNewVersions( this );
		},

		// process the versions
		function( error, versions ) {
			if ( !versions.length ) {
				return fn( null );
			}

			var group = this.group();
			versions.forEach(function( version ) {
				processVersion( version, group() );
			});
		},

		// filter to successfully added versions
		function( error, versions ) {
			return versions.filter(function( version ) {
				return !!version;
			});
		},

		// determine which plugins and versions were added
		function( error, versions ) {
			var plugins = {};
			versions.forEach(function( package ) {
				var name = package.name;
				if ( !plugins[ name ] ) {
					plugins[ name ] = [];
				}
				plugins[ name ].push( semver.clean( package.version ) );
			});
			return plugins;
		},

		// process each plugin
		function( error, plugins ) {
			var group = this.group(),
				names = Object.keys( plugins );
			names.forEach(function( name ) {
				postProcessPlugin( name, plugins[ name ], group() );
			});
		},

		// flush redirect rules
		function( error ) {
			if ( error ) {
				return fn( error );
			}

			wordpress.flush( this );
		},

		function( error ) {
			if ( error ) {
				return fn( error );
			}

			fn( null );
		}
	);

	function processVersion( version, fn ) {
		Step(
			// find out who owns this plugin
			// if there is no owner, then set the user as the owner
			function() {
				pluginsDb.getOrSetOwner( version.package.name, repo.userName, this );
			},

			// verify the user is the owner
			function( error, owner ) {
				if ( error ) {
					// TODO: log failure for retry
					return fn( error );
				}

				// the plugin is owned by someone else
				if ( owner !== repo.userName ) {
					// TODO: report error to user
					return fn( new UserError( "Plugin " + version.package.name + " is owned by " + owner + "." ) );
				}

				return owner;
			},

			// track the new version
			function( error, owner ) {
				pluginsDb.addVersion( repo, version.package, this );
			},

			// generate the version page for WordPress
			function( error ) {
				if ( error ) {
					// TODO: log failure for retry
					return fn( error );
				}

				// add additional metadata and generate the plugin page
				var pluginData = Object.create( version.package );
				pluginData._downloadUrl = repo.downloadUrl( version.version );
				pluginData.url = repo.siteUrl;
				generatePage( pluginData, this );
			},

			// create the version page in WordPress
			function( error, page ) {
				if ( error ) {
					// TODO: log failure for retry
					return fn( error );
				}

				wordpress.addVersionedPlugin( version.package, page, version.date, this );
			},

			// finished processing version
			function( error ) {
				if ( error ) {
					// TODO: log failure for retry
					return fn( error );
				}

				console.log( "Added " + version.package.name + " " + version.package.version );
				fn( null, version.package );
			}
		);
	}

	function postProcessPlugin( plugin, newVersions, fn ) {
		function isStable( version ) {
			return /^\d+\.\d+\.\d+$/.test( version );
		}

		Step(
			// get existing versions
			function() {
				wordpress.getVersions( plugin, this );
			},

			// merge existing versions with new versions
			function( error, versions ) {
				if ( error ) {
					// TODO: log failure for retry
					return fn( error );
				}

				return versions.concat( newVersions );
			},

			// update WordPress to list new versions
			function( error, versions ) {
				var latest, filteredVersions;

				versions = versions.sort( semver.compare ).reverse();
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

				// TODO: set page parent
				wordpress.setVersions( plugin, filteredVersions, latest, this );
			},

			// finalize/publish versioned pages
			function( error ) {
				if ( error ) {
					// TODO: log failure for retry
					return fn( error );
				}

				wordpress.finalizePendingVersions( plugin, this );
			},

			function( error ) {
				if ( error ) {
					// TODO: log failure for retry
					return fn( error );
				}

				fn( null );
			}
		);
	}
}

function processMeta( repo, fn ) {
	var plugin;
	Step(
		function() {
			repo.getPackageJson( null, this );
		},

		function( error, package ) {
			if ( error ) {
				return fn( error );
			}

			plugin = package.name;
			pluginsDb.getOwner( plugin, this );
		},

		function( error, owner ) {
			if ( error ) {
				return fn( error );
			}

			// the plugin is not being tracked yet
			if ( !owner ) {
				return fn( null );
			}

			// the plugin is owned by someone else
			if ( owner !== repo.userName ) {
				// TODO: report error to user
				return fn( new UserError( "Plugin " + plugin + " is owned by " + owner + "." ) );
			}

			wordpress.updateMeta( plugin, {
				watchers: repo.watchers,
				forks: repo.forks
			}, this );
		},

		function( error ) {
			if ( error ) {
				return fn( error );
			}

			console.log( "Updated meta for " + plugin );
			fn( null );
		}
	);
}




processPlugin({
	url: "http://github.com/scottgonzalez/temp-jquery-foo",
	watchers: 25,
	forks: 3
}, function( error, data ) {
	wordpress.end()
	// TODO: log error to file
	if ( error ) {
		console.log( error, error.stack );
	}
});
