let S = require('string');
let parentPrototype;
let stringJSObject;

//-------------------------------------------------------------------------------------
// ExtendedStrings constructor
//-------------------------------------------------------------------------------------
stringJSObject = S('');

parentPrototype = Object.getPrototypeOf(stringJSObject);

ExtendedStrings.prototype = stringJSObject;

ExtendedStrings.prototype.constructor = ExtendedStrings;

function ExtendedStrings(value) {
	this.setValue(value);
}

//-------------------------------------------------------------------------------------
// extendedStringMaker
//-------------------------------------------------------------------------------------
function extendedStringMaker(value) {
	if (!value) {
		return new ExtendedStrings('');
	}

	if (value instanceof ExtendedStrings) {
		return value;
	}

	return new ExtendedStrings(value);
};

//-------------------------------------------------------------------------------------
// latinise
//-------------------------------------------------------------------------------------
ExtendedStrings.prototype.latinise =
	function latinise() {
		return parentPrototype.latinise.call(S(this.s.normalize('NFC')));
	};

module.exports = extendedStringMaker;