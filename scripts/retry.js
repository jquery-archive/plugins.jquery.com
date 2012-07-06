var Step = require( "step" ),
	hook = require( "../lib/hook" ),
	service = require( "../lib/service" ),
	retry = require( "../lib/retrydb" ),
	logger = require( "../lib/logger" );

process.on( "uncaughtException", function( error ) {
	logger.error( "Uncaught exception: " + error.stack );
});

// exponential backoff for retries, with a max of 2 minutes
function wait( tries ) {
	return Math.min( 120, (Math.pow( 2, tries ) - 1) ) * 1000;
}

var actions = {};

actions.processVersions = function( repoId, fn ) {
	var repo = service.getRepoById( repoId );
	hook.processVersions( repo, fn );
};

actions.processRelease = function( repoId, tag, file, fn ) {
	var repo = service.getRepoById( repoId );
	repo.getManifest( tag, file, function( error, manifest ) {
		if ( error ) {
			return fn( error );
		}

		hook.processRelease( repo, tag, file, manifest, fn );
	});
};

actions.processMeta = function( repoId, fn ) {
	var repo = service.getRepoById( repoId );
	hook.processMeta( repo, fn );
};

var processFailures = function( fn ) {
	Step(
		function() {
			retry.getFailure( this );
		},

		function( error, failure ) {
			if ( error ) {
				return fn( error );
			}

			// no more failures, wait then try again
			if ( !failure ) {
				setTimeout(function() {
					processFailures( fn );
				}, 5000 );
				return;
			}

			this.parallel()( null, failure );
			setTimeout( this.parallel(), wait( failure.tries ) );
		},

		function( error, failure ) {
			this.parallel()( null, failure );
			actions[ failure.method ].apply( null, failure.args.concat( this.parallel() ) );
		},

		function( error, failure ) {
			if ( error ) {
				return fn( error );
			}

			retry.remove( failure.retry, this );
		},

		function( error ) {
			if ( error ) {
				return fn( error );
			}

			processFailures( fn );
		}
	);
};

processFailures(function( error ) {
	if ( error ) {
		logger.error( "Error during retry: " + error.stack );
	}
});

// Let the current retry finish, then stop processing and exit
process.on( "SIGINT", function() {
	processFailures = function( fn ) {
		fn( null );
	};
});
