import validate from 'validate.js';
import testJSON from 'is-valid-json';
import {has as hasLang} from 'langs';
import {karaTypes, tags} from '../../_services/constants';

function integerValidator(value) {
	if (value) {
		if (!isNaN(value)) return null;
		return ` '${value}' is invalid (not an integer)`;
	}
	return null;
}

function arrayNoCommaValidator(value) {
	if (!Array.isArray(value)) return `${value} is not an array`;
	value.forEach((e,i) => value[i] = e.trim());
	for (const elem of value) {
		if (elem.includes(',')) return `'${value}' contains an element with a comma (${elem})`;
	}
	return null;
}

function langValidator(value) {
	if (!Array.isArray(value)) value = value.replace('"', '').split(',');
	value.forEach((e,i) => value[i] = e.trim());
	let result = null;
	for (const lang of value) {
		if (!(lang === 'und' || lang === 'mul' || lang === 'zxx' || hasLang('2B', lang))) {
			result = `'${lang}' is invalid ISO639-2B code`;
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
		if (!tags.includes(tag.replace(/TAG_/,''))) {
			result = `list '${value}' is invalid (not a known tag)`;
			break;
		}
	}
	return result;
}

function seriesi18nValidator(value) {
	if (typeof value !== 'object') return `i18n data (${value}) is not an object`;
	for (const lang of Object.keys(value)) {
		if (!(lang === 'und' || lang === 'mul' || hasLang('2B', lang))) {
			return `i18n data invalid : '${lang}' is an invalid ISO639-2B code`;
		}
	}
	return null;
}

function typeValidator(value) {
	if (!karaTypes[value]) return `${value} is an invalid song type`;
	return null;
}

function boolIntValidator(value) {
	const err = ` '${value}' is invalid (must be -1, 0 or 1)`;
	if (value && +value !== -1 && +value !== 1 && +value !== 0) return err;
	return null;
}

function seriesAliasesValidator(value) {
	if (!value) return null;
	if (!Array.isArray(value)) return ` '${value}' is invalid (not an array)`;
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
			return ` '${value}' is invalid (not an array of numbers)`;
		}
		if (!isNaN(value)) return null;
		return ` '${value}' is invalid (not a number)`;
	}
	return ` '${value}' is invalid (empty)`;
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
	validate.validators.boolIntValidator = boolIntValidator;
	validate.validators.numbersArrayValidator = numbersArrayValidator;
	validate.validators.integerValidator = integerValidator;
	validate.validators.seriesAliasesValidator = seriesAliasesValidator;
	validate.validators.isJSON = isJSON;
	validate.validators.langValidator = langValidator;
	validate.validators.tagsValidator = tagsValidator;
	validate.validators.typeValidator = typeValidator;
	validate.validators.seriesi18nValidator = seriesi18nValidator;
	validate.validators.arrayNoCommaValidator = arrayNoCommaValidator;
}

export function check(obj, constraints) {
	initValidators();
	return validate(obj, constraints);
}

