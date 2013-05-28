/* jshint laxcomma: true */
var
	https = require("https")
	, util = require("util")
;

module.exports = function(plugin, callback) {
	function buildOptions() {
		var options
			, repoPath = null
		;

		if (plugin.repo) {
			repoPath = plugin.repo.split("/").slice(1).join("/");
		}

		if (!repoPath || repoPath.length === 0) {
			if (typeof(callback) === "function") {
				callback("Invalid repository");
			}
		}

		options = {
			host: "api.github.com",
			path: "/repos/" + repoPath,
			headers: {
				"user-agent": "node.js scraper"
			}
		};

		// Slap on the etag header, 304s in response don't count against our rate limit.
		if (plugin.etag) {
			options.headers["If-None-Match"] = '"' + plugin.etag + '"';
		}

		return options;
	}

	function response(res) {
		var data = ""
			, error = null
		;

		res.on("data", function (chunk) {
			data += chunk;
		});

		res.on("end", function () {
			switch (res.statusCode) {

				case 304:
					console.log("304, no work to do");
					break;

				case 200:
					try {
						data = JSON.parse(data);
						plugin.watchers = data.watchers_count;
						plugin.forks = data.forks_count;
						plugin.etag = res.headers.etag;

						console.log("Plugin " + plugin.plugin + " updated!");
						console.log("Watchers: " + data.watchers_count + " Forks: " + data.forks_count + "\n");
					} catch (err) {
						error = err;
					}
					break;

				default:
					// Well that's weird, wat do?
					console.log("Unexpected reply, take a look:\n\n" + data);
					break;
			}

			if (typeof(callback) === "function") {
				callback(error, plugin);
			}
		});
	}

	function errorHandler(error) {
		console.log("Error: " + error);
	}

	console.log("Processing plugin " + plugin.plugin);

	https.request(buildOptions(), response).on("error", errorHandler).end();
};

