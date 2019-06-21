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
		"filename": "Ken le survivant RAW MP4.mp4",
		"audiogain": -7.3,
		"filesize": 3902935,
		"duration": 31,
		"default": true,
		"lyrics": [
			{
			"filename": "Ken le survivant.ass",
			"default": true,
			"version": "Default",
			"subchecksum": "lol"
			}
		]
		}
	],
	"data": {
		"authors": [],
		"created_at": "Wed Aug 22 2018 12:20:04 GMT+0200 (GMT+02:00)",
		"creators": [
		"Toei Animation"
		],
		"groups": [
		"Génération Club Dorothée",
		"Mainstream"
		],
		"kid": "c28c8739-da02-49b4-889e-b15d1e9b2139",
		"langs": [
		"fre"
		],
		"modified_at": "Wed Aug 22 2018 12:20:55 GMT+0200 (GMT+02:00)",
		"repository": "kara.moe",
		"title": "MP4 avec sous-titres à part",
		"sids": [
		"11399289-cd2c-4c7e-b90c-4d72a0db1419"
		],
		"singers": [
		"Bernard Denimal"
		],
		"songorder": 1,
		"songtype": "OP",
		"songwriters": [
		"Gérard Salesses"
		],
		"tags": [
		"TAG_ANIME",
		"TAG_TVSHOW"
		],
		"year": 1984
	}
	}

;

describe('Kara validator', () => {
	it('Should valid a correct kara', () => {
		expect(karaDataValidationErrors(validKara)).to.be.undefined;
	});
});
