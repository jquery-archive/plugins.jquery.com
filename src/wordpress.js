var wordpress = require( "wordpress" ),
	config = require( "./config" );

module.exports = wordpress.createClient( config.wordpress );
