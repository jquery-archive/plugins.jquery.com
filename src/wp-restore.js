var Step = require( "step" ),
	rimraf = require( "rimraf" ),
	pluginsDb = require( "./pluginsdb" ),
	wordpress = require( "./_wordpress" ),
	service = require( "./service" );

Step(
	function() {
		console.log( "The WordPress restore script is for restoring the WordPress site.\n" +
			"It will clear out the WordPress Database and restore the local repositories.\n" +
			"You must have an existing Plugins Database for this to be useful.\n" );
		console.log( "Are you sure you want to continue? (y/n)" );
		process.stdin.resume();
		process.stdin.setEncoding( "utf8" );
		process.stdin.on( "data", this );
	},

	function( response ) {
		process.stdin.destroy();
		if ( response.trim().toLowerCase() !== "y" ) {
			console.log( "Aborting restore." );
			process.exit();
		}
		this();
	},

	function() {
		pluginsDb.getAllRepos( this.parallel() );
		wordpress._reset( this.parallel() );
		rimraf( "last-action", this.parallel() );
	},

	function( error, repos ) {
		if ( error ) {
			throw error;
		}

		var group = this.group();
		repos.forEach(function( repo ) {
			service.getRepoById( repo ).restore( group() );
		});
	},

	function( error ) {
		if ( error ) {
			console.log( "ERROR", "Restore failed." );
			console.log( error.stack );
			return;
		}

		console.log( "SUCCESS", "Restore complete." );
		console.log( "Please run wp-update.js to start processing actions." );
	}
);
