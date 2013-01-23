(function() {

	var log = (function(){
		var logger = function(content, skip) {
			if ( !skip ) {
				content = "<div>"+content+"</div>";
			}
			logger.output.push( content );
		};
		logger.heading = function( content ) {
			logger( "<h2>"+content+"</h2>", true );
		};
		logger.details = function( content ) {
			logger( "<pre>"+content+"</pre>", true );
		};	
		logger.clear = function() {
      logger.output = [];
    };
		logger.clear();
		return logger;
	})();

  var helpLinks = {
    people: "<a href=\"/docs/package-manifest/#people-fields\">People Fields</a>"
  };

  var handler = function( e ) {
		e.preventDefault();
		var output = $( ".validator-output" );
    log.clear();
		var files = e.target.files;
		var file = files && files[0];
		if ( !file ) {
			return;
		}

		var filename = file.name.replace(".jquery.json", "" );
		var reader = new FileReader();

		// Closure to capture the file information.
		reader.onload = function( e ) {
			var result = e.target.result;
			var manifest;
			try {
				manifest = $.parseJSON( result );
			} catch( e ) {
				log.heading( "JSON Validation Error" );
				log( "Your json is not valid. See <a href=\"//json.org\">json.org</a> for more information." );
				log.details( e.name + ": " + e.type + " " + e['arguments'].join(',') );
			}
			if ( manifest ) {  
				var required = "name version title author licenses dependencies".split(" ");
				$.each( required, function( i, v ) {
					if ( !manifest[ v ] ) {
						log( "<code>" + v + "</code> attribute is required" );
					}
				});
				
				if ( manifest.name && ( manifest.name !== filename ) ) {
					log( "expected <code>" + manifest.name + ".jquery.json</code> as filename due " + 
							 "to <code>name</code> attribute of '" + manifest.name + "'" );
				}
				
				if ( manifest.author ) {
					if ( typeof manifest.author !== "object" ) {
						log( "<code>author</code> property must be an object. See " + helpLinks.people + " for more information" );
					} else if ( !manifest.author.name ) {
						log( "the <code>name</code> propety of the <code>author</code> people object is required. See " + helpLinks.people + " for more information" );
					}
				}

        if ( manifest.keywords ) {
					if ( $.type( manifest.keywords ) !== "array" ) {
						log( "<code>keywords</code> property must be an array" );
					} else {	
						$.each( manifest.keywords, function( i, v ) {
							if ( !(/^[a-zA-Z0-9\.\-]+$/).test( v ) ) { 
                log( "Keyword <code>" + v + "</code> has invalid characters. Only letters, numbers, periods and hiphens are allowed" );
							}
						});
					}
				}

		  if ( manifest.licenses ) {
				if ( $.type( manifest.licenses ) !== "array" ) {
					log( "<code>licences</code> property must be an array" );
				} else {	
				  $.each( manifest.licenses, function( i, v ) {
            if ( $.type( v ) !== "object" ) {
							log( "The elements in the licenses array must be objects" );
						} else {
							if ( !v.type ) {
								log( "Each license object must have a <code>type</code> property" );
							}
							if ( !v.url ) {
								log( "Each license object must have a <code>url</code> property" );
							}
						}
					});
				}
			}
         
							
						 
         
			}
			var logContent = log.output.join('');
			output.html( logContent || "<h2>Your manifest file passed all tests</h2>" );
		};
				
		// Read in the image file as a data URL.
		reader.readAsText(file);
	};

  $( document ).ready( function() {
    $( 'input[name="files"]' ).on( 'change', handler );
  });

})();
