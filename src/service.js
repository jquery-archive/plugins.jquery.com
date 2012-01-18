var semver = require( "semver" ),
	Step = require( "step" ),
	config = require( "./config" );

var suites = {
	"github/rdworth/temp-jqueryui": "ui-"
};

function extend( a, b ) {
	for ( var prop in b ) {
		a[ prop ] = b[ prop ];
	}
}

function Repo() {
	this.userId = this.service + "/" + this.userName;
	this.id = this.userId + "/" + this.repoName;
	this.path = config.repoDir + "/" + this.id;
	this.isSuite = this.id in suites;
}

// package.json
extend( Repo.prototype, {
	getPackageJson: function( version, file, fn ) {
		if ( typeof file === "function" ) {
			fn = file;
			file = "package.json";
		}

		this._getPackageJson( version, file, function( error, package ) {
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

		/** required fields **/

		// TODO: verify URL-safe characters
		if ( !package.name ) {
			errors.push( "Missing required field: name." );
		} else if ( typeof package.name !== "string" ) {
			errors.push( "Invalid data type for name; must be a string." );
		} else if ( package.name.charAt( 0 ) === "_" || package.name.charAt( 0 ) === "." ) {
			errors.push( "Name cannot start with an underscore or dot." );
		// don't allow semantic version for plugin name
		// this makes it easier for us to query against pages in the WP database
		// and semvers would be horrible plugin names anyway
		} else if ( semver.valid( package.name ) ) {
			errors.push( "Name cannot be a semantic version." );
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
		} else if ( typeof package.title !== "string" ) {
			errors.push( "Invalid data type for title; must be a string." );
		}

		if ( !package.author ) {
			errors.push( "Missing required field: author." );
		} else if ( !package.author.name ) {
			errors.push( "Missing required field: author.name." );
		} else {
			if ( typeof package.author.name !== "string" ) {
				errors.push( "Invalid data type for author.name; must be a string." );
			}
			// TODO: verify email address format
			if ( "email" in package.author && typeof package.author.email !== "string" ) {
				errors.push( "Invalid data type for author.email; must be a string." );
			}
			// TODO: verify url format
			if ( "url" in package.author && typeof package.author.url !== "string" ) {
				errors.push( "Invalid data type for author.url; must be a string." );
			}
		}

		if ( !package.licenses ) {
			errors.push( "Missing required field: licenses." );
		} else if ( !package.licenses.length ) {
			errors.push( "There must be at least one license." );
		} else {
			package.licenses.forEach(function( license, i ) {
				// TDOO: verify url format
				if ( !license.url ) {
					errors.push( "Missing required field: licenses[" + i + "].url." );
				}
			});
		}

		if ( !package.dependencies ) {
			errors.push( "Missing required field: dependencies." );
		} else {
			if ( !package.dependencies.jquery ) {
				errors.push( "Missing required dependency: jquery." );
			}
			Object.keys( package.dependencies ).forEach(function( dependency ) {
				// TODO: validate name
				if ( !semver.validRange( package.dependencies[ dependency ] ) ) {
					errors.push( "Invalid version range for dependency: " + dependency + "." );
				}
			});
		}

		/** optional fields **/

		if ( "description" in package && typeof package.description !== "string" ) {
			errors.push( "Invalid data type for description; must be a string." );
		}

		if ( "keywords" in package ) {
			if ( !Array.isArray( package.keywords ) ) {
				errors.push( "Invalid data type for keywords; must be an array." );
			} else {
				package.keywords.forEach(function( keyword, i ) {
					// TODO: any character restrictions on keywords?
					if ( typeof keyword !== "string" ) {
						errors.push( "Invalid data type for keywords[" + i + "]; must be a string." );
					}
				});
			}
		}

		// TODO: verify url format
		if ( "homepage" in package && typeof package.homepage !== "string" ) {
			errors.push( "Invalid data type for homepage; must be a string." );
		}

		// TODO: verify url format
		if ( "docs" in package && typeof package.docs !== "string" ) {
			errors.push( "Invalid data type for docs; must be a string." );
		}

		// TODO: verify url format
		if ( "demo" in package && typeof package.demo !== "string" ) {
			errors.push( "Invalid data type for demo; must be a string." );
		}

		if ( "maintainers" in package ) {
			if ( !Array.isArray( package.maintainers ) ) {
				errors.push( "Invalid data type for maintainers; must be an array." );
			} else {
				package.maintainers.forEach(function( maintainer, i ) {
					if ( typeof maintainer.name !== "string" ) {
						errors.push( "Invalid data type for maintainers[" + i + "].name; must be a string." );
					}
					// TODO: verify email address format
					if ( "email" in maintainer && typeof maintainer.email !== "string" ) {
						errors.push( "Invalid data type for maintainers[" + i + "].email; must be a string." );
					}
					// TODO: verify url format
					if ( "url" in maintainer && typeof maintainer.url !== "string" ) {
						errors.push( "Invalid data type for maintainers[" + i + "].url; must be a string." );
					}
				});
			}
		}

		if ( "files" in package ) {
			if ( !Array.isArray( package.files ) ) {
				errors.push( "Invalid data type for files; must be an array." );
			} else {
				package.files.forEach(function( file, i ) {
					if ( typeof file !== "string" ) {
						errors.push( "Invalid data type for files[" + i + "]; must be a string." );
					}
				});
			}
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
		if ( this.isSuite ) {
			return this.validateVersion_suite( tag, fn );
		}

		var repo = this;
		Step(
			// get the package.json
			function() {
				repo.getPackageJson( tag, this );
			},

			// check if we found a package.json
			function( error, package ) {
				if ( error ) {
					return fn( error );
				}

				if ( !package ) {
					return fn( null, null );
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
	},

	validateVersion_suite: function( tag, fn ) {
		var repo = this;
		Step(
			// get list of package.json files
			function() {
				repo.getPackageJsonFiles( tag, this );
			},

			// get all package.jsons
			function( error, files ) {
				if ( error ) {
					return fn( error );
				}

				if ( !files.length ) {
					return fn( null, null );
				}

				var group = this.group();
				files.forEach(function( file ) {
					repo.getPackageJson( tag, file, group() );
				});
			},

			// validate package.jsons
			function( error, packages ) {
				if ( error ) {
					return fn( error );
				}

				// if any package.json is invalid, then the whole version is invalid
				if ( packages.some(function( package ) {
					return !package;
				})) {
					return fn( null, null );
				}

				for ( var i = 0, l = packages.length; i < l; i++ ) {
					if ( repo.validatePackageJson( packages[ i ], tag ).length ) {
						return fn( null, null );
					}
				}

				fn( null, packages );
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
		if ( !services.github.test( data ) ) {
			return null;
		}

		return new services.github( data );
	}
};

require( "./service/github" );
