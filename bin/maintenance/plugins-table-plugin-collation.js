#!/usr/bin/env node

var db,
	pluginsDb = require( "../../lib/pluginsdb" );

function runQueries( queries, fn ) {
	db.run( queries.shift(), function( error ) {
		if ( error ) {
			return fn( error );
		}

		if ( !queries.length ) {
			return fn( null );
		}

		runQueries( queries, fn );
	});
}

db = pluginsDb.connect(function( error ) {
	if ( error ) {
		console.log( "Error connecting to the database." );
		console.log( error );
		process.exit( 1 );
	}

	runQueries([
		"BEGIN TRANSACTION",
		"CREATE TEMPORARY TABLE plugins_backup(" +
			"plugin TEXT PRIMARY KEY, " +
			"owner TEXT, " +
			"repo TEXT, " +
			"watchers INTEGER DEFAULT 0, " +
			"forks INTEGER DEFAULT 0" +
		")",
		"INSERT INTO plugins_backup SELECT * FROM plugins",
		"DROP TABLE plugins",
		"CREATE TABLE plugins (" +
			"plugin TEXT PRIMARY KEY COLLATE NOCASE, " +
			"owner TEXT, " +
			"repo TEXT, " +
			"watchers INTEGER DEFAULT 0, " +
			"forks INTEGER DEFAULT 0" +
		")",
		"INSERT INTO plugins SELECT * FROM plugins_backup",
		"DROP TABLE plugins_backup",
		"COMMIT"
	], function( error ) {
		if ( error ) {
			console.log( "Error updating table." );
			console.log( error );
			process.exit( 1 );
		}

		console.log( "Successfully updated table." );
	});
});
