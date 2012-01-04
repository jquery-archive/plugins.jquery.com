var semver = require( "semver" ),
	Step = require( "step" ),
	config = require( "./config" );

function extend( a, b ) {
	for ( var prop in b ) {
		a[ prop ] = b[ prop ];
	}
}

function Repo() {}

extend( Repo.prototype, {
	getId: function() {
		return this.service + "/" + this.userName + "/" + this.repoName;
	},

	getPath: function() {
		return config.repoDir + "/" + this.getId();
	}
});

// package.json
extend( Repo.prototype, {
	getPackageJson: function( version, fn ) {
		this._getPackageJson( version, function( error, package ) {
			if ( error ) {
				return fn( error );
			}

			if ( !package ) {
				return fn( null, null );
			}

			try {
				var package = JSON.parse( package );
			} catch( error ) {
				// TODO: report error to user?
				return fn( null, null );
			}

			fn( null, package );
		});
	},

	validatePackageJson: function( package, version ) {
		var errors = [];

		// TODO: name cannot be a semver
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
});

// versions
extend( Repo.prototype, {
	getVersionTags: function( fn ) {
		var repo = this;
		Step(
			function() {
				repo.getTags( this );
			},

			function( error, tags ) {
				if ( error ) {
					return fn( error );
				}

				return tags.filter(function( version ) {
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
			},

			fn
		);
	},

	getRelease: function( tag, fn ) {
		this.validateVersion( tag, function( error, package ) {
			if ( error ) {
				return fn( error );
			}

			if ( !package ) {
				return fn( null, null );
			}

			fn( null, {
				tag: tag,
				package: package
			});
		});
	},

	validateVersion: function( tag, fn ) {
		var repo = this;
		Step(
			// get the package.json
			function() {
				repo.getPackageJson( tag, this );
			},

			// check if we found a package.json
			function( error, package ) {
				if ( error ) {
					// TODO: log error for retry
					return fn( error );
				}

				if ( !package ) {
					return fn( null );
				}

				return package;
			},

			// validate package.json
			function( error, package ) {
				var errors = repo.validatePackageJson( package, tag );

				if ( errors.length ) {
					// TODO: report errors to user
					return fn( null, null );
				}

				fn( null, package );
			}
		);
	}
});

var services = {};

module.exports = {
	Repo: Repo,

	register: function( service, ServiceRepo ) {
		ServiceRepo.prototype.service = service;
		services[ service ] = ServiceRepo;
	},

	getRepoById: function( id ) {
		var parts = id.split( "/" );
		return new services[ parts[ 0 ] ]( parts[ 1 ], parts[ 2 ] );
	},

	getRepoByHook: function( data ) {
		// TODO: #4 - Support other code-sharing sites besides GitHub
		if ( !services.github.test( data ) ) {
			return null;
		}

		return new services.github( data );
	}
};

require( "./service/github" );
