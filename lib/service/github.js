var fs = require( "fs" ),
	querystring = require( "querystring" ),
	exec = require( "child_process" ).exec,
	semver = require( "semver" ),
	Step = require( "step" ),
	mkdirp = require( "mkdirp" ),
	service = require( "../service" );

var reGithubUrl = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(\/.*)?$/;

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
	var matches = reGithubUrl.exec( data.repository.url ),
		repo = new GithubRepo( matches[ 1 ], matches[ 2 ] );

	repo.forks = data.repository.forks;
	repo.watchers = data.repository.watchers;
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

	service.Repo.call( this );
}

GithubRepo.test = function( data ) {
	try {
		data = querystring.parse( data );
		data = JSON.parse( data.payload );
	} catch( error ) {
		return null;
	}

	if ( reGithubUrl.test( data.repository && data.repository.url ) ) {
		return data;
	}

	return null;
};

// service interface
extend( GithubRepo.prototype, new service.Repo() );
extend( GithubRepo.prototype, {
	downloadUrl: function( version ) {
		return this.siteUrl + "/zipball/" + version;
	},

	getTags: function( fn ) {
		var repo = this;
		Step(
			// fetch the repo
			function() {
				repo.fetch( this );
			},

			// get the tags
			function( error ) {
				if ( error ) {
					return fn( error );
				}

				exec( "git tag", { cwd: repo.path }, this );
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

	getManifestFiles: function( tag, fn ) {
		exec( "git ls-tree " + tag + " --name-only", { cwd: this.path }, function( error, stdout, stderr ) {
			if ( error ) {
				return fn( error );
			}

			// filter to *.jquery.json
			fn( null, stdout.split( "\n" ).filter(function( file ) {
				return file.indexOf( ".jquery.json" ) > 0;
			}));
		});
	},

	_getManifest: function( version, file, fn ) {
		version = version || "master";
		exec( "git show " + version + ":" + file, { cwd: this.path }, function( error, stdout, stderr ) {
			// this will also result in an error being passed, so we check stderr first
			if ( stderr && stderr.substring( 0, 11 ) === "fatal: Path" ) {
				return fn( null, null );
			}

			if ( error ) {
				return fn( error );
			}

			fn( null, stdout );
		});
	},

	getReleaseDate: function( tag, fn ) {
		exec( "git log --pretty='%cD' -1 " + tag, { cwd: this.path }, function( error, stdout ) {
			if ( error ) {
				return fn( error );
			}

			fn( null, new Date( stdout ) );
		});
	},

	restore: function( fn ) {
		this.fetch( fn );
	}
});

// internals
extend( GithubRepo.prototype, {
	fetch: function( fn ) {
		var repo = this;

		Step(
			// make sure the user directory exists
			function() {
				mkdirp( dirname( repo.path ), "0755", this );
			},

			// check if the repo already exists
			function( error ) {
				if ( error ) {
					return fn( error );
				}

				fs.stat( repo.path, this );
			},

			// create or update the repo
			function( error ) {
				// repo already exists
				if ( !error ) {
					return exec( "git fetch -t", { cwd: repo.path }, this );
				}

				// error other than repo not existing
				if ( error.code !== "ENOENT" ) {
					return fn( error );
				}

				exec( "git clone " + repo.sourceUrl + " " + repo.path, this );
			},

			function( error ) {
				fn( error );
			}
		);
	}
});

service.register( "github", GithubRepo );
