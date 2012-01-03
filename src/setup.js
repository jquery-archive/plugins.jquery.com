var Step = require( "step" ),
	rimraf = require( "rimraf" ),
	pluginsDb = require( "./pluginsdb" ),
	wordpress = require( "./wordpress" ),
	retry = require( "./retry" ),
	config = require( "./config" );

Step(
	function() {
		console.log( "Running setup will erase any existing data, including:\n" +
			"* Plugins Database\n" +
			"* WordPress Database\n" +
			"* Local Repositories\n" );
		console.log( "Are you sure you want to continue? (y/n)" );
		process.stdin.resume();
		process.stdin.setEncoding( "utf8" );
		process.stdin.on( "data", this );
	},

	function( response ) {
		process.stdin.destroy();
		if ( response.trim().toLowerCase() !== "y" ) {
			console.log( "Aborting setup. Nothing has been erased." );
			process.exit();
		}
		this();
	},

	function() {
		pluginsDb._reset( this.parallel() );
		wordpress._reset( this.parallel() );
		retry._reset( this.parallel() );
		rimraf( config.repoDir, this.parallel() );
		rimraf( "last-action", this.parallel() );
	},

	function( error ) {
		if ( error ) {
			console.log( "ERROR", "Setup failed." );
			console.log( error.stack );
			return;
		}

		console.log( "SUCCESS", "Setup complete." );
	}
);
