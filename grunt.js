var config = require( "./lib/config" );

module.exports = function( grunt ) {

grunt.loadNpmTasks( "grunt-wordpress" );
grunt.loadNpmTasks( "grunt-clean" );
grunt.loadNpmTasks( "grunt-jquery-content" );
grunt.loadNpmTasks( "grunt-check-modules" );

grunt.initConfig({
	clean: {
		wordpress: "dist/"
	},
	lint: {
		grunt: "grunt.js",
		src: [ "lib/**", "scripts/**" ]
	},
	jshint: {
		grunt: { options: grunt.file.readJSON( ".jshintrc" ) },
		src: { options: grunt.file.readJSON( ".jshintrc" ) }
	},
	watch: {
		docs: {
			files: "pages/**",
			tasks: "docs"
		}
	},
	test: {
		files: [ "test/**/*.js" ]
	},
	"build-pages": {
		all: grunt.file.expandFiles( "pages/**" )
	},
	wordpress: grunt.utils._.extend({
		dir: "dist/wordpress"
	}, config.wordpress )
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

grunt.registerTask( "sync-docs", function() {
	var done = this.async();
	grunt.helper( "wordpress-sync-posts", "dist/wordpress/posts/", function( error ) {
		if ( error ) {
			return done( false );
		}

		done();
	});
});

// clean-all will delete EVERYTHING, including the plugin registery. This is
// useful only for development if you want a clean slate to test from.
grunt.registerTask( "clean-all", function() {
	var rimraf = require( "rimraf" ),
		retry = require( "./lib/retrydb" );

	// clean repo checkouts
	rimraf.sync( config.repoDir );

	// clean pluginsDb
	rimraf.sync( config.pluginsDb );
	rimraf.sync( config.lastActionFile );

	// clean retrydb
	rimraf.sync( retry.dbPath );
});

// clean-retries will only delete information about retries. It will not delete the
// plugin registry and it will not remove local clones. This is useful for
// restoring a WordPress site on a server that already has repos.
grunt.registerTask( "clean-retries", function() {
	var rimraf = require( "rimraf" ),
		retry = require( "./lib/retrydb" );

	rimraf.sync( config.lastActionFile );
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
grunt.registerTask( "setup", "setup-pluginsdb setup-retrydb sync-docs" );
grunt.registerTask( "docs", "clean build-pages sync-docs" );
grunt.registerTask( "restore", "clean-retries setup-retrydb sync-docs restore-repos" );

};
