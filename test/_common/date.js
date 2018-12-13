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
		.to.eql(4,`Impossible to match the 'day-month-year' pattern of ${testRegex} on '${returnedDate}' .`);

	const attributes = regexRes
		.filter((_, i) => i > 0);
	attributes
		.forEach((value) => expect(value).to.not.be.NaN);
	
	const attributesTestData = [['day', 13], ['month', 12], ['year', Number.MAX_SAFE_INTEGER]];
	attributesTestData
		.map((testData, index) => [+attributes[index], ...testData])
		.forEach((testData) => expect(testData[0], `The ${testData[1]} value is not valid`).to.be.within(1, testData[2]));
});

export default () => {
	testDate();
};