import validate from 'validate.js';
import testJSON from 'is-valid-json';
import {has as hasLang} from 'langs';
import {karaTypes} from '../../_services/constants';

function integerValidator(value) {
	if (value) {
		if (!isNaN(value)) return null;
		return ` '${value}' is invalid`;
	}
	return null;
}

function langValidator(value) {
	if (!Array.isArray(value)) value = value.replace('"', '').split(',');
	value.forEach((e,i) => value[i] = e.trim());
	let result = null;
	for (const lang of value) {
		if (!(lang === 'und' || lang === 'mul' || hasLang('2B', lang))) {
			result = `'${lang}' is invalid`;
			break;
		}
	}
	return result;
}

function tagsValidator(value) {
	if (!Array.isArray(value)) value = value.replace('"', '').split(',');
	value.forEach((e,i) => value[i] = e.trim());
	let result = null;
	for (const tag of value) {
		if (!tag.startsWith('TAG_')) {
			result = `list '${value}' is invalid`;
			break;
		}
	}
	return result;
}

function typeValidator(value) {
	if (!karaTypes[value]) return `${value} is invalid`;
	return null;
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
		.replace(/&amp;/g, '&')
		;
}

export function sanitize(str) {
	return str
		.replace(/'/g, '\\\'');
}

// Init

export function initValidators() {
	if (!validate.validators.boolIntValidator) validate.validators.boolIntValidator = boolIntValidator;
	if (!validate.validators.numbersArrayValidator) validate.validators.numbersArrayValidator = numbersArrayValidator;
	if (!validate.validators.integerValidator) validate.validators.integerValidator = integerValidator;
	if (!validate.validators.isJSON) validate.validators.isJSON = isJSON;
	if (!validate.validators.langValidator) validate.validators.langValidator = langValidator;
	if (!validate.validators.tagsValidator) validate.validators.tagsValidator = tagsValidator;
	if (!validate.validators.typeValidator) validate.validators.typeValidator = typeValidator;
}

export function check(obj, constraints) {
	initValidators();
	return validate(obj, constraints);
}

