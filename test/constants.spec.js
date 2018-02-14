import {
	getSpecialTags,
	getType, karaTypes, karaTypesArray, karaTypesMap, specialTags, specialTagsArray,
	specialTagsMap
} from '../src/_services/constants';
import {expect} from 'chai';

describe('Kara Types', () => {
	it('Should contain all types', () => {
		expect(karaTypesArray.length).to.equal(9);
	});

	it('Should have same size as map', () => {
		expect(karaTypesMap.size).to.equal(Object.keys(karaTypes).length);
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


describe('Kara tags', () => {
	it('Should contain all special tags', () => {
		expect(specialTagsArray.length).to.equal(13);
	});

	it('Should have same size as map', () => {
		expect(specialTagsMap.size).to.equal(Object.keys(specialTags).length);
	});

	it('Should filter inexistant tags', () => {
		expect(getSpecialTags('A B PSX C\tGAME D')).to.deep.equal(['PSX', 'GAME']);
	});
});