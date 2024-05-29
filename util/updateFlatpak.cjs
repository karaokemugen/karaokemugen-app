/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
const yaml = require('js-yaml');
const xml = require('xml-js');
const path = require('path');
const fs = require('fs/promises');

const { mainModule } = require('process');

const [
	_,
	// eslint-disable-next-line no-redeclare
	__,
	sentrycliVersion,
	sentrycliX64SHA,
	sentrycliARM64SHA,
	sharpVersion,
	sharpSHA,
	libvipsVersion,
	libvipsSHA,
] = process.argv;

const yamlFile = 'moe.karaokes.mugen/moe.karaokes.mugen.yml';
const xmlFile = 'moe.karaokes.mugen/moe.karaokes.mugen.metainfo.xml';

async function main() {
	const yamldata = await fs.readFile(yamlFile, 'utf-8');
	const xmldata = await fs.readFile(xmlFile, 'utf-8');
	const pjsondata = await fs.readFile('package.json', 'utf-8');

	const pjson = JSON.parse(pjsondata);
	const flatpak = yaml.load(yamldata);
	const metainfo = xml.xml2js(xmldata);

	const karaokemugenModule = flatpak.modules.find(module => module.name === 'karaokemugen');
	const karaokemugenAppSource = karaokemugenModule.sources.find(
		source => source.url === 'https://gitlab.com/karaokemugen/code/karaokemugen-app'
	);
	// Updating git info
	karaokemugenAppSource.commit = process.env.CI_COMMIT_SHA;
	karaokemugenAppSource.tag = process.env.CI_COMMIT_REF_NAME;

	// Updating fetches
	const sentryCliX64Source = karaokemugenModule.sources.find(e => e.url && e.url.includes('sentry-cli-Linux-x86_64'));
	sentryCliX64Source.url = `https://downloads.sentry-cdn.com/sentry-cli/${sentrycliVersion}/sentry-cli-Linux-x86_64`;
	sentryCliX64Source.sha256 = sentrycliX64SHA;
	sentryCliX64Source['only-arches'] = '[x86_64]';

	// Sharp dependencies (for QR Code) need to be download and not built, so we're editing the manifest
	karaokemugenModule['build-options'].env.LIBVIPS_VERSION = libvipsVersion;
	const libvipsSource = karaokemugenModule.sources.find(e => e.url && e.url.includes('sharp-libvips'));

	libvipsSource.url = `https://github.com/lovell/sharp-libvips/releases/download/v${libvipsVersion}/libvips-${libvipsVersion}-linux-x64.tar.br`;
	libvipsSource.sha256 = libvipsSHA;
	libvipsSource['only-arches'] = '[x86_64]';

	const sharpSource = karaokemugenModule.sources.find(
		e => e.url && e.url.includes('https://github.com/lovell/sharp/releases')
	);

	sharpSource.url = `https://github.com/lovell/sharp/releases/download/v${sharpVersion}/sharp-v${sharpVersion}-napi-v7-linux-x64.tar.gz`;
	sharpSource.sha256 = sharpSHA;
	sharpSource['only-arches'] = '[x86_64]';

	/** Not tested yet
	const sentryCliARM64Source = karaokemugenModule.sources.find(
		e => e.url && e.url.includes('sentry-cli-Linux-aarch64')
	);
	sentryCliARM64Source.url = `https://downloads.sentry-cdn.com/sentry-cli/${sentrycliVersion}/sentry-cli-Linux-aarch64`;
	sentryCliARM64Source.sha256 = sentrycliARM64SHA;
	sentryCliARM64Source['only-arches'] = '[aarch64]';
	*/

	// Push new version into xml
	const versions = metainfo.elements[1].elements.find(e => e.name === 'releases');
	const d = new Date();
	if (!versions.elements.find(e => e.attributes.version === process.env.CI_COMMIT_REF_NAME)) {
		const month = (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1);
		const day = (d.getDate() < 10 ? '0' : '') + d.getDate();
		versions.elements.unshift({
			type: 'element',
			name: 'release',
			attributes: {
				version: process.env.CI_COMMIT_REF_NAME,
				date: `${d.getFullYear()}-${month}-${day}`,
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
