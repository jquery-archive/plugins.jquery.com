var fs = require( "fs" ),
	exec = require( "child_process" ).exec,
	semver = require( "semver" ),
	Step = require( "step" ),
	mkdirp = require( "mkdirp" ),
	service = require( "../service" );

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

function repoFromHook( data ) {
	var matches = reGithubUrl.exec( data.url ),
		repo = new GithubRepo( matches[ 1 ], matches[ 2 ] );

	repo.forks = data.forks;
	repo.watchers = data.watchers;
	return repo;
}

function GithubRepo( userName, repoName ) {
	if ( arguments.length === 1 ) {
		return repoFromHook( userName );
	}

	var partialPath = "/" + userName + "/" + repoName;

	this.userName = userName;
	this.repoName = repoName;
	this.siteUrl = "http://github.com" + partialPath;
	this.sourceUrl = "git://github.com" + partialPath + ".git";
}

GithubRepo.test = function( data ) {
	return reGithubUrl.test( data.url );
};

// service interface
extend( GithubRepo.prototype, new service.Repo );
extend( GithubRepo.prototype, {
	downloadUrl: function( version ) {
		return this.siteUrl + "/zipball/" + version;
	},

	getTags: function( fn ) {
		var repo = this;
		Step(
			// fetch the repo
			function() {
				repo.fetchRepo( this );
			},

			// get the tags
			function( error ) {
				if ( error ) {
					return fn( error );
				}

				exec( "git tag", { cwd: repo.getPath() }, this );
			},

			// parse the tags
			function( error, stdout ) {
				if ( error ) {
					return fn( error );
				}

				var tags = stdout.split( "\n" );
				tags.pop();
				fn( null, tags );
			}
		);
	},

	_getPackageJson: function( version, fn ) {
		version = version || "master";
		exec( "git show " + version + ":package.json", { cwd: this.getPath() }, function( error, stdout, stderr ) {
			// this will also result in an error being passed, so we check stderr first
			if ( stderr && stderr.substring( 0, 41 ) === "fatal: Path 'package.json' does not exist" ) {
				return fn( null, null );
			}

			if ( error ) {
				return fn( error );
			}

			fn( null, stdout );
		});
	},

	getReleaseDate: function( tag, fn ) {
		exec( "git log --pretty='%cD' -1 " + tag, { cwd: this.getPath() }, function( error, stdout ) {
			if ( error ) {
				return fn( error );
			}

			fn( null, new Date( stdout ) );
		});
	}
});

// internals
extend( GithubRepo.prototype, {
	fetchRepo: function( fn ) {
		var repo = this;

		Step(
			// make sure the user directory exists
			function() {
				mkdirp( dirname( repo.getPath() ), 0755, this );
			},

			// check if the repo already exists
			function( error ) {
				if ( error ) {
					return fn( error );
				}

				fs.stat( repo.getPath(), this );
			},

			// create or update the repo
			function( error ) {
				// repo already exists
				if ( !error ) {
					exec( "git fetch -t", { cwd: repo.getPath() }, this );
				}

				// error other than repo not existing
				if ( error.code !== "ENOENT" ) {
					return fn( error );
				}

				exec( "git clone " + repo.sourceUrl + " " + repo.getPath(), this );
			},

			function( error ) {
				fn( error );
			}
		);
	}
});

service.register( "github", GithubRepo );
