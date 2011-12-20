var semver = require( "semver" ),
	Step = require( "step" ),
	UserError = require( "./user-error" );

function extend( a, b ) {
	for ( var prop in b ) {
		a[ prop ] = b[ prop ];
	}
}

function Repo() {}

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
				return fn( new UserError( "Could not parse package.json for " + version + "." ) );
			}

			fn( null, package );
		});
	},

	validatePackageJson: function( package, version ) {
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
});

// versions
extend( Repo.prototype, {
	getNewVersions: function( fn ) {
		var repo = this;
		Step(
			// get all new versions
			function() {
				repo._getNewVersions( this );
			},

			// validate each version
			function( error, versions ) {
				if ( error ) {
					return fn( error );
				}

				if ( !versions.length ) {
					return fn( null, [] );
				}

				var group = this.group();
				versions.forEach(function( version ) {
					repo.validateVersion( version, group() );
				});
			},

			// filter to only valid versions
			function( error, versions ) {
				return versions.filter(function( version ) {
					return !!(version && version.package);
				});
			},

			// get dates for each version
			function( error, versions ) {
				var group = this.group();
				versions.forEach(function( version ) {
					var cb = group();
					repo.getReleaseDate( version.version, function( error, date ) {
						if ( error ) {
							return cb( error );
						}

						extend( version, { date: date } );
						cb( null, version );
					});
				});
			},

			fn
		);
	},

	validateVersion: function( version, fn ) {
		var repo = this;
		Step(
			// get the package.json
			function() {
				repo.getPackageJson( version, this );
			},

			// check if we found a package.json
			function( error, package ) {
				if ( error ) {
					if ( error.userError ) {
						// TODO: report error to user
					} else {
						// TODO: log error for retry
					}
					return fn( error );
				}

				if ( !package ) {
					return fn( null );
				}

				return package;
			},

			// validate package.json
			function( error, package ) {
				var errors = repo.validatePackageJson( package, version );

				if ( errors.length ) {
					// TODO: report errors to user
					return fn( null );
				}

				fn( null, {
					version: version,
					package: package
				});
			}
		);
	}
});

var services = [];

module.exports = {
	Repo: Repo,

	register: function( ServiceRepo ) {
		services.push( ServiceRepo );
	},

	getRepo: function( data ) {
		// TODO: #4 - Support other code-sharing sites besides GitHub
		if ( !services[ 0 ].test( data ) ) {
			return null;
		}

		return new services[ 0 ]( data );
	}
};

require( "./service/github" );
