/**
 * update-plugin-stats.js
 */
/* jshint laxcomma: true */
var db = require("../lib/pluginsdb.js")
	, util  = require("util")
	, getstats = require("./github-stats.js")
	, delay = 1000
	, queue
	, iv
	, ready
;

// Very simple logger
function logger(msg) {
	if (msg) {
		console.log("[Logger] " + msg);
	}
}

function update(err, plugin) {
	if (err) {
		logger(err);
	} else {
		db.updateRepoMeta(plugin.repo, plugin, logger);
	}
}

function processData() {
	var data = queue.shift();

	if (ready && data) {
		getstats(data, update);
	} else {
		if(!ready || iv) {
			clearInterval(iv);
			process.exit(0);
		}
	}
}

function init(err, plugins) {
	if (!err && plugins.length > 0) {
		queue = plugins;
		ready = true;
		iv = setInterval(processData, delay);
	}
}

// Kick off
db.getAllPlugins(init);

// Let the current action finish, then stop processing and exit
function shutdownHook() {
	logger( "Shutting down update-plugin-stats." );
	ready = false;
}

process.once( "SIGINT", shutdownHook );
process.once( "SIGTERM", shutdownHook );
