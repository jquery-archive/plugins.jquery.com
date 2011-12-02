var exec = require( "child_process" ).exec,
	fs = require( "fs" ),
	template = require( "./template" ),
	semver = require( "../lib/semver" ),
	config = require( "./config" );

function getPackage( url, fn ) {
	var packageInfo = parsePackage( url ),
		repoUrl = "git://github.com/" + packageInfo.user + "/" + packageInfo.repo + ".git";

	createUserDirectory( packageInfo.user, function( error, path ) {
		if ( error ) {
			return fn( error );
		}

		createOrUpdateRepo( repoUrl, path + "/" + packageInfo.repo, function( error, path ) {
			if ( error ) {
				return fn( error );
			}

			fn( null, {
				user: packageInfo.user,
				repo: packageInfo.repo,
				path: path
			});
		});
	});
}

function parsePackage( url ) {
	var parts = url.match( /\/\/github\.com\/([^/]+)\/([^/]+)/ );
	return {
		user: parts[ 1 ],
		repo: parts[ 2 ]
	};
}

function createUserDirectory( user, fn ) {
	var path = config.repoDir + "/" + user;
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
			fn( null, path );
		});
	});
}

function createOrUpdateRepo( url, path, fn ) {
	fs.stat( path, function( error, stat ) {
		// repo already exists
		if ( !error ) {
			return updateRepo( path, fn );
		}

		// error other than repo not existing
		if ( error.code !== "ENOENT" ) {
			return fn( error );
		}

		createRepo( url, path, fn );
	});
}

function createRepo( url, path, fn ) {
	exec( "git clone " + url + " " + path, function( error, stdout, stderr ) {
		if ( error ) {
			return fn( error );
		}

		fn( null, path );
	});
}

function updateRepo( path, fn ) {
	exec( "git fetch -t && git reset --hard origin", { cwd: path }, function( error, stdout, stderr ) {
		if ( error ) {
			return fn( error );
		}

		fn( null, path );
	});
}

function greatestValidVersion( path, fn ) {
	getVersions( path, function( error, versions ) {
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
		getPackageJson( path, version, function( error, package ) {
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
	getPackage( repo, function( error, packageInfo ) {
		if ( error ) {
			return fn( error );
		}

		greatestValidVersion( packageInfo.path, function( error, version ) {
			if ( error ) {
				return fn( error );
			}

			getPackageJson( packageInfo.path, version, function( error, package ) {
				if ( error ) {
					return fn( error );
				}

				package = JSON.parse( package );
				generatePage( package, function( error, page ) {
					if ( error ) {
						return fn( error );
					}

					fn( null, {
						userName: packageInfo.user,
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

fs.readFile( __dirname + "/../plugins.md", "utf8", function( error, repos ) {
	if ( error ) {
		return console.log( "couldn't read plugins.md" );
	}

	processAll( repos.trim().split( "\n" ) );
});
