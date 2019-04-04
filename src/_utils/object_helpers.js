import transform from 'lodash.transform';
import isEqual from 'lodash.isEqual';

// Function to extract differences between objects. First argument is the new object, second is the defaults.
export function difference(object, base) {
	function changes(object, base) {
		return transform(object, (result, value, key) => {
			if (!isEqual(value, base[key])) {
				result[key] = (typeof value === 'object' && typeof base[key] === 'object') ? changes(value, base[key]) : value;
			}
		});
	}
	return changes(object, base);
}

// Function to clear empty objects inside of an object.
export function clearEmpties(o) {
	for (var k in o) {
	  	if (!o[k] || typeof o[k] !== "object") {
			continue // If null or not an object, skip to the next iteration
	  	}
		  // The property is an object
	  	clearEmpties(o[k]); // <-- Make a recursive call on the nested object
	  	if (Object.keys(o[k]).length === 0) {
			delete o[k]; // The object had no properties, so delete that property
	  	}
	}
}