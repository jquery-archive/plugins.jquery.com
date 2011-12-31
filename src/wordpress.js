var mysql = require( "mysql" ),
	Step = require( "step" ),
	config = require( "./config" );

var db,
	postIds = {},
	optionsTable = table( "options" ),
	postmetaTable = table( "postmeta" ),
	postsTable = table( "posts" ),
	termsTable = table( "terms" ),
	termRelationshipsTable = table( "term_relationships" ),
	termTaxonomyTable = table( "term_taxonomy" );

function table( name ) {
	return "wp_" + (config.siteId ? config.siteId + "_" : "") + name;
}

function toLocalDate( date ) {
	return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
		date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
}

function toGmtDate( date ) {
	return date.getUTCFullYear() + "-" + (date.getUTCMonth() + 1) + "-" + date.getUTCDate() + " " +
		date.getUTCHours() + ":" + date.getUTCMinutes() + ":" + date.getUTCSeconds();
}

function auto( fn ) {
	return function() {
		if ( !db ) {
			connect();
		}
		fn.apply( this, arguments );
	};
}

// TODO: handle connection error
function connect() {
	db = new mysql.createClient({
		host: config.dbHost,
		port: config.dbPort,
		user: config.dbUser,
		password: config.dbPassword,
		database: config.dbName
	});
}



/** posts **/

function getPostId( name, fn ) {
	if ( name in postIds ) {
		return process.nextTick(function() {
			fn( null, postIds[ name ] );
		});
	}

	db.query( "SELECT `ID` FROM `" + postsTable + "` WHERE `post_name` = ?",
		[ name ], function( error, rows ) {
			if ( error ) {
				return fn( error );
			}

			if ( !rows.length ) {
				return fn( null, null );
			}

			postIds[ name ] = rows[ 0 ].ID;
			fn( null, rows[ 0 ].ID );
		});
}

function requirePostId( name, fn ) {
	getPostId( name, function( error, id ) {
		if ( error ) {
			return fn( error );
		}

		if ( !id ) {
			return fn( new Error( "No post '" + name + "'." ) );
		}

		fn( null, id );
	});
}

function createOrUpdatePost( data, fn ) {
	getPostId( data.name, function( error, id ) {
		if ( error ) {
			return fn( error );
		}

		if ( id ) {
			updatePost( id, data, fn );
		} else {
			createPost( data, fn );
		}
	});
}

function createPost( data, fn ) {
	var localDate = toLocalDate( data.date ),
		gmtDate = toGmtDate( data.date ),
		status = data.draft ? "draft" : "publish",
		parent = data.parent || 0;

	db.query( "INSERT INTO `" + postsTable + "` " +
		"SET `post_type` = 'page', `post_name` = ?, `post_title` = ?, `post_content` = ?, " +
		"`post_status` = ?, `post_parent` = ?, " +
		"`post_date` = ?, `post_date_gmt` = ?, `post_modified` = ?, `post_modified_gmt` = ?",
		[ data.name, data.title, data.content, status, parent, localDate, gmtDate, localDate, gmtDate ],
		function( error, info ) {
			if ( error ) {
				return fn( error );
			}

			postIds[ data.name ] = info.insertId;
			fn( null, info.insertId );
		});
}

function updatePost( id, data, fn ) {
	var localDate = toLocalDate( data.date ),
		gmtDate = toGmtDate( data.date ),
		status = data.draft ? "draft" : "publish";

	db.query( "UPDATE `" + postsTable + "` " +
		"SET `post_title` = ?, `post_content` = ?, `post_status` = ?, " +
		"`post_date` = ?, `post_date_gmt` = ?, `post_modified` = ?, `post_modified_gmt` = ? " +
		"WHERE `ID` = ?",
		[ data.title, data.content, status, localDate, gmtDate, localDate, gmtDate, id ],
		function( error ) {
			if ( error ) {
				return fn( error );
			}

			fn( null, id );
		});
}

function publishPost( id, fn ) {
	db.query( "UPDATE `" + postsTable + "` SET `post_status` = 'publish' WHERE `ID` = ?",
		[ id ], function( error ) {
			fn( error );
		});
}



/** meta **/

function setMeta( id, key, value, fn ) {
	Step(
		function() {
			db.query( "SELECT `meta_id`, `meta_value` FROM `" + postmetaTable + "` " +
				"WHERE `post_id` = ? AND `meta_key` = ?",
				[ id, key ], this.parallel() );
		},

		function( error, rows ) {
			if ( error ) {
				return fn( error );
			}

			if ( !rows.length ) {
				db.query( "INSERT INTO `" + postmetaTable + "` " +
					"SET `post_id` = ?, `meta_key` = ?, `meta_value` = ?",
					[ id, key, value ], this );
			} else {
				db.query( "UPDATE `" + postmetaTable + "` " +
					"SET `meta_value` = ? WHERE `meta_id` = ?",
					[ value, rows[ 0 ].meta_id ], this );
			}
		},

		function( error ) {
			fn( error );
		}
	);
}

function getMeta( id, key, fn ) {
	db.query( "SELECT `meta_value` FROM `" + postmetaTable + "` " +
		"WHERE `post_id` = ? AND `meta_key` = ?",
		[ id, key ], function( error, rows ) {
			if ( error ) {
				return fn( error );
			}

			if ( !rows.length ) {
				return fn( null, null );
			}

			fn( null, rows[ 0 ].meta_value );
		});
}



/** terms **/

function createTerm( term, fn ) {
	Step(
		function() {
			db.query( "INSERT INTO `" + termsTable + "` SET `name` = ?, `slug` = ? " +
				"ON DUPLICATE KEY UPDATE `term_id` = LAST_INSERT_ID(`term_id`)",
				[ term, term ], this );
		},

		function( error, info ) {
			if ( error ) {
				return fn( error );
			}

			db.query( "INSERT INTO `" + termTaxonomyTable + "` " +
				"SET `term_id` = ?, `taxonomy` = 'post_tag' " +
				"ON DUPLICATE KEY UPDATE `term_taxonomy_id` = LAST_INSERT_ID(`term_taxonomy_id`)",
				[ info.insertId ], this );
		},

		function( error, info ) {
			if ( error ) {
				return fn( error );
			}

			fn( null, info.insertId );
		}
	);
}

function setTerm( postId, term, fn ) {
	Step(
		function() {
			createTerm( term, this );
		},

		function( error, termId ) {
			if ( error ) {
				return fn( error );
			}

			db.query( "INSERT INTO `" + termRelationshipsTable + "` " +
				"SET `object_id` = ?, `term_taxonomy_id` = ?",
				[ postId, termId ], this );
		},

		function( error ) {
			fn( error );
		}
	);
}

function setTerms( postId, terms, fn ) {
	Step(
		function() {
			db.query( "DELETE FROM `" + termRelationshipsTable + "` WHERE `object_id` = ?",
				[ postId ], this );
		},

		function( error ) {
			if ( error ) {
				return fn( error );
			}

			if ( !terms || !terms.length ) {
				return process.nextTick(function() {
					fn( null );
				});
			}

			var group = this.group();
			terms.forEach(function( term ) {
				setTerm( postId, term, group() );
			});
		},

		function( error ) {
			fn( error );
		}
	);
}



/** util **/

function flush ( fn ) {
	db.query( "DELETE FROM `" + optionsTable + "` WHERE `option_name` = 'rewrite_rules'", fn );
}



var wordpress = module.exports = {
	getPageId: auto( getPostId ),

	createPage: auto(function( data, package, fn ) {
		Step(
			function() {
				createOrUpdatePost( data, this );
			},

			function( error, id ) {
				if ( error ) {
					return fn( error );
				}

				this.parallel()( null, id );
				setMeta( id, "package_json", JSON.stringify( package ), this.parallel() );
				setTerms( id, package.keywords, this.parallel() );
			},

			function( error, id ) {
				if ( error ) {
					return fn( error );
				}

				fn( null, id );
			}
		);
	}),

	publish: auto(function( plugin, fn ) {
		Step(
			function() {
				requirePostId( plugin, this );
			},

			function( error, id ) {
				if ( error ) {
					return fn( error );
				}

				publishPost( id, fn );
			}
		);
	}),

	getVersions: auto(function( plugin, fn ) {
		Step(
			function() {
				getPostId( plugin, this );
			},

			function( error, id ) {
				if ( error ) {
					return fn( error );
				}

				if ( !id ) {
					return fn( null, {
						listed: [],
						latest: null
					});
				}

				getMeta( id, "versions", this.parallel() );
				getMeta( id, "latest", this.parallel() );
			},

			function( error, versions, latest ) {
				if ( error ) {
					return fn( error );
				}

				fn( null, {
					listed: versions ? JSON.parse( versions ) : [],
					latest: latest
				});
			}
		);
	}),

	setVersions: auto(function( plugin, versions, latest, fn ) {
		Step(
			function() {
				requirePostId( plugin, this );
			},

			function( error, id ) {
				if ( error ) {
					return fn( error );
				}

				setMeta( id, "versions", JSON.stringify( versions ), this.parallel() );
				setMeta( id, "latest", latest, this.parallel() );
			},

			function( error ) {
				fn( error );
			}
		);
	}),

	setMeta: auto(function( plugin, meta, fn ) {
		Step(
			function() {
				requirePostId( plugin, this );
			},

			function( error, id ) {
				if ( error ) {
					return fn( error );
				}

				for ( var key in meta ) {
					setMeta( id, key, meta[ key ], this.parallel() );
				}
			},

			function( error ) {
				fn( error );
			}
		);
	}),

	flush: auto( flush ),

	end: function() {
		if ( db ) {
			db.end();
			db = null;
		}
	},

	_reset: auto(function( fn ) {
		Step(
			function() {
				var parallel = this.parallel;
				[ postmetaTable, postsTable, termsTable, termRelationshipsTable, termTaxonomyTable ].forEach(function( table ) {
					db.query( "TRUNCATE TABLE `" + table + "`", parallel() );
				});
				wordpress.flush( parallel() );
			},

			function( error ) {
				wordpress.end();
				fn( error );
			}
		);
	})
};
