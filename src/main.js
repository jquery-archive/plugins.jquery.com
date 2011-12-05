var exec = require( "child_process" ).exec,
	fs = require( "fs" ),
	template = require( "./template" ),
	semver = require( "../lib/semver" ),
	config = require( "./config" ),
	pluginsFile = __dirname + "/../plugins.txt";

function dirname( path ) {
	path = path.split( "/" );
	path.pop();
	return path.join( "/" );
}

// TODO: this needs a more descriptive name
function getPlugin( repoDetails, fn ) {
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
	fs.stat( path, function( error, stat ) {
		// directory already exists
		if ( !error ) {
			return fn( null, path );
		}

		// error other than directory not existing
		if ( error.code !== "ENOENT" ) {
			return fn( error );
		}

		// TODO: proper mode
		fs.mkdir( path, 0777, function( error ) {
			if ( error ) {
				return fn( error );
			}
			fn( null );
		});
	});
}

function createOrUpdateRepo( repoDetails, fn ) {
	fs.stat( repoDetails.path, function( error, stat ) {
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

// TODO: return parsed package.json along with version
function greatestValidVersion( repoDetails, fn ) {
	getVersions( repoDetails.path, function( error, versions ) {
		if ( error ) {
			return fn( error );
		}

		// TODO: what do we want to do here?
		if ( !versions.length ) {
			console.log( "no versions" );
			return fn( new Error() );
		}

		// TODO: loop over versions
		var version = versions[ 0 ];
		getPackageJson( repoDetails.path, version, function( error, package ) {
			if ( error ) {
				return fn( error );
			}

			var errors = validatePackageJson( package );
			if ( errors.length ) {
				// TODO: what do we want to do here?
				console.log( errors );
				return fn( new Error() );
			}

			fn( null, version );
		});
	});
}

function getVersions( path, fn ) {
	exec( "git tag", { cwd: path }, function( error, stdout, stderr ) {
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

function getPackageJson( path, version, fn ) {
	exec( "git checkout " + version, { cwd: path }, function( error, stdout, stderr ) {
		if ( error ) {
			return fn( error );
		}

		fs.readFile( path + "/package.json", "utf8", function( error, package ) {
			if ( error ) {
				console.log( "ERROR" );
				return fn( error );
			}

			return fn( null, package );
		});
	});
}

function validatePackageJson( package ) {
	var errors = [];

	try {
		package = JSON.parse( package );
	} catch( error ) {
		errors.push[ "Invalid JSON." ];
		return errors;
	}

	if ( !package.name ) {
		errors.push( "Missing required field: name." );
	}

	// TODO: full validation

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

function process( repo, fn ) {
	var repoDetails = getRepoDetails( repo );
	getPlugin( repoDetails, function( error ) {
		if ( error ) {
			return fn( error );
		}

		greatestValidVersion( repoDetails, function( error, version ) {
			if ( error ) {
				return fn( error );
			}

			getPackageJson( repoDetails.path, version, function( error, package ) {
				if ( error ) {
					return fn( error );
				}

				package = JSON.parse( package );
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
























function getAllPlugins( fn ) {
	fs.readFile( pluginsFile, "utf8", function( error, repos ) {
		if ( error ) {
			return fn( error );
		}

		fn( null, repos.trim().split( "\n" ).map(function( repo ) {
			return repo.substring( repo.indexOf( " " ) + 1, repo.length );
		}));
	});
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

function pluginAlreadyExists( plugin, fn ) {
	getAllPlugins(function( error, plugins ) {
		if ( error ) {
			fn( error );
		}

		fn( null, plugins.indexOf( plugin ) !== -1 );
	});
}







function addPlugin( repoUrl, fn ) {
	var repoDetails = getRepoDetails( repoUrl );

	if ( !repoDetails ) {
		return fn( new Error( "Could not parse '" + repoUrl + "'." ) );
	}

	function _pluginAlreadyExists( error, exists ) {
		if ( error ) {
			return fn( error );
		}

		if ( exists ) {
			return fn( new Error( repoUrl + " already exists." ) );
		}

		getPlugin( repoDetails, _getPlugin );
	}

	function _getPlugin( error ) {
		if ( error ) {
			return fn( error );
		}

		greatestValidVersion( repoDetails, _greatestValidVersion );
	}

	function _greatestValidVersion( error, version ) {
		if ( error ) {
			return fn( error );
		}

		_addPluginToDatabase( version );
	}

	function _addPluginToDatabase( version ) {
		getPackageJson( repoDetails.path, version, function( error, package ) {
			package = JSON.parse( package );
			var fd = fs.createWriteStream( pluginsFile, { flags: "a", encoding: "utf8" } );
			fd.on( "open", function() {
				fd.write( package.name + " " + repoDetails.url + "\n" );
				fd.end();
			});
			fd.on( "error", function() {
				return fn( error );
			});
			fd.on( "close", function() {
				_generatePage( version, package );
			});
		});
	}

	function _generatePage( version, package ) {
		generatePage( package, function( error, page ) {
			if ( error ) {
				return fn( error );
			}

			fn( null, {
				userName: repoDetails.userName,
				pluginName: package.name,
				pluginTitle: package.title,
				content: page
			});
		});
	}

	pluginAlreadyExists( repoDetails.url, _pluginAlreadyExists );
}


// normalize repo url
// check if it exists
	// yes = just bail
// get repo
// get versions
	// no semver tags = report error
// check greatest semver tag for package.json
	// no package.json = report error
// validate package.json
	// invalid = report error
// add to plugins.txt
// build page
// update WP

addPlugin( "git://github.com/scottgonzalez/temp-jquery-foo.git", function( error, data ) {
	console.log( "error", error );
	console.log( "data", data );
});
return;

getAllPlugins(function( error, repos ) {
	if ( error ) {
		return console.log( "couldn't read plugins.txt" );
	}

	processAll( repos );
});


// create a repo for just the plugins
// - safer for updates (race condition with commits could hose ability to add plugins)
// - create a separate file for each plugin, with the name of the plugin as the filename
//   - elimintes race conditions of adds
//   - allows us to store structured data and still have fast file access with low memory at scale
