import {expect} from 'chai';
import * as dateFunctions from '../../src/_common/utils/date';

const testDate = () => it('Testing date()', () => {
	const testRegex = /(\d{2})-(\d{2})-(\d+)/;
	
	expect(dateFunctions.date)
		.to.not.throw();

	const returnedDate = dateFunctions.date();
	
	expect(returnedDate)
		.to.be.a('string')
		.and.to.match(testRegex);
	
	const regexRes = testRegex.exec(returnedDate);
	expect((regexRes || []).length)
		.to.eql(4,`Impossible to match the 'day-month-year' pattern of ${testRegex} on '${returnedDate}' (wrong pattern matching).`);

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
	
	expect(dateFunctions.time)
		.to.not.throw();

	const returnedTime = dateFunctions.time();
	
	expect(returnedTime)
		.to.be.a('string')
		.and.to.match(testRegex);
	
	const regexRes = testRegex.exec(returnedTime);
	expect((regexRes || []).length)
		.to.eql(4,`Impossible to match the 'hours-minutes-seconds' pattern of ${testRegex} on '${testRegex}' (wrong pattern matching).`);

	const attributes = regexRes
		.filter((_, i) => i > 0);
	attributes
		.forEach((value) => expect(value).to.not.be.NaN);
	
	const attributesTestData = [['hours', 23], ['minutes', 59], ['seconds', 59]];
	attributesTestData
		.map((testData, index) => [+attributes[index], ...testData])
		.forEach((testData) => expect(testData[0], `The '${testData[1]}' value is not valid`).to.be.within(0, testData[2]));
});

export default () => {
	testDate();
	testTime();
};