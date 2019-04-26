import validate from 'validate.js';
import testJSON from 'is-valid-json';
import {has as hasLang} from 'langs';
import {uuidRegexp, karaTypes, tags} from '../services/constants';

// Validators

function integerValidator(value: any) {
	if(isNumber(value)) return null;
	return ` '${value}' is invalid (not an integer)`;
}

function arrayNoCommaValidator(value: string[]) {
	if (!Array.isArray(value)) return `${value} is not an array`;
	value = value.map((value) => value.trim());
	for (const elem of value) {
		if (elem.includes(',')) return `'${value}' contains an element with a comma (${elem})`;
	}
	return null;
}


function langValidator(value: any) {
	if (!Array.isArray(value)) value = value.replace(/"/g, '').split(',');
	value = value.map((value: string) => value.trim());

	const firstInvalidLang = value.find((lang: string) => !(lang === 'und' || lang === 'mul' || lang === 'zxx' || hasLang('2B', lang)));
	if (firstInvalidLang) return `'${firstInvalidLang}' is invalid ISO639-2B code`;

	return null;
}

function tagsValidator(value: any) {
	if (!Array.isArray(value)) value = value.replace(/"/g, '').split(',');
	value = value.map((value: string) => value.trim());

	const firstInvalidTag = value.find((tag: string) => !tags.includes(tag.replace(/TAG_/,'')));
	if (firstInvalidTag) return `list '${firstInvalidTag}' is invalid (not a known tag)`;

	return null;
}

function seriesi18nValidator(value: object) {
	if (typeof value !== 'object') return `i18n data (${value}) is not an object`;

	const firstInvalidLang = Object.keys(value).find((lang) => !(lang === 'und' || lang === 'mul' || hasLang('2B', lang)));
	if(firstInvalidLang) return `i18n data invalid : '${firstInvalidLang}' is an invalid ISO639-2B code`;

	return null;
}

function typeValidator(value: string) {
	if (!karaTypes[value]) return `${value} is an invalid song type`;
	return null;
}

function boolUndefinedValidator(value: any) {
	if (value === true ||
		value === false ||
		value === undefined ||
		value === 'true' ||
		value === 'false') return null;
	return `${value} must be strictly boolean`;
}

function seriesAliasesValidator(value: string[]) {
	if (!value) return null;

	if (!Array.isArray(value)) return ` '${value}' is invalid (not an array)`;

	return null;
}

function isJSON(value: string) {
	if (testJSON(value)) return null;
	return ` '${value}' is invalid JSON`;
}

export function isNumber(value: any) {
	return !isNaN(value);
}

function uuidArrayValidator(value: string) {
	if(!value) return ` '${value}' is invalid (empty)`;
	value = value.toString();
	if (value.includes(',')) {
		const array = value.split(',');
		if (array.some(e => !e)) return `'${value} contains an undefined`;
		if (array.every(e => new RegExp(uuidRegexp).test(e))) return null;
		return ` '${value}' is invalid (not an array of UUIDs)`;
	}
	if (new RegExp(uuidRegexp).test(value)) return null;

	return ` '${value}' is invalid (not a UUID)`;
}

function numbersArrayValidator(value: string) {
	if(!value) return ` '${value}' is invalid (empty)`;
	value = value.toString();
	if (value.includes(',')) {
		const array = value.split(',');
		if (array.every(isNumber)) return null;
		return ` '${value}' is invalid (not an array of numbers)`;
	}
	if (isNumber(value)) return null;

	return ` '${value}' is invalid (not a number)`;
}

function isArray(value: any){
	if(Array.isArray(value)) return null;
	return `'${value}' is invalid (not an array)`;
}
// Validators list

const validatorsList = {
	numbersArrayValidator,
	integerValidator,
	seriesAliasesValidator,
	isJSON,
	isArray,
	langValidator,
	tagsValidator,
	typeValidator,
	seriesi18nValidator,
	arrayNoCommaValidator,
	uuidArrayValidator,
	boolUndefinedValidator,
};

// Sanitizers

export function unescape(str: string) {
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

export function check(obj: any, constraints: any) {
	initValidators();
	return validate(obj, constraints);
}

