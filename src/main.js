var semver = require( "semver" ),
	Step = require( "step" ),
	UserError = require( "./user-error" ),
	template = require( "./template" ),
	wordpress = require( "./wordpress" ),
	pluginsDb = require( "./pluginsdb" ),
	service = require( "./service" ),
	config = require( "./config" );





function validatePackageJson( package, version ) {
	var errors = [];

	if ( !package.name ) {
		errors.push( "Missing required field: name." );
	} else if ( package.name.charAt( 0 ) === "_" || package.name.charAt( 0 ) === "." ) {
		errors.push( "Name cannot start with an underscore or dot." );
	}

	if ( !package.version ) {
		errors.push( "Missing required field: version." );
	} else if ( package.version !== semver.clean( package.version ) ) {
		errors.push( "Package.json version (" + package.version + ") is invalid." );
	} else if ( package.version !== semver.clean( version ) ) {
		errors.push( "Package.json version (" + package.version + ") does not match tag (" + version + ")." );
	}

	if ( !package.title ) {
		errors.push( "Missing required field: title." );
	}

	if ( !package.author ) {
		errors.push( "Missing required field: author." );
	} else if ( !package.author.name ) {
		errors.push( "Missing required field: author.name." );
	}

	if ( !package.licenses ) {
		errors.push( "Missing required field: licenses." );
	} else if ( !package.licenses.length ) {
		errors.push( "There must be at least one license." );
	} else if ( package.licenses.filter(function( license ) { return !license.url; }).length ) {
		errors.push( "Missing required field: license.url." );
	}

	if ( !package.dependencies ) {
		errors.push( "Missing required field: dependencies." );
	} else if ( !package.dependencies.jquery ) {
		errors.push( "Missing required dependency: jquery." );
	}

	return errors;
}





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
		// get all new versions of the plugin
		function() {
			repo.getNewVersions( this );
		},

		// validate each version
		function( error, versions ) {
			if ( error ) {
				return fn( error );
			}

			if ( !versions.length ) {
				return fn( null );
			}

			var group = this.group();
			versions.forEach(function( version ) {
				validateVersion( version, group() );
			});
		},

		// filter to only valid versions
		function( error, versions ) {
			return versions.filter(function( version ) {
				return !!(version && version.package);
			});
		},

		// process the valid versions
		function( error, versions ) {
			if ( !versions.length ) {
				return fn();
			}

			var group = this.group();
			versions.forEach(function( version ) {
				processVersion( version.version, version.package, group() );
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

		// close connection to WordPress
		function( error ) {
			if ( error ) {
				return fn( error );
			}

			wordpress.end();
			fn( null );
		}
	);

	function validateVersion( version, fn ) {
		Step(
			// get the package.json
			function() {
				repo.getPackageJson( version, this );
			},

			// check if we found a package.json
			function( error, package ) {
				if ( error ) {
					if ( error.userError ) {
						// TODO: report error to user
					} else {
						// TODO: log error for retry
					}
					return fn( error );
				}

				if ( !package ) {
					return fn( null );
				}

				return package;
			},

			// validate package.json
			function( error, package ) {
				var errors = validatePackageJson( package, version );

				if ( errors.length ) {
					// TODO: report errors to user
					return fn( null );
				}

				fn( null, {
					version: version,
					package: package
				});
			}
		);
	}

	function processVersion( version, package, fn ) {
		Step(
			// find out who owns this plugin
			// if there is no owner, then set the user as the owner
			function() {
				pluginsDb.getOrSetOwner( package.name, repo.userName, this );
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
					return fn( new UserError( "Plugin " + package.name + " is owned by " + owner + "." ) );
				}

				return owner;
			},

			// track the new version
			function( error, owner ) {
				pluginsDb.addVersion( repo, package, this );
			},

			// generate the version page for WordPress
			function( error ) {
				if ( error ) {
					// TODO: log failure for retry
					return fn( error );
				}

				// add additional metadata and generate the plugin page
				var pluginData = Object.create( package );
				pluginData._downloadUrl = repo.downloadUrl( version );
				pluginData.url = repo.siteUrl;
				pluginData.forks = repo.forks;
				pluginData.watchers = repo.watchers;
				generatePage( pluginData, this );
			},

			// create the version page in WordPress
			function( error, page ) {
				if ( error ) {
					// TODO: log failure for retry
					return fn( error );
				}

				wordpress.addVersionedPlugin( version, package, page, this );
			},

			// finished processing version
			function( error ) {
				if ( error ) {
					// TODO: log failure for retry
					return fn( error );
				}

				console.log( "Added " + package.name + " " + package.version );
				fn( null, package );
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





processPlugin({
	url: "http://github.com/scottgonzalez/temp-jquery-foo",
	watchers: 25,
	forks: 3
}, function( error, data ) {
	// TODO: log error to file
	if ( error ) {
		console.log( error, error.stack );
	}
});
