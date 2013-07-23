#!/usr/bin/env node

var Step = require( "step" ),
	pluginsDb = require( "../lib/pluginsdb" ),
	wordpress = require( "../lib/wordpress" );

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
	console.log( "Error removing release" );
	console.log( error.stack );
	process.exit( 1 );
}

function removeRelease() {
	var plugin, version;

	Step(
		function() {

			// Find out which plugin to remove
			prompt( "Plugin:", this );
		},

		function( error, _plugin ) {
			if ( error ) {
				return showError( error );
			}

			plugin = _plugin;

			// Find out which version
			prompt( "Version:", this );
		},

		function( error, _version ) {
			if ( error ) {
				return showError( error );
			}

			version = _version;

			// Verify the release exists in WordPress
			wordpress.getPostForRelease( plugin, version, this );
		},

		function( error, post ) {
			if ( error ) {
				return showError( error );
			}

			if ( !post.id ) {
				console.log( plugin + " " + version + " does not exist in WordPress." );
				process.exit( 1 );
			}

			// Track the removal
			pluginsDb.removeRelease({
				plugin: plugin,
				version: version,
				postId: post.id
			}, this );
		},

		function( error ) {
			if ( error ) {
				return showError( error );
			}

			console.log( "Removal of " + plugin + " " + version + " has been queued." );
		}
	);
}

removeRelease();
