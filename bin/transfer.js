#!/usr/bin/env node

var Step = require( "step" ),
	service = require( "../lib/service" ),
	pluginsDb = require( "../lib/pluginsdb" );

process.stdin.setEncoding( "utf8" );

function prompt( message, fn ) {
	process.stdout.write( message + " " );
	process.stdin.resume();

	process.stdin.once( "data", function( chunk ) {
		process.stdin.pause();
		fn( null, chunk.trim() );
	});
}

function showError( error ) {
	console.log( "Error transferring ownership" );
	console.log( error.stack );
	process.exit( 1 );
}

function transfer( fn ) {
	var plugin;

	Step(
		function() {
			// Find out which plugin to transfer
			prompt( "Plugin:", this );
		},

		function( error, _plugin ) {
			if ( error ) {
				return showError( error );
			}

			plugin = _plugin;

			// Find out who currently owns the plugin
			pluginsDb.getOwner( plugin, this.parallel() );
		},

		function( error, actualOwner ) {
			if ( error ) {
				return showError( error );
			}

			// Verify the plugin exists
			if ( !actualOwner ) {
				console.log( plugin + " does not exist." );
				process.exit( 1 );
			}

			// Find out who we think owns the plugin
			this.parallel()( null, actualOwner );
			prompt( "Current owner:", this.parallel() );
		},

		function( error, actualOwner, providedOwner ) {
			if ( error ) {
				return showError( error );
			}

			// Verify the expected owner is the real owner
			if ( providedOwner !== actualOwner ) {
				console.log( plugin + " is owned by " + actualOwner +
					", not " + providedOwner + "." );
				process.exit( 1 );
			}

			// Find out where the plugin is being transferred to
			prompt( "New repository id (e.g., github/owner/repo)", this );
		},

		function( error, id ) {
			if ( error ) {
				return showError( error );
			}

			// Create a Repo instance to verify the new id and parse the data
			var repo;
			try {
				repo = service.getRepoById( id );
			} catch ( error ) {
				fn( error );
				return;
			}

			// Transfer ownersip
			this.parallel()( null, repo.userId );
			pluginsDb.transferOwnership( plugin, repo.userId, repo.id, this.parallel() );
		},

		function( error, owner ) {
			if ( error ) {
				return showError( error );
			}

			console.log( "Succesfully transferred " + plugin + " to " + owner + "." );
		}
	);
}

transfer();
