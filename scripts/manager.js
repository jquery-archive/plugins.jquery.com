var path = require( "path" ),
	spawn = require( "child_process" ).spawn;

function Process( script ) {
	this.args = [].slice.call( arguments );
	this.args[ 0 ] = path.join( __dirname, script );
	this.start();
	Process.list.push( this );
}

Process.startAll = function() {
	this.list = [];
	new Process( "update-server.js" );
	new Process( "wordpress-update.js" );
	new Process( "retry.js" );
};

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

Process.startAll();

// SIGINT and SIGTERM perform a graceful shutdown of all processes
function shutdownHook() {
	Process.list.forEach(function( process ) {
		process.respawn = false;
		process.child.kill( "SIGINT" );
	});
}
process.once( "SIGINT", shutdownHook );
process.once( "SIGTERM", shutdownHook );

// SIGHUP is a graceful restart of all child processes
process.on( "SIGHUP", function() {
	var old = Process.list;
	Process.startAll();
	old.forEach(function( process ) {
		process.child.kill( "SIGINT" );
	});
});
