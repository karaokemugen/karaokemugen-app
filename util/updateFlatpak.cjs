const yaml = require('js-yaml');
const xml = require('xml-js');
const path = require('path');
const fs = require('fs/promises');

const { mainModule } = require('process');

const dist = process.argv[2];
const distSHA = process.argv[3];
const sentrycliVersion = process.argv[4];
const sentrycliSHA = process.argv[5];

const yamlFile = 'flathub/moe.karaokes.mugen.app.yml';
const xmlFile = 'flathub/moe.karaokes.mugen.app.metainfo.xml';

async function main() {
	const yamldata = await fs.readFile(yamlFile, 'utf-8');
	const xmldata = await fs.readFile(xmlFile, 'utf-8');
	const pjsondata = await fs.readFile('package.json', 'utf-8');

	const pjson = JSON.parse(pjsondata);
	const flatpak = yaml.load(yamldata);
	const metainfo = xml.xml2js(xmldata);

	// Updating git info
	flatpak.modules[0].sources[0].commit = process.env.CI_COMMIT_SHA;
	flatpak.modules[0].sources[0].tag = process.env.CI_COMMIT_REF_NAME;

	// Updating fetches
	flatpak.modules[0].sources[8].url = `https://downloads.sentry-cdn.com/sentry-cli/${sentrycliVersion}/sentry-cli-Linux-x86_64`;
	flatpak.modules[0].sources[8].sha256 = sentrycliSHA;

	flatpak.modules[0].sources[9].url = `https://mugen.karaokes.moe/downloads/${dist}`;
	flatpak.modules[0].sources[9].sha256 = distSHA;

	// Push new version into xml
	const versions = metainfo.elements[1].elements.find(e => e.name === 'releases');
	const d = new Date();
	if (!versions.elements.find(e => e.attributes.version === process.env.CI_COMMIT_REF_NAME)) {
		versions.elements.unshift({
			type: 'element',
			name: 'release',
			attributes: {
				version: process.env.CI_COMMIT_REF_NAME,
				date: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
			},
		});
	}

	// Write files
	console.log(JSON.stringify(flatpak, null, 2));
	console.log(JSON.stringify(metainfo, null, 2));
	await fs.writeFile(yamlFile, yaml.dump(flatpak), 'utf-8');
	await fs.writeFile(xmlFile, xml.js2xml(metainfo, { spaces: '\t' }), 'utf-8');
}

main().catch(err => console.log(err));
