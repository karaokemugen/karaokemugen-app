import validate from 'validate.js';
import testJSON from 'is-valid-json';
import {has as hasLang} from 'langs';

function integerValidator(value) {
	if (value) {
		if (!isNaN(value)) return null;
		return ` '${value}' is invalid`;
	}
	return null;			
}

function langValidator(value) {
	const langs = value.replace('"', '').split(',');
	let result = null;
	for (const lang of langs) {		
		if (!(lang === 'und' || lang === 'mul' || hasLang('2B', lang))) {
			result = `Lang '${lang}' is invalid`;
			break;
		}
	}
	return result;
}

function boolIntValidator(value) {
	if (value && +value !== 0 && +value !== 1) return ` '${value}' is invalid`;	
	return null;
}

function isJSON(value) {
	if (testJSON(value)) return null;
	return ` '${value}' is invalid JSON`;	
}

function isNumber(value) {
	return !isNaN(value);
}

function numbersArrayValidator(value) {
	if (value) {		
		value = '' + value;
		if (value.includes(',')) {
			const array = value.split(',');
			if (array.every(isNumber)) return null;
			return ` '${value}' is invalid`;	
		}
		if (!isNaN(value)) return null;
		return ` '${value}' is invalid`;	
	}
	return ` '${value}' is invalid`;
}

// Sanitizers

export function unescape(str) {
	return str
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, '\'')
		.replace(/&#x3A;/g, ':')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}

// Init

export function initValidators() {
	if (!validate.validators.boolIntValidator) validate.validators.boolIntValidator = boolIntValidator;
	if (!validate.validators.numbersArrayValidator) validate.validators.numbersArrayValidator = numbersArrayValidator;
	if (!validate.validators.integerValidator) validate.validators.integerValidator = integerValidator;
	if (!validate.validators.isJSON) validate.validators.isJSON = isJSON;
	if (!validate.validators.langValidator) validate.validators.langValidator = langValidator;
}

export function check(obj, constraints) {
	initValidators();
	return validate(obj, constraints);
}

