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
	
	expect(dateFunctions.time)
		.to.not.throw();

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
	
	const testDataToWork = [['23:32:09', 84729], ['12:34:65', 45305], ['00:34:65', 2105], ['00:52:65', 3185], ['0:52:65', 3185], ['0:0:0', 0]];
	testDataToWork
		.forEach((testData) => expect(() => dateFunctions.timeToSeconds(testData[0]))
			.to.not.throw()
			.and.to.be.a('number')
			.and.equal(testData[1])
		);
});

export default () => {
	testDate();
	testTime();
	testTimeToSeconds();
};