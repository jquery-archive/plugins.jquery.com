$(function() {
	var output = $( "#validator-output" );
	function log( msg ) {
		output.text( msg );
	}

	$( "input[name='files']" ).on( "change", function( event ) {
		event.preventDefault();
		var reader = new FileReader(),
			files = event.target.files,
			file = files && files[0];

		if ( !file ) {
			return;
		}

		reader.onload = function( event ) {
			var manifest, errors;
			try {
				manifest = $.parseJSON( event.target.result );
			} catch( error ) {
				return log( "Your manifest file contains invalid JSON." );
			}

			errors = Manifest.validate( manifest, null, null, file.name );
			if ( errors.length ) {
				log( "Your manifest file contains the following errors:\n\n" +
					errors.join( "\n" ) );
			} else {
				log( "Congratulations, your manifest file is valid." );
			}
		};

		reader.readAsText( file );
	});
});
