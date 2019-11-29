import {expect} from 'chai';
import * as dateFunctions from '../src/lib/utils/date';

const testDate = () => it('Testing date()', () => {
	const testRegex = /(\d{2})-(\d{2})-(\d+)/;

	const returnedDate = dateFunctions.date();

	expect(returnedDate)
		.to.be.a('string')
		.and.to.match(testRegex);

	const regexRes = testRegex.exec(returnedDate);
	expect(regexRes || [])
		.to.have.lengthOf(4,`Impossible to match the 'day-month-year' pattern of ${testRegex} on '${returnedDate}' (wrong pattern matching)`);

	const attributes = regexRes
		.filter((_, i) => i > 0);
	attributes
		.forEach((value) => expect(value).to.not.be.NaN);
});

const testTime = () => it('Testing time()', () => {
	const testRegex = /(\d{2}):(\d{2}):(\d{2})/;

	const returnedTime = dateFunctions.time();

	expect(returnedTime)
		.to.be.a('string')
		.and.to.match(testRegex);

	const regexRes = testRegex.exec(returnedTime);
	expect(regexRes || [])
		.to.have.lengthOf(4,`Impossible to match the 'hours-minutes-seconds' pattern of ${testRegex} on '${testRegex}' (wrong pattern matching)`);

	const attributes = regexRes
		.filter((_, i) => i > 0);
	attributes
		.forEach((value) => expect(value).to.not.be.NaN);
});

const testTimeToSeconds = () => it('Testing time()', () => {

	const testDataToThrow = [undefined, null, 'blablabla', '00:00', 'AZ:AZ:AZ', '01:ZZ:03', '132:34:65', '-1:52:65'];
	testDataToThrow
		.forEach((testData) => expect(() => dateFunctions.timeToSeconds(testData), `Error with the parameter '${testData}'`).to.throw());

	const testDataToWork = ['23:32:09', '12:34:34', '00:34:55', '00:52:45', '0:52:22.74', '0:52:18', '0:0:0'];
	const testDataToCompare = [84729, 45274, 2095, 3165, 3142, 3138, 0];
	testDataToWork
		.forEach((dataArray, index) => expect(dateFunctions.timeToSeconds(dataArray), `Error with the parameter '${dataArray}'`).to.be.equal(testDataToCompare[index]));
});

const testDuration = () => it('Testing duration()', () => {
	const wrongValues = [null, undefined, 0.2, -1];
	wrongValues
		.forEach((testData) => expect(() => dateFunctions.duration(testData), `Error with the parameter '${testData}'`).to.throw());
});

describe('Date test', () => {
	testDate();
	testTime();
	testTimeToSeconds();
	testDuration();
});