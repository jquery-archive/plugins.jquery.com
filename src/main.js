var exec = require( "child_process" ).exec,
	fs = require( "fs" ),
	mkdirp = require( "mkdirp" ),
	template = require( "./template" ),
	semver = require( "semver" ),
	wordpress = require( "./wordpress" )
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

		createOrUpdateRepo( repoDetails, function( error ) {
			if ( error ) {
				return fn( error );
			}

			fn( null );
		});
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

		fn( null );
	});
}

function updateRepo( repoDetails, fn ) {
	exec( "git fetch -t && git reset --hard origin", { cwd: repoDetails.path }, function( error, stdout, stderr ) {
		if ( error ) {
			return fn( error );
		}

		// TODO: handle stderr

		fn( null );
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
	} else if ( semver.clean( package.version ) !== semver.clean( version ) ) {
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

	// TODO: validate repo (must match actual GitHub repo)

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

	fetchPlugin( repoDetails, function( error ) {
		if ( error ) {
			return fn( error );
		}

		getVersions( repoDetails, _getVersions );
	});

	function _getVersions( error, versions ) {
		if ( error ) {
			return fn( error );
		}

		if ( !versions.length ) {
			return fn( createError( "No semver tags.", "NO_SEMVER_TAGS" ) );
		}

		// TODO: add plugin to database
		var allErrors = [],
			waiting = versions.length;

		function progress() {
			waiting--;
			if ( !waiting ) {
				done();
			}
		}

		function done() {
			// TODO: update versionless post to have latest version
			// TODO: update metadata in WP
			// - don't list pre-release versions that are older than latest stable
			// - list pre-release versions greater than latest stable
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
					allErrors.concat( data.errors );
					return progress();
				}

				// TODO: verify user is owner of plugin

				data.package._downloadUrl = repoDetails.downloadUrl( version );
				_generatePage( data.package, function( error, data ) {
					if ( error ) {
						// TODO: log failure for retry
						return progress();
					}

					wordpress.addVersionedPlugin( data, function( error ) {
						if ( error ) {
							// TODO: log failure for retry
						}
						console.log( "Added " + data.pluginName + " " + data.version );
						progress();
					});
				});
			});
		});
	}

	function _generatePage( package, fn ) {
		generatePage( package, function( error, page ) {
			if ( error ) {
				return fn( error );
			}

			fn( null, {
				userName: repoDetails.userName,
				pluginName: package.name,
				pluginTitle: package.title,
				content: page,
				version: semver.clean( package.version )
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
