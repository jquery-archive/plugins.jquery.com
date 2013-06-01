var fs = require( "fs" ),
	querystring = require( "querystring" ),
	exec = require( "child_process" ).exec,
	Step = require( "step" ),
	mkdirp = require( "mkdirp" ),
	service = require( "../service" ),
	logger = require( "../logger" ),
	https = require( "https" );

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

	getStats: function( plugin, fn ) {

		function response( res ) {
			var data = "";

			res.on( "data", function(chunk){ data += chunk; } );

			res.on( "end", function(){
				if ( res.statusCode === 200 ) {
					try {
						data = JSON.parse( data );
						plugin.watchers = data.watchers_count;
						plugin.forks = data.forks_count;
						logger.log( "Updated " + plugin.plugin + ". Watchers(" + plugin.watchers + ") Forks(" + plugin.forks + ")" );
					} catch ( error ) {
						return fn( error );
					}
				} else {
					logger.error( "Unexpected reply: " + data );
				}

				fn( null, plugin );
			});
		}

		var options = {
			host: "api.github.com",
			path: "/repos/" + plugin.repo.split( "/" ).slice( 1 ).join( "/" ),
			headers: {
				"user-agent": "stats/0.1 (+http://plugins.jquery.com)"
			}
		};

		https.request( options, response ).on( "error", logger.error ).end();
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
		exec( "git ls-tree " + tag + " --name-only", { cwd: this.path }, function( error, stdout ) {
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
		exec( "git show " + version + ":" + file, { cwd: this.path }, function( error, stdout ) {
			if ( error ) {
				return fn( error );
			}

			fn( null, stdout.trim() );
		});
	},

	getReleaseDate: function( tag, fn ) {
		// The trailing "--" avoids an ambiguous argument in case a repo
		// contains a path that matches the tag name
		exec( "git log --pretty='%cD' -1 " + tag + " --", { cwd: this.path }, function( error, stdout ) {
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
					exec( "git fetch -t", { cwd: repo.path }, this );
					return;
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
