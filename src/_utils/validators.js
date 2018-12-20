import validate from 'validate.js';
import testJSON from 'is-valid-json';
import {has as hasLang} from 'langs';
import {karaTypes, tags} from '../_services/constants';

// Validators

function integerValidator(value) {
	if(!value || !isNaN(value)) return null;

	return ` '${value}' is invalid (not an integer)`;
}

function langValidator(value) {
	if (!Array.isArray(value)) value = value.replace(/"/g, '').split(',');
	value = value.map((value) => value.trim());

	const firstInvalidLang = value.find((lang) => !(lang === 'und' || lang === 'mul' || lang === 'zxx' || hasLang('2B', lang)));
	if (firstInvalidLang) return `'${firstInvalidLang}' is invalid ISO639-2B code`;

	return null;
}

function tagsValidator(value) {
	if (!Array.isArray(value)) value = value.replace(/"/g, '').split(',');
	value = value.map((value) => value.trim());

	const firstInvalidTag = value.find((tag) => !tags.includes(tag.replace(/TAG_/,'')));
	if (firstInvalidTag) return `list '${firstInvalidTag}' is invalid (not a known tag)`;

	return null;
}

function seriesi18nValidator(value) {
	if (typeof value !== 'object') return `i18n data (${value}) is not an object`;

	const firstInvalidLang = Object.keys(value).find((lang) => !(lang === 'und' || lang === 'mul' || hasLang('2B', lang)));
	if(firstInvalidLang) return `i18n data invalid : '${firstInvalidLang}' is an invalid ISO639-2B code`;

	return null;
}

function typeValidator(value) {
	if (!karaTypes[value]) return `${value} is an invalid song type`;
	return null;
}

function boolIntValidator(value) {
	const err = ` '${value}' is invalid (must be -1, 0 or 1)`;
	if (value && ![-1, 0, 1].includes(+value)) return err;

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
	if(!value) return ` '${value}' is invalid (empty)`;

	value = toString(value);
	if (value.includes(',')) {
		const array = value.split(',');
		if (array.every(isNumber)) return null;
		return ` '${value}' is invalid (not an array of numbers)`;
	}

	if (!isNaN(value)) return null;

	return ` '${value}' is invalid (not a number)`;
}

// Validators list

const validatorsList = {
	boolIntValidator,
	numbersArrayValidator,
	integerValidator,
	seriesAliasesValidator,
	isJSON,
	langValidator,
	tagsValidator,
	typeValidator,
	seriesi18nValidator
};

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
	Object.keys(validatorsList)
		.filter((validatorName) => !validate.validators[validatorName])
		.forEach((validatorName) => validate.validators[validatorName] = validatorsList[validatorName]);
}

export function check(obj, constraints) {
	initValidators();
	return validate(obj, constraints);
}

