if ( process.argv.indexOf( "--console" ) !== -1 ) {
	module.exports = console;
	return;
}

var syslog = require( "node-syslog" );

syslog.init( "plugins.jquery.com", syslog.LOG_PID, syslog.LOG_LOCAL0 );

module.exports = {
	log: function( msg ) {
		syslog.log( syslog.LOG_INFO, msg );
	},

	warn: function( msg ) {
		syslog.log( syslog.LOG_NOTICE, msg );
	},

	error: function( msg ) {
		syslog.log( syslog.LOG_ERR, msg );
	}
};
