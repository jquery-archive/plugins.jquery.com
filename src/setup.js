var Step = require( "step" ),
	rimraf = require( "rimraf" ),
	pluginsDb = require( "./pluginsdb" ),
	wordpress = require( "./wordpress" ),
	config = require( "./config" );

Step(
	function() {
		pluginsDb._reset( this.parallel() );
		wordpress._reset( this.parallel() );
		rimraf( config.repoDir, this.parallel() );
	},

	function( error ) {
		if ( error ) {
			console.log( "ERROR", "Setup failed." );
			console.log( error, error.stack );
			return;
		}

		console.log( "SUCCESS", "Setup complete." );
	}
);
