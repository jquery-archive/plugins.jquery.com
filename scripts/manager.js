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

// SIGINT is a graceful shutdown of all processes.
// The signal passes through to the children and when they all exit,
// the manager will end on its own.
process.once( "SIGINT", function() {
	Process.list.forEach(function( process ) {
		process.respawn = false;
		process.child.kill( "SIGINT" );
	});
});

// SIGHUP is a graceful restart of all processes, including the manager.
// A SIGINT is sent to all children and a new manager is spawned to create
// new child processes.
process.once( "SIGHUP", function() {
	var waiting = Process.list.length;

	function checkForShutdown() {
		waiting--;
		if ( !waiting ) {
			process.exit();
		}
	}

	// Spawn a new manager, which will spawn new children
	spawn( process.argv[ 0 ], process.argv.slice( 1 ), {
		detached: true
	});

	// Gracefully shutdown all child processes
	Process.list.forEach(function( process ) {
		process.respawn = false;
		process.child.on( "exit", checkForShutdown );
		process.child.kill( "SIGINT" );
	});
});
