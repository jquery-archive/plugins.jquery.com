var fs = require( "fs" ),
	semver = require( "semver" ),
	Step = require( "step" ),
	config = require( "./config" ),
	logger = require( "./logger" ),
	Manifest = require( "./manifest" ),
	suites = require( "./suites" ),
	blacklist = require( "./blacklist" );

Manifest.suites = suites;
Manifest.blacklist = blacklist;

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

// manifest
extend( Repo.prototype, {
	getManifest: function( tag, file, fn ) {
		var repo = this;
		this._getManifest( tag, file, function( error, manifest ) {
			if ( error ) {
				return fn( error );
			}

			try {
				manifest = JSON.parse( manifest );
			} catch( error ) {
				logger.log( "Invalid JSON in manifest", repo.id, tag, file );
				repo.informInvalidJson({ tag: tag, file: file });
				return fn( null, null );
			}

			fn( null, manifest );
		});
	},

	validateManifest: function( manifest, version, prefix, filename ) {
		var errors = Manifest.validate( manifest, version, prefix, filename );

		if ( errors.length ) {
			logger.log( "Manifest errors:", this.id, version, filename, errors );
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
					if ( /Repository not found/.test( error.message ) ) {
						repo.informRepoNotFound();
						return fn( null, [] );
					}

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
					logger.log( "No manifest files for", repo.id, tag );
					repo.informMissingManifset({ tag: tag });
					return fn( null, null );
				}

				logger.log( "Found manifest files for", repo.id, tag, files );
				this.parallel()( null, files );

				var group = this.group();
				files.forEach(function( file ) {
					repo.getManifest( tag, file, group() );
				});
			},

			// validate manifests
			function( error, files, manifests ) {
				var i, l, errors,
					mappedManifests = {};

				if ( error ) {
					return fn( error );
				}

				// if any manifest is invalid, then the whole version is invalid
				if ( manifests.some(function( manifest ) {
					return !manifest;
				})) {
					return fn( null, null );
				}

				for ( i = 0, l = manifests.length; i < l; i++ ) {
					errors = repo.validateManifest( manifests[ i ], tag,
						suites[ repo.id ], files[ i ] );
					if ( errors.length ) {
						repo.informInvalidManifest({
							tag: tag,
							file: files[ i ],
							errors: errors
						});
						return fn( null, null );
					}
					mappedManifests[ files[ i ] ] = manifests[ i ];
				}

				fn( null, mappedManifests );
			}
		);
	}
});

// Status notifications
extend( Repo.prototype, {
	inform: function( msg ) {
		fs.appendFile( config.errorLog, (new Date()).toGMTString() + " " + msg + "\n" );
	},
	informMissingManifset: function( data ) {
		this.inform( this.id + " " + data.tag + " has no manifest file(s)." );
	},
	informInvalidJson: function( data ) {
		this.inform( this.id + " " + data.tag + " " + data.file + " is invalid JSON." );
	},
	informInvalidManifest: function( data ) {
		this.inform( this.id + " " + data.tag + " " + data.file + " has the following errors: " + data.errors );
	},
	informOtherOwner: function( data ) {
		this.inform( this.id + " " + data.tag + " cannot publish " + data.name + " which is owned by " + data.owner );
	},
	informRepoNotFound: function() {
		this.inform( this.id + " repo not found on remote server." );
	},
	informSuccess: function( data ) {
		this.inform( this.id + " SUCCESSFULLY ADDED " + data.name + " v" + data.version + "!" );
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
