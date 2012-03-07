var path = require( "path" ),
	config = require( process.env.JQ_PATH ?
		process.env.JQ_PATH + "/plugins.jquery.com" :
		"../config" );

console.log( config.test );
function resolvePath( key, _default ) {
	config[ key ] = path.resolve( __dirname, "..", config[ key ] || _default );
}

resolvePath( "repoDir", "/tmp/plugin-repos" );
resolvePath( "pluginsDb", "plugins.db" );

module.exports = config;
