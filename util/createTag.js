const tpath = 'app/repos/Local/tags';

const name = process.argv[2];
const {v4} = require('uuid');
const fs = require('fs');
const {resolve} = require('path');

const tag = {
	"header": {
	  "description": "Karaoke Mugen Tag File",
	  "version": 1
	},
	"tag": {
	  "modified_at": "2021-01-04T08:48:04.860Z",
	  "name": "Alternative",
	  "repository": "kara.moe",
	  "short": "ALT",
	  "tid": "9f63c359-d1bf-425a-bcf5-b245c2c9211d",
	  "types": [
		"versions"
	  ]
	}
  };

tag.tag.tid = v4();
tag.tag.name = name;
tag.tag.short = process.argv[3];
tag.tag.modified_at = new Date().toISOString();

fs.writeFileSync(resolve(tpath, `${name}.${tag.tag.tid.substring(0, 8)}.tag.json`), JSON.stringify(tag, null, 2), 'utf-8');