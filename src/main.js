var exec = require( "child_process" ).exec,
	fs = require( "fs" ),
	mkdirp = require( "mkdirp" ),
	semver = require( "semver" ),
	template = require( "./template" ),
	wordpress = require( "./wordpress" ),
	pluginsDb = require( "./pluginsdb" ),
	config = require( "./config" );





function dirname( path ) {
	path = path.split( "/" );
	path.pop();
	return path.join( "/" );
}

function createError( message, code, data ) {
	var error = new Error( message );
	if ( code ) {
		error.code = code;
	}
	if ( data ) {
		error.data = data;
	}
	return error;
}





var reGithubSsh = /^git@github\.com:([^/]+)\/(.+)\.git$/,
	reGithubHttp = /^\w+?:\/\/\w+@github\.com\/([^/]+)\/([^/]+)\.git$/,
	reGithubGit = /^git:\/\/github\.com\/([^/]+)\/([^/]+)\.git$/,
	reGithubSite = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)(\/.*)?$/;

function getRepoDetails( repo ) {
	var userName, repoName, partialPath,
		matches =
			reGithubSsh.exec( repo ) ||
			reGithubHttp.exec( repo ) ||
			reGithubGit.exec( repo ) ||
			reGithubSite.exec( repo );

	if ( matches ) {
		userName = matches[ 1 ];
		repoName = matches[ 2 ];
		partialPath = "/" + userName + "/" + repoName;
		return {
			userName: userName,
			repoName: repoName,
			url: "http://github.com" + partialPath,
			git: "git://github.com" + partialPath + ".git",
			downloadUrl: function( version ) {
				return "https://github.com" + partialPath + "/zipball/" + version
			},
			path: config.repoDir + partialPath
		};
	}

	return null;
}





function fetchPlugin( repoDetails, fn ) {
	// make sure the user's directory exists first
	mkdirp( dirname( repoDetails.path ), 0755, function( error ) {
		if ( error ) {
			return fn( error );
		}

		createOrUpdateRepo( repoDetails, fn );
	});
}

function createOrUpdateRepo( repoDetails, fn ) {
	fs.stat( repoDetails.path, function( error ) {
		// repo already exists
		if ( !error ) {
			return updateRepo( repoDetails, fn );
		}

		// error other than repo not existing
		if ( error.code !== "ENOENT" ) {
			return fn( error );
		}

		createRepo( repoDetails, fn );
	});
}

function createRepo( repoDetails, fn ) {
	exec( "git clone " + repoDetails.git + " " + repoDetails.path, function( error, stdout, stderr ) {
		if ( error ) {
			return fn( error );
		}

		// TODO: handle stderr

		getVersions( repoDetails, fn );
	});
}

function updateRepo( repoDetails, fn ) {
	getVersions( repoDetails, function( error, prevVersions ) {
		if ( error ) {
			return fn( error );
		}

		exec( "git fetch -t", { cwd: repoDetails.path },
			function( error, stdout, stderr ) {
				if ( error ) {
					return fn( error );
				}

				// TODO: handle stderr

				getVersions( repoDetails, function( error, versions ) {
					if ( error ) {
						return fn( error );
					}

					fn( null, versions.filter(function( version ) {
						return prevVersions.indexOf( version ) === -1;
					}));
				});
			});
	});
}





function getVersions( repoDetails, fn ) {
	exec( "git tag", { cwd: repoDetails.path }, function( error, stdout, stderr ) {
		if ( error ) {
			return fn( error );
		}

		var tags = stdout.split( "\n" );
		tags.pop();
		tags = tags.filter(function( version ) {
			// we allow a v prefix, but nothing else
			if ( version.charAt( 0 ) === "v" ) {
				version = version.substring( 1 );
			}

			// tag is not a clean version number
			if ( semver.clean( version ) !== version ) {
				return false;
			}

			return semver.valid( version );
		});
		fn( null, tags );
	});
}





function validateVersion( repoDetails, version, fn ) {
	getPackageJson( repoDetails, version, function( error, package ) {
		if ( error ) {
			return fn( error );
		}

		fn( null, {
			package: package,
			errors: validatePackageJson( package, version )
		});
	});
}

function getPackageJson( repoDetails, version, fn ) {
	exec( "git show " + version + ":package.json", { cwd: repoDetails.path }, function( error, stdout, stderr ) {
		// this will also result in an error being passed, so we check stderr first
		if ( stderr && stderr.substring( 0, 41 ) === "fatal: Path 'package.json' does not exist" ) {
			return fn( createError( "No package.json for " + version + ".", "NO_PACKAGE_JSON", {
				version: version
			}));
		}

		if ( error ) {
			return fn( error );
		}

		try {
			var package = JSON.parse( stdout );
		} catch( error ) {
			return fn( createError( "Could not parse package.json for " + version + ".", "INVALID_PACKAGE_JSON", {
				version: version
			}));
		}

		return fn( null, package );
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





function processPlugin( repo, fn ) {
	var repoDetails = getRepoDetails( repo.url );

	if ( !repoDetails ) {
		return fn( createError( "Could not parse '" + repoUrl + "'.", "URL_PARSE" ) );
	}

	fetchPlugin( repoDetails, function( error, versions ) {
		if ( error ) {
			return fn( error );
		}

		if ( !versions.length ) {
			return fn( null );
		}

		// TODO: track our actions so we can process metadata in done()
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
						// TODO: set contents of versionless post
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
			validateVersion( repoDetails, version, function( error, data ) {
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
		pluginsDb.getOrSetOwner( package.name, repoDetails.userName, function( error, owner ) {
			if ( error ) {
				// TODO: log failure for retry
				return fn( error );
			}

			// the plugin is owned by someone else
			if ( owner !== repoDetails.userName ) {
				// TODO: report error to user
				return fn( createError( "Plugin owned by someone else.", "NOT_OWNER", {
					owner: owner
				}));
			}

			pluginsDb.addVersion( repoDetails, package, function( error ) {
				if ( error ) {
					// TODO: log failure for retry
					return fn( error );
				}

				// add additional metadata and generate the plugin page
				var pluginData = Object.create( package );
				pluginData._downloadUrl = repoDetails.downloadUrl( version );
				pluginData.url = repoDetails.url;
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
