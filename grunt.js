var config = require( "./lib/config" );

module.exports = function( grunt ) {

grunt.loadNpmTasks( "grunt-wordpress" );

grunt.initConfig({
	lint: {
		grunt: "grunt.js",
		src: [ "lib/**", "scripts/**" ]
	},

	test: {
		files: [ "test/**/*.js" ]
	},

	wordpress: config.wordpress
});

// We only want to sync the documentation, so we override wordpress-get-postpaths
// to only find pages. This ensures that we don't delete all of the plugin posts.
grunt.registerHelper( "wordpress-get-postpaths", function( fn ) {
	var client = grunt.helper( "wordpress-client" );
	grunt.verbose.write( "Getting post paths from WordPress..." );
	client.call( "gw.getPostPaths", "page", function( error, postPaths ) {
		if ( error ) {
			grunt.verbose.error();
			return fn( error );
		}

		grunt.verbose.ok();
		grunt.verbose.writeln();
		fn( null, postPaths );
	});
});

grunt.registerTask( "docs", function() {
	var done = this.async();
	grunt.helper( "wordpress-sync-posts", "site-content/", function( error ) {
		if ( error ) {
			done( false );
		}

		done();
	});
});

grunt.registerTask( "clean-all", function() {
	var rimraf = require( "rimraf" ),
		retry = require( "./lib/retrydb" );

	// clean repo checkouts
	rimraf.sync( config.repoDir );

	// clean pluginsDb
	rimraf.sync( config.pluginsDb );
	rimraf.sync( "last-action" );

	// clean retrydb
	rimraf.sync( retry.dbPath );
});

grunt.registerTask( "clean", function() {
	var rimraf = require( "rimraf" ),
		retry = require( "./lib/retrydb" );

	rimraf.sync( "last-action" );
	rimraf.sync( retry.dbPath );
});

grunt.registerTask( "setup-pluginsdb", function() {
	var done = this.async();
	require( "./lib/pluginsdb" )._setup(function( error ) {
		if ( error ) {
			return done( false );
		}

		done();
	});
});

grunt.registerTask( "setup-retrydb", function() {
	var done = this.async();
	require( "./lib/retrydb" )._setup(function( error ) {
		if ( error ) {
			return done( false );
		}

		done();
	});
});

grunt.registerTask( "restore-repos", function() {
	var service = require( "./lib/service" ),
		pluginsDb = require( "./lib/pluginsdb" ),
		done = this.async();

	pluginsDb.getAllRepos(function( error, repos ) {
		grunt.utils.async.mapSeries( repos, function( repo, fn ) {
			service.getRepoById( repo ).restore( fn );
		}, function( error ) {
			if ( error ) {
				return done( false );
			}

			done();
		});
	});
});

grunt.registerTask( "default", "lint test" );
grunt.registerTask( "setup", "setup-pluginsdb setup-retrydb docs" );
grunt.registerTask( "update", "docs" );
grunt.registerTask( "restore", "clean setup-retrydb docs restore-repos" );

};
