var semver = require( "semver" ),
	Step = require( "step" ),
	config = require( "./config" ),
	suites = require( "./suites" ),
	blacklist = require( "./blacklist" );

function extend( a, b ) {
	for ( var prop in b ) {
		a[ prop ] = b[ prop ];
	}
}

function Repo() {
	this.userId = this.service + "/" + this.userName;
	this.id = this.userId + "/" + this.repoName;
	this.path = config.repoDir + "/" + this.id;
}

function isObject( obj ) {
	return ({}).toString.call( obj ) === "[object Object]";
}

function isUrl( str ) {
	// TODO: URL validation
	return true;
}

function isEmail( str ) {
	return (/^[a-zA-Z0-9.!#$%&'*+\/=?\^_`{|}~\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*$/).test( str );
}

// manifest
extend( Repo.prototype, {
	getManifest: function( version, file, fn ) {
		this._getManifest( version, file, function( error, manifest ) {
			if ( error ) {
				return fn( error );
			}

			if ( !manifest ) {
				return fn( null, null );
			}

			try {
				manifest = JSON.parse( manifest );
			} catch( error ) {
				// TODO: report error to user?
				return fn( null, null );
			}

			fn( null, manifest );
		});
	},

	validateManifest: function( manifest, version, prefix, filename ) {
		var errors = [];

		/** required fields **/

		if ( !manifest.name ) {
			errors.push( "Missing required field: name." );
		} else if ( typeof manifest.name !== "string" ) {
			errors.push( "Invalid data type for name; must be a string." );
		} else if ( !(/^[a-zA-Z0-9_\.\-]+$/).test( manifest.name ) ) {
			errors.push( "Name contains invalid characters." );
		} else if ( blacklist.indexOf( manifest.name ) !== -1 ) {
			errors.push( "Name must not be '" + manifest.name + "'." );
		} else {
			if ( prefix ) {
				if ( manifest.name.indexOf( prefix ) !== 0 ) {
					errors.push( "Name must start with '" + prefix + "'." );
				}
			} else {
				Object.keys( suites ).forEach(function( repoId ) {
					var prefix = suites[ repoId ];
					if ( manifest.name.indexOf( prefix ) === 0 &&
							!(/\./).test( manifest.name.substr( prefix.length ) ) ) {
						errors.push( "Name must not start with '" + prefix + "'." );
					}
				});
			}

			if ( filename && filename.substr( 0, filename.length - 12 ) !== manifest.name ) {
				errors.push( "Name must match manifest file name." );
			}
		}

		if ( !manifest.version ) {
			errors.push( "Missing required field: version." );
		} else if ( typeof manifest.version !== "string" ) {
			errors.push( "Invalid data type for version; must be a string." );
		} else if ( manifest.version !== semver.clean( manifest.version ) ) {
			errors.push( "Manifest version (" + manifest.version + ") is invalid." );
		} else if ( manifest.version !== semver.clean( version ) ) {
			errors.push( "Manifest version (" + manifest.version + ") does not match tag (" + version + ")." );
		}

		if ( !manifest.title ) {
			errors.push( "Missing required field: title." );
		} else if ( typeof manifest.title !== "string" ) {
			errors.push( "Invalid data type for title; must be a string." );
		}

		if ( !manifest.author ) {
			errors.push( "Missing required field: author." );
		} else if ( !isObject( manifest.author ) ) {
			errors.push( "Invalid data type for author; must be an object." );
		} else if ( !manifest.author.name ) {
			errors.push( "Missing required field: author.name." );
		} else {
			if ( typeof manifest.author.name !== "string" ) {
				errors.push( "Invalid data type for author.name; must be a string." );
			}

			if ( "email" in manifest.author ) {
				if ( typeof manifest.author.email !== "string" ) {
					errors.push( "Invalid data type for author.email; must be a string." );
				} else if ( !isEmail( manifest.author.email ) ) {
					errors.push( "Invalid value for author.email." );
				}
			}

			if ( "url" in manifest.author ) {
				if ( typeof manifest.author.url !== "string" ) {
					errors.push( "Invalid data type for author.url; must be a string." );
				} else if ( !isUrl( manifest.author.url ) ) {
					errors.push( "Invalid value for author.url." );
				}
			}
		}

		if ( !manifest.licenses ) {
			errors.push( "Missing required field: licenses." );
		} else if ( !Array.isArray( manifest.licenses ) ) {
			errors.push( "Invalid data type for licenses; must be an array." );
		} else if ( !manifest.licenses.length ) {
			errors.push( "There must be at least one license." );
		} else {
			manifest.licenses.forEach(function( license, i ) {
				if ( !license.url ) {
					errors.push( "Missing required field: licenses[" + i + "].url." );
				} else if ( typeof license.url !== "string" ) {
					errors.push( "Invalid data type for licenses[" + i + "].url; must be a string." );
				} else if ( !isUrl( license.url ) ) {
					errors.push( "Invalid value for license.url." );
				}
			});
		}

		if ( !manifest.dependencies ) {
			errors.push( "Missing required field: dependencies." );
		} else if ( !isObject( manifest.dependencies ) ) {
			errors.push( "Invalid data type for dependencies; must be an object." );
		} else {
			if ( !manifest.dependencies.jquery ) {
				errors.push( "Missing required dependency: jquery." );
			}
			Object.keys( manifest.dependencies ).forEach(function( dependency ) {
				if ( typeof manifest.dependencies[ dependency ] !== "string" ) {
					errors.push( "Invalid data type for dependencies[" + dependency + "];" +
						" must be a string." );
				} else if ( !semver.validRange( manifest.dependencies[ dependency ] ) ) {
					errors.push( "Invalid version range for dependency: " + dependency + "." );
				}
			});
		}

		/** optional fields **/

		if ( "description" in manifest && typeof manifest.description !== "string" ) {
			errors.push( "Invalid data type for description; must be a string." );
		}

		if ( "keywords" in manifest ) {
			if ( !Array.isArray( manifest.keywords ) ) {
				errors.push( "Invalid data type for keywords; must be an array." );
			} else {
				manifest.keywords.forEach(function( keyword, i ) {
					if ( typeof keyword !== "string" ) {
						errors.push( "Invalid data type for keywords[" + i + "]; must be a string." );
					} else if ( !(/^[a-zA-Z0-9\.\-]+$/).test( keyword ) ) {
						errors.push( "Invalid characters for keyword: " + keyword + "." );
					}
				});
			}
		}

		if ( "homepage" in manifest ) {
			if ( typeof manifest.homepage !== "string" ) {
				errors.push( "Invalid data type for homepage; must be a string." );
			} else if ( !isUrl( manifest.homepage ) ) {
				errors.push( "Invalid value for homepage." );
			}
		}

		if ( "docs" in manifest ) {
			if ( typeof manifest.docs !== "string" ) {
				errors.push( "Invalid data type for docs; must be a string." );
			} else if ( !isUrl( manifest.docs ) ) {
				errors.push( "Invalid value for docs." );
			}
		}

		if ( "demo" in manifest ) {
			if ( typeof manifest.demo !== "string" ) {
				errors.push( "Invalid data type for demo; must be a string." );
			} else if ( !isUrl( manifest.demo ) ) {
				errors.push( "Invalid value for demo." );
			}
		}

		if ( "download" in manifest ) {
			if ( typeof manifest.download !== "string" ) {
				errors.push( "Invalid data type for download; must be a string." );
			} else if ( !isUrl( manifest.download ) ) {
				errors.push( "Invalid value for download." );
			}
		}

		if ( "bugs" in manifest ) {
			if ( typeof manifest.bugs !== "string" ) {
				errors.push( "Invalid data type for bugs; must be a string." );
			} else if ( !isUrl( manifest.bugs ) ) {
				errors.push( "Invalid value for bugs." );
			}
		}

		if ( "maintainers" in manifest ) {
			if ( !Array.isArray( manifest.maintainers ) ) {
				errors.push( "Invalid data type for maintainers; must be an array." );
			} else {
				manifest.maintainers.forEach(function( maintainer, i ) {
					if ( !isObject( maintainer ) ) {
						errors.push( "Invalid data type for maintainers[" + i + "]; must be an object." );
						return;
					}

					if ( !("name" in maintainer) ) {
						errors.push( "Missing required field: maintainers[" + i + "].name." );
					} else if ( typeof maintainer.name !== "string" ) {
						errors.push( "Invalid data type for maintainers[" + i + "].name; must be a string." );
					}

					if ( "email" in maintainer ) {
						if ( typeof maintainer.email !== "string" ) {
							errors.push( "Invalid data type for maintainers[" + i + "].email; must be a string." );
						} else if ( !isEmail( maintainer.email ) ) {
							errors.push( "Invalid value for maintainers[" + i + "].email." );
						}
					}

					if ( "url" in maintainer ) {
						if ( typeof maintainer.url !== "string" ) {
							errors.push( "Invalid data type for maintainers[" + i + "].url; must be a string." );
						} else if ( !isUrl( maintainer.url ) ) {
							errors.push( "Invalid value for maintainers[" + i + "].url." );
						}
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
		this.validateVersion( tag, function( error, manifests ) {
			if ( error ) {
				return fn( error );
			}

			if ( !manifests ) {
				return fn( null, null );
			}

			fn( null, {
				tag: tag,
				manifests: manifests
			});
		});
	},

	validateVersion: function( tag, fn ) {
		var repo = this;
		Step(
			// get list of manifest files
			function() {
				repo.getManifestFiles( tag, this );
			},

			// get all manifest files
			function( error, files ) {
				if ( error ) {
					return fn( error );
				}

				if ( !files.length ) {
					return fn( null, null );
				}

				this.parallel()( null, files );

				var group = this.group();
				files.forEach(function( file ) {
					repo.getManifest( tag, file, group() );
				});
			},

			// validate manifests
			function( error, files, manifests ) {
				var mappedManifests = {};

				if ( error ) {
					return fn( error );
				}

				// if any manifest is invalid, then the whole version is invalid
				if ( manifests.some(function( manifest ) {
					return !manifest;
				})) {
					return fn( null, null );
				}

				for ( var i = 0, l = manifests.length; i < l; i++ ) {
					if ( repo.validateManifest( manifests[ i ], tag,
							suites[ repo.id ], files[ i ] ).length ) {
						return fn( null, null );
					}
					mappedManifests[ files[ i ] ] = manifests[ i ];
				}

				fn( null, mappedManifests );
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
		var service, parsed;
		for ( service in services ) {
			parsed = services[ service ].test( data );
			if ( parsed ) {
				return new services[ service ]( parsed );
			}
		}

		return null;
	}
};

require( "./service/github" );
