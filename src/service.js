var fs = require( "fs" ),
	exec = require( "child_process" ).exec,
	semver = require( "semver" ),
	mkdirp = require( "mkdirp" ),
	config = require( "./config" );

var reGithubUrl = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)(\/.*)?$/;

function dirname( path ) {
	path = path.split( "/" );
	path.pop();
	return path.join( "/" );
}

function extend( a, b ) {
	for ( var prop in b ) {
		a[ prop ] = b[ prop ];
	}
}

function GithubRepo( data ) {
	var matches = reGithubUrl.exec( data.url ),
		userName = matches[ 1 ],
		repoName = matches[ 2 ],
		partialPath = "/" + userName + "/" + repoName;

	this.userName = userName;
	this.repoName = repoName;
	this.siteUrl = "http://github.com" + partialPath;
	this.sourceUrl = "git://github.com" + partialPath + ".git";
	this.path = config.repoDir + partialPath;
	this.forks = data.forks;
	this.watchers = data.watchers;
}

// service interface
extend( GithubRepo.prototype, {
	service: "github",

	downloadUrl: function( version ) {
		return this.siteUrl + "/zipball/" + version;
	},

	getNewVersions: function( fn ) {
		var repo = this;
		// make sure the user's directory exists first
		mkdirp( dirname( this.path ), 0755, function( error ) {
			if ( error ) {
				return fn( error );
			}

			repo.createOrUpdateRepo( fn );
		});
	},

	getPackageJson: function( version, fn ) {
		exec( "git show " + version + ":package.json", { cwd: this.path }, function( error, stdout, stderr ) {
			// this will also result in an error being passed, so we check stderr first
			if ( stderr && stderr.substring( 0, 41 ) === "fatal: Path 'package.json' does not exist" ) {
				return fn( new Error( "No package.json for " + version + "." ) );
			}

			if ( error ) {
				return fn( error );
			}

			try {
				var package = JSON.parse( stdout );
			} catch( error ) {
				return fn( new Error( "Could not parse package.json for " + version + "." ) );
			}

			return fn( null, package );
		});
	}
});

// internals
extend( GithubRepo.prototype, {
	createOrUpdateRepo: function( fn ) {
		var repo = this;
		fs.stat( this.path, function( error ) {
			// repo already exists
			if ( !error ) {
				return repo.updateRepo( fn );
			}

			// error other than repo not existing
			if ( error.code !== "ENOENT" ) {
				return fn( error );
			}

			repo.createRepo( fn );
		});
	},

	createRepo: function( fn ) {
		var repo = this;
		exec( "git clone " + this.sourceUrl + " " + this.path, function( error, stdout, stderr ) {
			if ( error ) {
				return fn( error );
			}

			// TODO: handle stderr

			repo.getVersions( fn );
		});
	},

	updateRepo: function( fn ) {
		var repo = this;
		this.getVersions(function( error, prevVersions ) {
			if ( error ) {
				return fn( error );
			}

			exec( "git fetch -t", { cwd: repo.path }, function( error, stdout, stderr ) {
				if ( error ) {
					return fn( error );
				}

				// TODO: handle stderr

				repo.getVersions(function( error, versions ) {
					if ( error ) {
						return fn( error );
					}

					fn( null, versions.filter(function( version ) {
						return prevVersions.indexOf( version ) === -1;
					}));
				});
			});
		});
	},

	getVersions: function( fn ) {
		exec( "git tag", { cwd: this.path }, function( error, stdout, stderr ) {
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
});





module.exports = {
	getRepo: function( data ) {
		// TODO: #4 - Support other code-sharing sites besides GitHub
		if ( !reGithubUrl.test( data.url ) ) {
			return null;
		}

		return new GithubRepo( data );
	}
};
