var util = require( "util" );

function UserError( msg ) {
	Error.call( this );
	this.message = msg;
	this.userError = true;
	Error.captureStackTrace( this, this.constructor );
};

util.inherits( UserError, Error );

module.exports = UserError;
