var wordpress = require( "wordpress" ),
	semver = require( "semver" ),
	config = require( "./config" );

function isStable( version ) {
	return (/^\d+\.\d+\.\d+$/).test( version );
}

var client = wordpress.createClient( config.wordpress );

client.getPostForPlugin = function( plugin, fn ) {
	client.authenticatedCall( "jq-pjc.getPostForPlugin", plugin, function( error, post ) {
		if ( error ) {
			return fn( error );
		}

		fn( null, wordpress.fieldMap.from( post, "post" ) );
	});
};

client.post = {
	fromRelease: function( data, fn ) {
		var repo = data.repo,
			manifest = data.manifest,
			tag = data.tag;

		repo.getReleaseDate( tag, function( error, date ) {
			if ( error ) {
				return fn( error );
			}

			fn( null, {
				type: "jquery_plugin",
				status: "publish",
				title: manifest.title,
				content: manifest.description,
				date: date,
				termNames: {
					post_tag: (manifest.keywords || []).map(function( keyword ) {
						return keyword.toLowerCase();
					})
				},
				customFields: [
					{ key: "download_url", value: manifest.download || repo.downloadUrl( tag ) },
					{ key: "repo_url", value: repo.siteUrl },
					{ key: "manifest", value: JSON.stringify( manifest ) }
				]
			});
		});
	},

	getVersions: function( page ) {
		var versions = (page.customFields || []).filter(function( customField ) {
			return customField.key === "versions";
		});
		return versions.length ? JSON.parse( versions[ 0 ].value ) : [];
	},

	addVersion: function( versions, newVersion ) {
		var listed, latest;

		listed = versions
			.concat( newVersion )
			.sort( semver.compare )
			.reverse()
			.filter(function( version ) {
				if ( latest ) {
					return isStable( version );
				}
				if ( isStable( version ) ) {
					latest = version;
				}
				return true;
			})
			.reverse();

		// No stable relases yet, show latest pre-release
		if ( !latest ) {
			latest = listed[ listed.length - 1 ];
		}

		return {
			all: versions,
			listed: listed,
			latest: latest
		};
	},

	mergeCustomFields: function( existing, current ) {
		current.forEach(function( customField ) {

			// If the field already exists, update the value
			for ( var i = 0, length = existing.length - 1; i < length; i++ ) {
				if ( existing[ i ].key === customField.key ) {
					existing[ i ].value = customField.value;
					return;
				}
			}

			// The field doesn't exist, so add it
			existing.push( customField );
		});

		return existing;
	}
};

module.exports = client;
