var path = require( "path" ),
	config = require( "../config" );

function resolvePath( key, _default ) {
	config[ key ] = path.resolve( __dirname, "..", config[ key ] || _default );
}

resolvePath( "repoDir", "/tmp/plugin-repos" );
resolvePath( "pluginsDb", "plugins.db" );

module.exports = config;
