import {expect} from 'chai';
import * as dateFunctions from '../../src/_common/utils/date';

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
	
	const attributesTestData = [['day', 31], ['month', 12], ['year', Number.MAX_SAFE_INTEGER]];
	attributesTestData
		.map((testData, index) => [+attributes[index], ...testData])
		.forEach((testData) => expect(testData[0], `The '${testData[1]}' value is not valid`).to.be.within(1, testData[2]));
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
	
	const attributesTestData = [['hours', 23], ['minutes', 59], ['seconds', 59]];
	attributesTestData
		.map((testData, index) => [+attributes[index], ...testData])
		.forEach((testData) => expect(testData[0], `The '${testData[1]}' value is not valid`).to.be.within(0, testData[2]));
});

const testTimeToSeconds = () => it('Testing time()', () => {

	const testDataToThrow = [undefined, null, 0, -1, 1, 'blablabla', '00:00', 'AZ:AZ:AZ', '01:ZZ:03', '132:34:65', '-1:52:65'];
	testDataToThrow
		.forEach((testData) => expect(() => dateFunctions.timeToSeconds(testData), `Error with the parameter '${testData}'`).to.throw());
	
	const testDataToWork = [['23:32:09', 84729], ['12:34:34', 45274], ['00:34:55', 2095], ['00:52:45', 3165], ['0:52:22.74', 3142], ['0:52:18', 3138], ['0:0:0', 0]];
	testDataToWork
		.forEach((dataArray) => expect(dateFunctions.timeToSeconds(dataArray[0]), `Error with the parameter '${dataArray[0]}'`).to.be.equal(dataArray[1]));
});

const testDuration = () => it('Testing duration()', () => {
	const wrongValues = ['a', null, undefined, 0.2, -1, 0];
	wrongValues
		.forEach((testData) => expect(() => dateFunctions.duration(testData), `Error with the parameter '${testData}'`).to.throw());
});

export default () => {
	global.__ = (id) => {
		const i18nValues = ['DAY', 'HOUR', 'MINUTE', 'SECOND'];
		if(!i18nValues.includes(id)){
			throw `The id '${id}' does not exist in the i18n module.`;
		}
		return `${id}_I18N`;
	};
	testDate();
	testTime();
	testTimeToSeconds();
	testDuration();
};