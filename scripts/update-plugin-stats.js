var db = require( "../lib/pluginsdb" ),
	service = require( "../lib/service" ),
	logger = require( "../lib/logger" ),
	iv,
	queue,
	ready,
	delay = 60*1000;

function update( err, plugin ) {
	if ( err ) {
		logger.log( err );
	} else {
		db.updateRepoMeta( plugin.repo, plugin, function(err){
			if ( err ) {
				logger.log( err );
			}
			iv = setTimeout( processData, delay );
		});
	}
}

function processData() {
	var repo,
		data = queue.shift();

	if ( !ready ) {
		clearTimeout( iv );
		process.exit( 0 );
	} else if ( !data ) {
		iv = setTimeout( init, delay );
	} else if ( ready && data ) {
		repo = service.getRepoById( data.repo );
		repo.getStats( data, update );
	}
}

function init() {
	db.getAllPlugins(function( err, plugins ) {
		if ( !err && plugins.length > 0 ) {
			queue = plugins;
			ready = true;
			processData();
		} else {
			iv = setTimeout( init, delay );
		}
	});
}

// Kick off
init();

// Let the current action finish, then stop processing and exit
function shutdownHook() {
	logger.log( "Shutting down update-plugin-stats." );
	ready = false;
}

process.once( "SIGINT", shutdownHook );
process.once( "SIGTERM", shutdownHook );
