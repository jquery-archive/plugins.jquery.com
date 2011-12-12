var semver = require( "semver" ),
	template = require( "./template" ),
	wordpress = require( "./wordpress" ),
	pluginsDb = require( "./pluginsdb" ),
	service = require( "./service.js" ),
	config = require( "./config" );





function validateVersion( repo, version, fn ) {
	repo.getPackageJson( version, function( error, package ) {
		if ( error ) {
			return fn( error );
		}

		fn( null, {
			package: package,
			errors: validatePackageJson( package, version )
		});
	});
}

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

	repo.getNewVersions(function( error, versions ) {
		if ( error ) {
			return fn( error );
		}

		if ( !versions.length ) {
			return fn( null );
		}

		var plugins = {},
			waiting = versions.length;

		function progress() {
			waiting--;
			if ( !waiting ) {
				done();
			}
		}

		// TODO: clean up this code
		function done() {
			for ( var plugin in plugins ) {
				(function( plugin ) {
					var latest, filteredVersions,
						newVersions = plugins[ plugin ];
					wordpress.getVersions( plugin, function( error, versions ) {
						if ( error ) {
							// TODO: log failure for retry
							return _done();
						}

						versions = versions.concat( newVersions )
							.sort( semver.compare ).reverse();
						function isStable( version ) {
							return /^\d+\.\d+\.\d+$/.test( version );
						}
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
						wordpress.setVersions( plugin, filteredVersions, latest, function( error ) {
							if ( error ) {
								// TODO: log failure for retry
							}

							return _done();
						});
					});
				})( plugin );
			}
		}

		function _done() {
			wordpress.end();
			fn();
		}

		versions.forEach(function( version ) {
			validateVersion( repo, version, function( error, data ) {
				if ( error ) {
					// TODO: log failure for retry
					return progress();
				}

				if ( data.errors.length ) {
					// TODO: report errors to user
					return progress();
				}

				_addPluginVersion( version, data.package, function( error ) {
					if ( error ) {
						return progress();
					}

					var name = data.package.name;
					if ( !plugins[ name ] ) {
						plugins[ name ] = [];
					}
					plugins[ name ].push( semver.clean( version ) );
					progress();
				});
			});
		});
	});

	function _addPluginVersion( version, package, fn ) {
		// find out who owns this plugin
		// if there is no owner, then set the user as the owner
		pluginsDb.getOrSetOwner( package.name, repo.userName, function( error, owner ) {
			if ( error ) {
				// TODO: log failure for retry
				return fn( error );
			}

			// the plugin is owned by someone else
			if ( owner !== repo.userName ) {
				// TODO: report error to user
				return fn( new Error( "Plugin owned by someone else." ) );
			}

			pluginsDb.addVersion( repo, package, function( error ) {
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
				generatePage( pluginData, function( error, page ) {
					if ( error ) {
						// TODO: log failure for retry
						return fn( error );
					}

					wordpress.addVersionedPlugin( version, package, page, function( error ) {
						if ( error ) {
							// TODO: log failure for retry
							return fn( error );
						}
						console.log( "Added " + package.name + " " + package.version );
						fn();
					});
				});
			});
		});
	}
}





// TODO: track watchers and forks
processPlugin({
	url: "http://github.com/scottgonzalez/temp-jquery-foo",
	watchers: 25,
	forks: 3
}, function( error, data ) {
	// TODO: log error to file
	if ( error ) {
		console.log( error );
	}
});
