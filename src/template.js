var fs = require( "fs" ),
	Handlebars = require( "../lib/handlebars" ),
	templatePath = __dirname + "/../template",
	templates = {};

Handlebars.registerHelper( "dependencyList", function() {
	var dependencies = this.dependencies;
	return new Handlebars.SafeString( "<ul>" + Object.keys( dependencies ).map(function( dependency ) {
		return "<li><a href=/" + dependency + "><b>" + dependency + "</b></a> (" + dependencies[ dependency ] + ")</li>";
	}) + "</ul>" );
});

Handlebars.registerHelper( "allContributors", function() {
	return new Handlebars.SafeString( this.contributors.map(function( person ) {
		return Handlebars.helpers.person( person );
	}).join( ", " ) );
});

Handlebars.registerHelper( "licenses", function() {
	return new Handlebars.SafeString( this.licenses.map(function( license ) {
		return "<a href='" + license.url + "'><b>" + license.type + "</b></a>";
	}).join( " or " ));
});

Handlebars.registerHelper( "person", function( person ) {
	var ret = person.name;
	if ( person.url ) {
		ret = "<a href='" + person.url + "'>" + ret + "</a>";
	}
	return new Handlebars.SafeString( ret );
});

function getTemplate( name, fn ) {
	if ( templates[ name ] ) {
		return fn( null, templates[ name ] );
	}

	fs.readFile( templatePath + "/" + name, "utf8", function( error, data ) {
		if ( error ) {
			return fn( error );
		}

		try {
			var template = Handlebars.compile( data );
		} catch ( error ) {
			return fn( error );
		}

		templates[ name ] = template;
		fn( null, template );
	});
}

module.exports = {
	get: getTemplate
};
