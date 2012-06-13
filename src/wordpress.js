var wordpress = require( "wordpress" ),
	config = require( "./config" );

var client = wordpress.createClient( config.wordpress );

client.getPostForPlugin = function( plugin, fn ) {
	client.authenticatedCall( "jq-pjc.getPostForPlugin", plugin, function( error, post ) {
		if ( error ) {
			return fn( error );
		}

		fn( null, wordpress.fieldMap.from( post, "post" ) );
	});
};

module.exports = client;
