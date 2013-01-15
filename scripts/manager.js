var path = require( "path" ),
	spawn = require( "child_process" ).spawn;

function Process( script ) {
	this.args = [].slice.call( arguments );
	this.args[ 0 ] = path.join( __dirname, script );
	this.start();
	Process.list.push( this );
}

Process.list = [];

Process.prototype.respawn = true;

Process.prototype.start = function() {
	this.child = spawn( "node", this.args );
	this.child.on( "exit", this.onExit.bind( this ) );
};

Process.prototype.onExit = function( code ) {
	if ( code !== 0 && this.respawn ) {
		this.start();
	}
};

new Process( "update-server.js" );
new Process( "wordpress-update.js" );
new Process( "retry.js" );

// Let SIGINT pass through to spawned processes. When all children exit,
// The manager will end on its own.

function shutdownHook() {
	logger.log("Received kill signal for manager.js; waiting for children to stop...");
	Process.list.forEach(function( process ) {
		process.respawn = false;
	});
}

process.on("SIGINT", shutdownHook);
process.on("SIGTERM", shutdownHook);
