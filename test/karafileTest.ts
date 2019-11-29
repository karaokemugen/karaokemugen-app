import {expect} from 'chai';
import {karaDataValidationErrors} from '../src/lib/dao/karafile';
import { KaraFileV4 } from '../src/lib/types/kara';

const validKara: KaraFileV4 = {
	"header": {
	  "version": 4,
	  "description": "Karaoke Mugen Karaoke Data File"
	},
	"medias": [
	  {
		"version": "Default",
		"filename": "Dragon Ball - OP - Maka fushigi Adventure.avi",
		"audiogain": -4.24,
		"filesize": 3072541,
		"duration": 108,
		"default": true,
		"lyrics": [
		  {
			"filename": "Dragon Ball - OP - Maka fushigi Adventure.ass",
			"default": true,
			"version": "Default",
			"subchecksum": "baba5d43275dc7ff1d75d12eb2594517"
		  }
		]
	  }
	],
	"data": {
	  "created_at": "Wed Aug 22 2018 12:21:28 GMT+0200 (GMT+02:00)",
	  "kid": "a9c17ee5-b0f1-43d7-a1e0-0babf5997bde",
	  "modified_at": "Fri Jul 19 2019 11:20:44 GMT+0200 (GMT+02:00)",
	  "repository": "kara.moe",
	  "sids": [
		"4987f7bf-3867-4ccc-a47c-4c27f756a28b"
	  ],
	  "tags": {
		"creators": [
		  "f694bf43-b427-4244-9744-9d3f84fd8a31"
		],
		"families": [
		  "0377db02-3af6-43b8-9b08-c759df3d25c3"
		],
		"genres": [
		  "a0aeef4a-6428-45ff-a6e1-468b595930c2"
		],
		"langs": [
		  "4dcf9614-7914-42aa-99f4-dbce2e059133"
		],
		"origins": [
		  "938de218-5343-4865-94d3-fb33f2eaa152"
		],
		"singers": [
		  "e5a67f06-d08b-4f63-800b-31c7f90995be"
		],
		"songtypes": [
		  "f02ad9b3-0bd9-4aad-85b3-9976739ba0e4"
		],
		"songwriters": [
		  "4c786551-95e2-4aaa-9aca-792796abd9ec",
		  "12bf3975-e982-4cf7-900b-1784cbbae224"
		]
	  },
	  "title": "Maka fushigi Adventure",
	  "year": 1986
	}
  }
;

describe('Kara validator', () => {
	it('Should valid a correct kara', () => {
		expect(karaDataValidationErrors(validKara)).to.be.undefined;
	});
});
