import {readdirSync} from 'fs';
import {join, parse} from 'path';

const dir = join(__dirname, '_common');

readdirSync(dir)
	.map((file) => ({
		file,
		testFunction: require(`${dir}/${file}`).default
	}))
	.forEach((test) => describe(`${parse(test.file).name} _common validator`, () => {
		test.testFunction();
	}));