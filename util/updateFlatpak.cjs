const yaml = require('js-yaml');
const xml = require('xml-js');
const path = require('path');
const fs = require('fs/promises');

const { mainModule } = require('process');

const distX64 = process.argv[2];
const distX64SHA = process.argv[3];
const distARM64 = process.argv[4];
const distARM64SHA = process.argv[5];
const sentrycliVersion = process.argv[6];
const sentrycliX64SHA = process.argv[7];
const sentrycliARM64SHA = process.argv[8];

const yamlFile = 'moe.karaokes.mugen/moe.karaokes.mugen.yml';
const xmlFile = 'moe.karaokes.mugen/moe.karaokes.mugen.metainfo.xml';

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
	const sentryCliX64Index = flatpak.modules[0].sources.findIndex(
		e => e.url && e.url.includes('sentry-cli-Linux-x86_64')
	);
	flatpak.modules[0].sources[
		sentryCliX64Index
	].url = `https://downloads.sentry-cdn.com/sentry-cli/${sentrycliVersion}/sentry-cli-Linux-x86_64`;
	flatpak.modules[0].sources[sentryCliX64Index].sha256 = sentrycliX64SHA;
	flatpak.modules[0].sources[sentryCliX64Index]['only-arches'] = '[x86_64]';

	/** Not tested yet
	const sentryCliARM64Index = flatpak.modules[0].sources.findIndex(
		e => e.url && e.url.includes('sentry-cli-Linux-aarch64')
	);
	flatpak.modules[0].sources[
		sentryCliARM64Index
	].url = `https://downloads.sentry-cdn.com/sentry-cli/${sentrycliVersion}/sentry-cli-Linux-aarch64`;
	flatpak.modules[0].sources[sentryCliARM64Index].sha256 = sentrycliARM64SHA;
	flatpak.modules[0].sources[sentryCliARM64Index]['only-arches'] = '[aarch64]';
	*/

	// REMOVE THE INCLUDE DIST_LINUX ALONE OR ELSE BAD STUFF WILL HAPPEN
	// Please read this.
	// Please.
	const distX64Index = flatpak.modules[0].sources.findIndex(
		e => e.url && (e.url.includes('dist_linux-x64') || e.url.includes('dist_linux'))
	);
	flatpak.modules[0].sources[distX64Index].url = `https://mugen.karaokes.moe/downloads/${distX64}`;
	flatpak.modules[0].sources[distX64Index].sha256 = distX64SHA;
	flatpak.modules[0].sources[distX64Index]['only-arches'] = '[x86_64]';

	/** Not tested yet
	const distARM64Index = flatpak.modules[0].sources.findIndex(e => e.url && e.url.includes('dist_linux-arm64'));
	flatpak.modules[0].sources[distARM64Index].url = `https://mugen.karaokes.moe/downloads/${distARM64}`;
	flatpak.modules[0].sources[distARM64Index].sha256 = distARM64SHA;
	flatpak.modules[0].sources[distARM64Index]['only-arches'] = '[aarch64]';
	*/

	// Push new version into xml
	const versions = metainfo.elements[1].elements.find(e => e.name === 'releases');
	const d = new Date();
	if (!versions.elements.find(e => e.attributes.version === process.env.CI_COMMIT_REF_NAME)) {
		const month = (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1);
		versions.elements.unshift({
			type: 'element',
			name: 'release',
			attributes: {
				version: process.env.CI_COMMIT_REF_NAME,
				date: `${d.getFullYear()}-${month}-${d.getDate()}`,
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
