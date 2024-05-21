import fs from 'fs/promises';
import fsExtra from 'fs-extra';
import path from 'path';
import { v4 as uuidV4 } from 'uuid';

import { formatKaraV4 } from '../src/lib/dao/karafile';
import { formatTagFile } from '../src/lib/dao/tagfile';
import { defineFilename } from '../src/lib/services/karaCreation';
import { supportedFiles, tagTypes } from '../src/lib/utils/constants';
import { extractSubtitles, getMediaInfo } from '../src/lib/utils/ffmpeg';
import { fileExists, sanitizeFile } from '../src/lib/utils/files';

// Magic from StackOverflow :
// https://stackoverflow.com/posts/75733715/revisions
const unfill = (
	template,
	file,
	match = file.match(new RegExp(template.replace(/{[^}]+\}/g, s => `(?<${s.slice(1, -1)}>.+)`)))
) => match && match.groups;

/* Example for unfill : 
console.log(unfill(
	'{id}_{language}_{singer}_{title}_{type}_{series}',
	'1238_jp_France Gall_Le temps de la rentrée!_Music Video_x'
  ));

  Returns an object with properties id, language, singer, etc.
*/

async function main() {
	const srcDir = process.argv[2];
	const destDir = process.argv[3];
	const fileTemplate = process.argv[4];
	const dryRun = process.argv[5] === '--dry-run';
	if (!srcDir || !destDir || !fileTemplate) {
		console.log('One argument is missing.');
		process.exit(1);
	}

	const mediasDir = path.resolve(destDir, 'medias');
	const tagDir = path.resolve(destDir, 'json', 'tags');
	const karaDir = path.resolve(destDir, 'json', 'karaokes');
	const subDir = path.resolve(destDir, 'json', 'lyrics');

	try {
		if (!dryRun) {
			await fsExtra.mkdirp(karaDir);
			await fsExtra.mkdirp(tagDir);
			await fsExtra.mkdirp(subDir);
			await fsExtra.mkdirp(mediasDir);
		}
	} catch (err) {
		// Not a problem
	}

	const srcFiles = await fs.readdir(srcDir);

	const tags = [];

	// First we need to make a pass through the files and inventory which tags we'll need to create
	for (const file of srcFiles) {
		// Do not parse non-video files
		const extension = path.extname(file).replace(/^./, '');
		const baseFile = path.basename(file, `.${extension}`);
		if (!supportedFiles.video.includes(extension) && !supportedFiles.audio.includes(extension)) {
			continue;
		}

		const songTags = unfill(fileTemplate, baseFile);
		let title = '';
		const kara = {};
		for (const tagType of Object.keys(songTags)) {
			// Unknown tagtypes are ignored
			if (!tagTypes[tagType] && tagType !== 'title' && tagType !== 'ext') {
				continue;
			}
			if (tagType === 'title') {
				title = songTags[tagType];
				continue;
			}
			// Try to find tag in our consolidated list of tags. If not found we'll create it.
			// We use name + type for that.
			let karaTag = tags.find(t => t.name === songTags[tagType] && t.types.includes(tagTypes[tagType]));
			if (!karaTag) {
				karaTag = {
					types: [tagTypes[tagType]],
					name: songTags[tagType],
					tid: uuidV4(),
				};
				karaTag.tagfile = `${sanitizeFile(karaTag.name)}.${karaTag.tid.substring(0, 8)}.tag.json`;
				tags.push(karaTag);
			}
			kara[tagType] = [
				{
					name: karaTag.name,
					tid: karaTag.tid,
				},
			];
		}

		// This is default. It's difficult to determine the title's language.
		kara.titles_default_language = 'eng';
		kara.titles = { eng: title };

		const baseKaraFileName = await defineFilename(formatKaraV4(kara), null, tags);

		const karaFile = `${baseKaraFileName}.kara.json`;

		// Media and subfile.
		// We need media info and to see if we have subtitles / extract them.
		const fullPath = path.resolve(srcDir, file);
		const finalMediaFile = `${baseKaraFileName}.${extension}`;

		await fs.copyFile(fullPath, path.resolve(mediasDir, finalMediaFile));

		const mediaInfo = await getMediaInfo(fullPath);
		kara.loudnorm = mediaInfo.loudnorm;
		kara.duration = mediaInfo.duration;
		kara.mediafile = finalMediaFile;
		kara.mediasize = mediaInfo.size;

		// Let's talk subfiles.
		let subFile = '';
		for (const ext of supportedFiles.lyrics) {
			// Find a file with that extension
			const subFileExt = `${baseFile}.${ext}`;
			const srcSubPath = path.resolve(srcDir, subFileExt);
			if (await fileExists(srcSubPath)) {
				subFile = srcSubPath;
				break;
			}
		}
		// If no subfile is found, we'll try to extract it from the video file.
		if (!subFile) {
			try {
				if (!dryRun) await extractSubtitles(fullPath, 'sub.ass');
				subFile = 'sub.ass';
			} catch (err) {
				// No file found, it's daijoubou.
			}
		}
		// Let's retest our subfile. No else on the condition above since subfile can still be modified if extracted successfully
		if (subFile) {
			const subExt = path.extname(subFile);
			const finalSubFile = `${baseKaraFileName}${subExt}`;
			kara.subfile = finalSubFile;
			const finalSubPath = path.resolve(subDir, finalSubFile);
			if (!dryRun) await fs.copyFile(subFile, finalSubPath);
		}

		if (!dryRun)
			await fs.writeFile(path.resolve(karaDir, karaFile), JSON.stringify(formatKaraV4(kara), null, 2), 'utf-8');
		console.log(`${file} => ${karaFile}`);
	}
	if (!dryRun) {
		if (!dryRun)
			for (const tag of tags) {
				fs.writeFile(path.resolve(tagDir, tag.tagfile), JSON.stringify(formatTagFile(tag), null, 2), 'utf-8');
			}
	}
	console.log('Tags created : ');
	console.log(tags.map(t => t.tagfile));
}

await main().catch(err => console.log(err));
