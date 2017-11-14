import {getType, karaTypesArray} from '../src/_common/domain/constants';
import {expect} from 'chai';

describe('Types test', () => {
	it('Should contain all types', () => {
		expect(karaTypesArray.length).to.equal(9);
	});

	it('Should detect type', () => {
		expect(getType('A B MV\tC D', )).to.equal('MV');
	});

	it('Should return first type found', () => {
		expect(getType('OP IN MV', )).to.equal('OP');
	});

	it('Should return undefined when no type can be found', () => {
		expect(getType('A B C')).to.be.undefined;
	});
});