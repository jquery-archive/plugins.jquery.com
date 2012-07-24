var service = require( "../lib/service" );

var tests = {
	"minimal manifest": function( manifest, fn ) {
		fn( manifest, manifest.version, [] );
	},

	"full manifest": function( manifest, fn ) {
		manifest = {
			name: "theplugin",
			version: "0.1.0",
			title: "The Plugin",
			author: {
				name: "John Doe",
				email: "johndoe@example.com",
				url: "http://example.com"
			},
			licenses: [
				{
					type: "foo",
					url: "http://example.com/foo-license"
				},
				{
					type: "bar",
					url: "http://example.com/bar-license"
				}
			],
			dependencies: {
				jquery: "1.2.3",
				dep1: "1.1.1"
			},
			description: "A jQuery Plugin",
			keywords: [ "jQuery", "plugin" ],
			homepage: "http://example.com/theplugin",
			docs: "http://example.com/theplugin-docs",
			demo: "http://example.com/theplugin-demo",
			download: "http://example.com/theplugin-download",
			bugs: "http://example.com/theplugin-bugs",
			maintainers: [
				{
					name: "Jane Doe",
					email: "janedoe@example.com",
					url: "http://example.com/jane"
				},
				{
					name: "Joe Smith",
					email: "joesmith@example.com",
					url: "http://example.com/joe"
				}
			]
		};
		fn( manifest, manifest.version, [] );
	},

	"empty manifest": function( manifest, fn ) {
		fn( {}, "0.1.0", [
			"Missing required field: name.",
			"Missing required field: version.",
			"Missing required field: title.",
			"Missing required field: author.",
			"Missing required field: licenses.",
			"Missing required field: dependencies."
		]);
	},

	"name - empty": function( manifest, fn ) {
		manifest.name = "";
		fn( manifest, manifest.version, [
			"Missing required field: name."
		]);
	},

	"name - invalid type": function( manifest, fn ) {
		manifest.name = 5;
		fn( manifest, manifest.version, [
			"Invalid data type for name; must be a string."
		]);
	},

	"name - invalid characters": function( manifest, fn ) {
		manifest.name = "the plugin";
		fn( manifest, manifest.version, [
			"Name contains invalid characters."
		]);
	},

	"name - invalid prefix": function( manifest, fn ) {
		manifest.name = "ui.theplugin";
		fn( manifest, manifest.version, [
			"Name must not start with 'ui.'."
		]);
	},

	"name - blacklisted": function( manifest, fn ) {
		manifest.name = "docs";
		fn( manifest, manifest.version, [
			"Name must not be 'docs'."
		]);
	},

	"version - invalid type": function( manifest, fn ) {
		manifest.version = 1;
		fn( manifest, manifest.version, [
			"Invalid data type for version; must be a string."
		]);
	},

	"version - invalid semver": function( manifest, fn ) {
		manifest.version = "1.2";
		fn( manifest, manifest.version, [
			"Manifest version (1.2) is invalid."
		]);
	},

	"version - mismatch": function( manifest, fn ) {
		fn( manifest, "1.0.0", [
			"Manifest version (" + manifest.version + ") does not match tag (1.0.0)."
		]);
	},

	"title - invalid type": function( manifest, fn ) {
		manifest.title = 5;
		fn( manifest, manifest.version, [
			"Invalid data type for title; must be a string."
		]);
	},

	"author - invalid type": function( manifest, fn ) {
		manifest.author = "John Doe";
		fn( manifest, manifest.version, [
			"Invalid data type for author; must be an object."
		]);
	},

	"author - empty object": function( manifest, fn ) {
		manifest.author = {};
		fn( manifest, manifest.version, [
			"Missing required field: author.name."
		]);
	},

	"author - name - invalid type": function( manifest, fn ) {
		manifest.author.name = 5;
		fn( manifest, manifest.version, [
			"Invalid data type for author.name; must be a string."
		]);
	},

	"author - email - invalid type": function( manifest, fn ) {
		manifest.author.email = 5;
		fn( manifest, manifest.version, [
			"Invalid data type for author.email; must be a string."
		]);
	},

	"author - email - invalid format": function( manifest, fn ) {
		manifest.author.email = "john at example";
		fn( manifest, manifest.version, [
			"Invalid value for author.email."
		]);
	},

	"author - url - invalid type": function( manifest, fn ) {
		manifest.author.url = 5;
		fn( manifest, manifest.version, [
			"Invalid data type for author.url; must be a string."
		]);
	},

	// "author - url - invalid format": function( manifest, fn ) {
	// 	manifest.author.url = "example.com";
	// 	fn( manifest, manifest.version, [
	// 		"Invalid value for author.url."
	// 	]);
	// },

	"licenses - invalid type": function( manifest, fn ) {
		manifest.licenses = "MIT";
		fn( manifest, manifest.version, [
			"Invalid data type for licenses; must be an array."
		]);
	},

	"licenses - empty array": function( manifest, fn ) {
		manifest.licenses = [];
		fn( manifest, manifest.version, [
			"There must be at least one license."
		]);
	},

	"licenses - empty object": function( manifest, fn ) {
		manifest.licenses[0] = {};
		fn( manifest, manifest.version, [
			"Missing required field: licenses[0].url."
		]);
	},

	"licenses - url - invalid type": function( manifest, fn ) {
		manifest.licenses[0].url = 5;
		fn( manifest, manifest.version, [
			"Invalid data type for licenses[0].url; must be a string."
		]);
	},

	// "licenses - url - invalid format": function( manifest, fn ) {
	// 	manifest.licenses[0].url = "example.com";
	// 	fn( manifest, manifest.version, [
	// 		"Invalid value for licenses[0].url."
	// 	]);
	// },

	"dependencies - invalid type": function( manifest, fn ) {
		manifest.dependencies = [ "jquery" ];
		fn( manifest, manifest.version, [
			"Invalid data type for dependencies; must be an object."
		]);
	},

	"dependencies - missing jquery": function( manifest, fn ) {
		manifest.dependencies = { otherplugin: "1.2.3" };
		fn( manifest, manifest.version, [
			"Missing required dependency: jquery."
		]);
	},

	"dependencies - dependency - invalid type": function( manifest, fn ) {
		manifest.dependencies.jquery = 1.2;
		fn( manifest, manifest.version, [
			"Invalid data type for dependencies[jquery]; must be a string."
		]);
	},

	"dependencies - dependency - invalid version": function( manifest, fn ) {
		manifest.dependencies.jquery = "1.*";
		fn( manifest, manifest.version, [
			"Invalid version range for dependency: jquery."
		]);
	},

	"description - invalid type": function( manifest, fn ) {
		manifest.description = 5;
		fn( manifest, manifest.version, [
			"Invalid data type for description; must be a string."
		]);
	},

	"keywords - invalid type": function( manifest, fn ) {
		manifest.keywords = "jquery plugin";
		fn( manifest, manifest.version, [
			"Invalid data type for keywords; must be an array."
		]);
	},

	"keywords - keyword - invalid type": function( manifest, fn ) {
		manifest.keywords = [ "plugin", 5 ];
		fn( manifest, manifest.version, [
			"Invalid data type for keywords[1]; must be a string."
		]);
	},

	"keywords - keyword - invalid characters": function( manifest, fn ) {
		manifest.keywords = [ "jquery plugin" ];
		fn( manifest, manifest.version, [
			"Invalid characters for keyword: jquery plugin."
		]);
	},

	"homepage - invalid type": function( manifest, fn ) {
		manifest.homepage = 5;
		fn( manifest, manifest.version, [
			"Invalid data type for homepage; must be a string."
		]);
	},

	// "homepage - invalid format": function( manifest, fn ) {
	// 	manifest.homepage = "example.com";
	// 	fn( manifest, manifest.version, [
	// 		"Invalid value for homepage."
	// 	]);
	// },

	"docs - invalid type": function( manifest, fn ) {
		manifest.docs = 5;
		fn( manifest, manifest.version, [
			"Invalid data type for docs; must be a string."
		]);
	},

	// "docs - invalid format": function( manifest, fn ) {
	// 	manifest.docs = "example.com";
	// 	fn( manifest, manifest.version, [
	// 		"Invalid value for docs."
	// 	]);
	// },

	"demo - invalid type": function( manifest, fn ) {
		manifest.demo = 5;
		fn( manifest, manifest.version, [
			"Invalid data type for demo; must be a string."
		]);
	},

	// "demo - invalid format": function( manifest, fn ) {
	// 	manifest.demo = "example.com";
	// 	fn( manifest, manifest.version, [
	// 		"Invalid value for demo."
	// 	]);
	// },

	"download - invalid type": function( manifest, fn ) {
		manifest.download = 5;
		fn( manifest, manifest.version, [
			"Invalid data type for download; must be a string."
		]);
	},

	// "download - invalid format": function( manifest, fn ) {
	// 	manifest.download = "example.com";
	// 	fn( manifest, manifest.version, [
	// 		"Invalid value for download."
	// 	]);
	// },

	"bugs - invalid type": function( manifest, fn ) {
		manifest.bugs = 5;
		fn( manifest, manifest.version, [
			"Invalid data type for bugs; must be a string."
		]);
	},

	// "bugs - invalid format": function( manifest, fn ) {
	// 	manifest.bugs = "example.com";
	// 	fn( manifest, manifest.version, [
	// 		"Invalid value for bugs."
	// 	]);
	// },

	"maintainers - invalid type": function( manifest, fn ) {
		manifest.maintainers = "John";
		fn( manifest, manifest.version, [
			"Invalid data type for maintainers; must be an array."
		]);
	},

	"maintainers - maintainer - invalid type": function( manifest, fn ) {
		manifest.maintainers = [ "John" ];
		fn( manifest, manifest.version, [
			"Invalid data type for maintainers[0]; must be an object."
		]);
	},

	"maintainers - maintainer - empty object": function( manifest, fn ) {
		manifest.maintainers = [{}];
		fn( manifest, manifest.version, [
			"Missing required field: maintainers[0].name."
		]);
	},

	"maintainers - maintainer - name - invalid type": function( manifest, fn ) {
		manifest.maintainers = [{ name: 5 }];
		fn( manifest, manifest.version, [
			"Invalid data type for maintainers[0].name; must be a string."
		]);
	},

	"maintainers - maintainer - email - invalid type": function( manifest, fn ) {
		manifest.maintainers = [{ name: "John", email: 5 }];
		fn( manifest, manifest.version, [
			"Invalid data type for maintainers[0].email; must be a string."
		]);
	},

	"manitainers - maintainer - email - invalid format": function( manifest, fn ) {
		manifest.maintainers = [{ name: "John", email: "john at example" }];
		fn( manifest, manifest.version, [
			"Invalid value for maintainers[0].email."
		]);
	},

	"maintainers - maintainer - url - invalid type": function( manifest, fn ) {
		manifest.maintainers = [{ name: "John", url: 5 }];
		fn( manifest, manifest.version, [
			"Invalid data type for maintainers[0].url; must be a string."
		]);
	}

	// "maintainers - maintainer - url - invalid format": function( manifest, fn ) {
	// 	manifest.maintainers = [{ name: "John", url: "example.com" }];
	// 	fn( manifest, manifest.version, [
	// 		"Invalid value for maintainers[0].url."
	// 	]);
	// }
};

exports.service = {};
Object.keys( tests ).forEach(function( testName ) {
	exports.service[ testName ] = function( test ) {
		test.expect( 1 );
		tests[ testName ]({
			name: "theplugin",
			version: "0.1.0",
			title: "The Plugin",
			author: { name: "John Doe" },
			licenses: [{ url: "http://example.com/license" }],
			dependencies: { jquery: "1.2.3" }
		}, function( manifest, version, errors ) {
			var repo = service.getRepoById( "github/johndoe/theplugin" );
			test.deepEqual( repo.validateManifest( manifest, version ), errors );
			test.done();
		});
	};
});
