var path = require( "path" ),
	tmpDir = process.env.TMPDIR || process.env.TMP || process.env.TEMP ||
		( process.platform === "win32" ? "c:/windows/temp" : "/tmp" ),
	config = require( process.env.JQ_PATH ?
		process.env.JQ_PATH + "/plugins.jquery.com" :
		"../config" );

function resolvePath( key, _default ) {
	config[ key ] = path.resolve( __dirname, "..", config[ key ] || _default );
}

resolvePath( "repoDir", path.resolve( tmpDir, "plugin-repos" ) );
resolvePath( "pluginsDb", "plugins.db" );

module.exports = config;
