var exec = require( "child_process" ).exec,
	fs = require( "fs" ),
	template = require( "./template" ),
	semver = require( "../lib/semver" ),
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





function fetchPlugin( repoDetails, fn ) {
	createUserDirectory( repoDetails, function( error ) {
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

function createUserDirectory( repoDetails, fn ) {
	var path = dirname( repoDetails.path );
	fs.stat( path, function( error ) {
		// directory already exists
		if ( !error ) {
			return fn( null, path );
		}

		// error other than directory not existing
		if ( error.code !== "ENOENT" ) {
			return fn( error );
		}

		// TODO: proper mode
		require("mkdirp")( path, 0777, function( error ) {
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
		}).sort( semver.compare ).reverse();
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
	exec( "git checkout " + version, { cwd: repoDetails.path }, function( error, stdout, stderr ) {
		if ( error ) {
			return fn( error );
		}

		fs.readFile( repoDetails.path + "/package.json", "utf8", function( error, package ) {
			if ( error && error.code === "ENOENT" ) {
				return fn( createError( "No package.json for " + version + ".", "NO_PACKAGE_JSON", {
					version: version
				}));
			}

			if ( error ) {
				return fn( error );
			}

			try {
				package = JSON.parse( package );
			} catch( error ) {
				return fn( createError( "Could not parse package.json for " + version + ".", "INVALID_PACKAGE_JSON", {
					version: version
				}));
			}

			return fn( null, package );
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





function getAllPlugins( fn ) {
	fs.readdir( config.pluginsDir, function( error, repos ) {
		if ( error ) {
			return fn( error );
		}

		fn( null, repos );
	});
}

function process( repo, fn ) {
	var repoDetails = getRepoDetails( repo );
	fetchPlugin( repoDetails, function( error ) {
		if ( error ) {
			return fn( error );
		}

		getVersions( repoDetails, function( error, versions ) {
			if ( error ) {
				return fn( error );
			}

			getPackageJson( repoDetails, versions[ 0 ], function( error, package ) {
				if ( error ) {
					return fn( error );
				}

				generatePage( package, function( error, page ) {
					if ( error ) {
						return fn( error );
					}

					fn( null, {
						userName: repoDetails.user,
						pluginName: package.name,
						pluginTitle: package.title,
						content: page
					});
				});
			});
		});
	});
}

function processAll( repos ) {
	var length = repos.length - 1;

	function processOne( i ) {
		process( repos[ i ], function( error, data ) {
			if ( error ) {
				console.log( "error processing " + repos[ i ] );
				console.log( error );
			} else {
				console.log( "processed " + repos[ i ] );
				console.log( data );
			}
			if ( i < length ) {
				processOne( i + 1 );
			}
		});
	}

	processOne( 0 );
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
			url: "https://github.com" + partialPath,
			git: "git://github.com" + partialPath + ".git",
			path: config.repoDir + partialPath
		};
	}

	return null;
}

function pluginAlreadyExists( repoDetails, fn ) {
	fs.stat( repoDetails.path, function( error ) {
		// directory already exists
		if ( !error ) {
			return fn( null, true );
		}

		// error other than directory not existing
		if ( error.code !== "ENOENT" ) {
			return fn( error );
		}

		fn( null, false );
	});
}





function addPlugin( repoUrl, fn ) {
	var repoDetails = getRepoDetails( repoUrl );

	if ( !repoDetails ) {
		return fn( createError( "Could not parse '" + repoUrl + "'.", "URL_PARSE" ) );
	}

	function _pluginAlreadyExists( error, exists ) {
		if ( error ) {
			return fn( error );
		}

		if ( exists ) {
			return fn( createError( repoUrl + " already exists.", "ALREADY_EXISTS" ) );
		}

		fetchPlugin( repoDetails, _fetchPlugin );
	}

	function _fetchPlugin( error ) {
		if ( error ) {
			return fn( error );
		}

		getVersions( repoDetails, _getVersions );
	}

	function _getVersions( error, versions ) {
		if ( error ) {
			return fn( error );
		}

		if ( !versions.length ) {
			return fn( createError( "No semver tags.", "NO_SEMVER_TAGS" ) );
		}

		// TODO: add plugin to database
		var allErrors = [],
			mysql = new require( "mysql" ).createClient();
			mysql.host = config.dbHost;
			mysql.port = config.dbPort;
			mysql.user = config.dbUser;
			mysql.password = config.dbPassword;
			mysql.useDatabase( config.dbName );
		var postsTable = "wp_" + (config.siteId ? config.siteId + "_" : "") + "posts";
			//TODO: Make this slightly less destructive. Only slightly
			mysql.query("DELETE FROM " + postsTable + ";");
		function processVersion( version ) {
			if ( !version ) {
				mysql.end();
				return fn();
			}

			validateVersion( repoDetails, version, function( error, data ) {
				if ( error ) {
					return fn( error );
				}

				if ( data.errors.length ) {
					allErrors.concat( data.errors );
					return processVersion( versions.pop() );
				}

				_generatePage( data.package, function( error, data ) {
					console.log( data );
					mysql.query("INSERT INTO " + postsTable
						+ " ( post_name, post_title, post_content ) VALUES ( ?, ?, ?)",
						[ data.pluginName + "-" + data.version, data.pluginTitle, data.content ]
					);
					processVersion( versions.pop() );
				});
			});
		}

		processVersion( versions.pop() );
	}

	function _addPluginToDatabase( version, fn ) {
		getPackageJson( repoDetails, version, function( error, package ) {
			var fd = fs.createWriteStream( config.pluginsDir + "/" + package.name, { flags: "a", encoding: "utf8" } );
			fd.on( "open", function() {
				fd.write( package.name + " " + repoDetails.url + "\n" );
				fd.end();
			});
			fd.on( "error", function() {
				return fn( error );
			});
			fd.on( "close", function() {
				fn( null, package );
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

	pluginAlreadyExists( repoDetails, _pluginAlreadyExists );
}


addPlugin( "git://github.com/scottgonzalez/temp-jquery-foo.git", function( error, data ) {
	console.log( "error", error );
	console.log( "data", data );
});
return;

getAllPlugins(function( error, repos ) {
	if ( error ) {
		return console.log( "couldn't read plugins.txt" );
	}

	processAll([
		"git://github.com/scottgonzalez/temp-jquery-foo.git",
		"git://github.com/scottgonzalez/temp-jquery-bar.git"
	]);
});



// don't list pre-release versions that are older than latest stable
// list pre-release versions greater than latest stable, but don't let them become the latest
