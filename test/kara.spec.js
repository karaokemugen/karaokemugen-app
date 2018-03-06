import {expect} from 'chai';
import {karaDataValidationErrors} from '../src/_services/kara';

const validKara = {
	videofile: 'video.mp4',
	subfile: 'dummy.ass',
	title: 'title',
	series: 'series',
	type: 'OP',
	order: 0,
	year: 2018,
	singer: '',
	tags: '',
	songwriter: '',
	creator: '',
	author: '',
	lang: 'fre',
	KID: '6ac74940-b90c-4aea-b038-ae261eccf4b6',
	dateadded: 1509041312,
	datemodif: 1509041321,
	videosize: 0,
	videogain: 0,
	videoduration: 0,
	version: 1
};

describe('Kara validator', () => {
	it('Should valid a correct kara', () => {
		expect(karaDataValidationErrors(validKara)).to.be.undefined;
	});

	it('Should not valid a kara with missing required infos', () => {
		const invalidKara = { ...validKara, title: ''};
		expect(karaDataValidationErrors(invalidKara)).to.be.undefined;
	});

	it('Should not valid a kara without series', () => {
		const invalidKara = { ...validKara, series: ''};
		expect(karaDataValidationErrors(invalidKara)).to.have.property('series');
	});

	it('Should valid a musical kara without series', () => {
		const invalidKara = { ...validKara, type: 'MV', series: ''};
		expect(karaDataValidationErrors(invalidKara)).to.be.undefined;
	});

	it('Should not valid a kara with invalid 2B lang', () => {
		const invalidKara = { ...validKara, lang: 'france'};
		expect(karaDataValidationErrors(invalidKara)).to.have.property('lang');
	});

	it('Should not valid a kara with negative order', () => {
		const invalidKara = { ...validKara, order: -1};
		expect(karaDataValidationErrors(invalidKara)).to.have.property('order');
	});

	it('Should not valid a kara with real version', () => {
		const invalidKara = { ...validKara, version: 2.1};
		expect(karaDataValidationErrors(invalidKara)).to.have.property('version');
	});

	it('Should valid a kara with real videogain', () => {
		const invalidKara = { ...validKara, videogain: -7.75};
		expect(karaDataValidationErrors(invalidKara)).to.be.undefined;
	});

	it('Should not valid a kara with invalid UUID', () => {
		const invalidKara = { ...validKara, KID: 'rac74940-b90c-4aea-b038-ae261eccf4b6'};
		expect(karaDataValidationErrors(invalidKara)).to.have.property('KID');
	});
});
