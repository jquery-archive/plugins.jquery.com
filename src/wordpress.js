var mysql = require( "mysql" ),
	config = require( "./config" );

var db,
	postsTable = "wp_" + (config.siteId ? config.siteId + "_" : "") + "posts";



module.exports = {
	connect: function() {
		db = new mysql.createClient();
		db.host = config.dbHost;
		db.port = config.dbPort;
		db.user = config.dbUser;
		db.password = config.dbPassword;
		db.useDatabase( config.dbName );
	},

	addVersionedPlugin: function( data, fn ) {
		var postName = data.pluginName + "-" + data.version;
		db.query( "SELECT `ID` FROM `" + postsTable + "` WHERE `post_name` = ?",
			[ postName ], function( error, rows ) {
				if ( error ) {
					return fn( error );
				}

				if ( !rows.length ) {
					db.query( "INSERT INTO `" + postsTable + "` " +
						"SET `post_name` = ?, `post_title` = ?, `post_content` = ?",
						[ postName, data.pluginTitle, data.content ], fn );
				} else {
					db.query( "UPDATE `" + postsTable + "` " +
						"SET `post_content` = ? " +
						"WHERE `ID` = ?",
						[ data.content, rows[ 0 ].ID ], fn )
				}
			});
	},

	end: function() {
		db.end();
		db = null;
	}
};
