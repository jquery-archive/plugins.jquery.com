var mysql = require( "mysql" ),
	config = require( "./config" );

var db,
	// TODO: make sure all queries support siteId
	postsTable = "wp_" + (config.siteId ? config.siteId + "_" : "") + "posts";



function connect() {
	db = new mysql.createClient();
	db.host = config.dbHost;
	db.port = config.dbPort;
	db.user = config.dbUser;
	db.password = config.dbPassword;
	db.useDatabase( config.dbName );
}

function getPostId( name, fn ) {
	db.query( "SELECT `ID` FROM `" + postsTable + "` WHERE `post_name` = ?",
		[ name ], function( error, rows ) {
			if ( error ) {
				return fn( error );
			}

			if ( !rows.length ) {
				return fn( null, null );
			}

			fn( null, rows[ 0 ].ID );
		});
}

function createOrUpdatePost( name, title, content, fn ) {
	getPostId( name, function( error, id ) {
			if ( error ) {
				return fn( error );
			}

			if ( !id ) {
				db.query( "INSERT INTO `" + postsTable + "` " +
					"SET `post_name` = ?, `post_title` = ?, `post_content` = ?",
					[ name, title, content ], fn );
			} else {
				db.query( "UPDATE `" + postsTable + "` " +
					"SET `post_content` = ? " +
					"WHERE `ID` = ?",
					[ content, id ], fn );
			}
		});
}

function createOrUpdateMeta( plugin, key, value, fn ) {
	getPostId( plugin, function( error, id ) {
		if ( error ) {
			return fn( error );
		}

		if ( !id ) {
			return fn( new Error( "Cannot set " + key + " for " + plugin + "." ) );
		}

		db.query( "SELECT `meta_id` FROM `wp_postmeta` " +
			"WHERE `post_id` = ? AND `meta_key` = ?",
			[ id, key ], function( error, rows ) {
				if ( error ) {
					return fn( error );
				}

				if ( !rows.length ) {
					db.query( "INSERT INTO `wp_postmeta` " +
						"SET `post_id` = ?, `meta_key` = ?, `meta_value` = ?",
						[ id, key, value ], function( error ) {
							if ( error ) {
								return fn( error );
							}

							fn( null );
						});
				} else {
					db.query( "UPDATE `wp_postmeta` " +
						"SET `meta_value` = ? WHERE `meta_id` = ?",
						[ value, rows[ 0 ].meta_id ], function( error ) {
							if ( error ) {
								return fn( error );
							}

							fn( null );
						});
				}
			});
	});
}

function getMeta( plugin, key, fn ) {
	getPostId( plugin, function( error, id ) {
		if ( error ) {
			return fn( error );
		}

		if ( !id ) {
			return fn( null, null );
		}

		db.query( "SELECT `meta_value` FROM `wp_postmeta` " +
			"WHERE `post_id` = ? AND `meta_key` = ?",
			[ id, key ], function( error, rows ) {
				if ( error ) {
					return fn( error );
				}

				fn( null, rows[ 0 ].meta_value );
			});
	});
}

function auto( fn ) {
	return function() {
		if ( !db ) {
			connect();
		}
		fn.apply( this, arguments );
	};
}



module.exports = {
	addVersionedPlugin: auto(function( data, fn ) {
		createOrUpdatePost( data.pluginName + "-" + data.version,
			data.pluginTitle, data.content, fn );
	}),

	getOwner: auto(function( plugin, fn ) {
		getMeta( plugin, "owner", fn );
	}),

	setOwner: auto(function( plugin, owner, fn ) {
		createOrUpdateMeta( plugin, "owner", owner, fn );
	}),

	end: function() {
		if ( db ) {
			db.end();
			db = null;
		}
	}
};
