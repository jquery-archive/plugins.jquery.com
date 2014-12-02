var path = require( "path" ),
	rimraf = require( "rimraf" ),
	config = require( "./lib/config" );

module.exports = function( grunt ) {

var async = grunt.utils.async;

grunt.loadNpmTasks( "grunt-wordpress" );
grunt.loadNpmTasks( "grunt-jquery-content" );
grunt.loadNpmTasks( "grunt-check-modules" );

grunt.initConfig({
	lint: {
		grunt: "grunt.js",
		src: [ "lib/**", "scripts/**" ]
	},
	jshint: {
		grunt: { options: grunt.file.readJSON( ".jshintrc" ) },
		src: { options: grunt.file.readJSON( ".jshintrc" ) }
	},
	test: {
		files: [ "test/**/*.js" ]
	},
	"build-pages": {
		all: grunt.file.expandFiles( "pages/**" )
	},
	"build-resources": {
		all: grunt.file.expandFiles( "resources/**" )
	},
	wordpress: grunt.utils._.extend({
		dir: "dist/wordpress"
	}, config.wordpress )
});

grunt.registerTask( "clean", function() {
	rimraf.sync( "dist" );
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

grunt.registerMultiTask( "build-resources", "Copy resources", function() {
	var task = this,
		taskDone = task.async(),
		files = this.data,
		targetDir = grunt.config( "wordpress.dir" ) + "/resources/";

	grunt.file.mkdir( targetDir );

	grunt.utils.async.forEachSeries( files, function( fileName, fileDone )  {
		grunt.file.copy( fileName, targetDir + fileName.replace( /^.+?\//, "" ) );
		fileDone();
	}, function() {
		if ( task.errorCount ) {
			grunt.warn( "Error building resources." );
			return taskDone( false );
		}

		grunt.log.writeln( "Built " + files.length + " resources." );

		// Build validate.js
		grunt.file.write( targetDir + "/validate.js",
			"(function() {" +
				grunt.file.read( require.resolve( "semver" ) ) + ";" +
				grunt.file.read( "lib/manifest.js" ) +
				grunt.file.read( "resources/validate.js" ) +
			"})();" );

		taskDone();
	});
});

grunt.registerTask( "sync-docs", function() {
	var done = this.async(),
		dir = grunt.config( "wordpress.dir" );

	async.waterfall([
		function syncPosts( fn ) {
			grunt.helper( "wordpress-sync-posts", path.join( dir, "posts/" ), fn );
		},
		function syncResources( fn ) {
			grunt.helper( "wordpress-sync-resources", path.join( dir, "resources/" ), fn );
		}
	], function( error ) {
		if ( error ) {
			return done( false );
		}

		done();
	});
});

// clean-all will delete EVERYTHING, including the plugin registery. This is
// useful only for development if you want a clean slate to test from.
grunt.registerTask( "clean-all", function() {
	var retry = require( "./lib/retrydb" );

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
grunt.registerTask( "publish-docs", "build-pages build-resources sync-docs" );
grunt.registerTask( "setup", "setup-pluginsdb setup-retrydb publish-docs" );
grunt.registerTask( "update", "clean publish-docs" );
grunt.registerTask( "restore", "clean-retries setup-retrydb publish-docs restore-repos" );

};
