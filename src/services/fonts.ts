import fs from 'fs/promises';
import { basename, resolve } from 'path';

import { resolvedPath, resolvedPathRepos } from '../lib/utils/config.js';
import logger from '../lib/utils/logger.js';
import Sentry from '../utils/sentry.js';

const service = 'Fonts';

export async function initFonts() {
	try {
		const destDir = resolvedPath('Fonts');
		const fontsDirs = resolvedPathRepos('Fonts').reverse();
		// We'll treat them in reverse order to respect repository priority. The lowest directories are copied first so any duplicate font is overwritten by higher-priority repos
		const installedFonts = new Set();
		for (const dir of fontsDirs) {
			const files = await fs.readdir(dir);
			for (const file of files) {
				installedFonts.add(file);
				const source = resolve(dir, file);
				logger.info(`Copying font ${file} from ${dir} to ${destDir}...`, { service });
				await fs.copyFile(source, resolve(destDir, file));
			}
		}
		// Cleaning up fonts folder
		const destFiles = await fs.readdir(destDir);
		for (const destFile of destFiles) {
			if (!installedFonts.has(destFile)) {
				logger.info(`Removing unused font ${destFile}`);
				fs.unlink(resolve(destDir, destFile)).catch();
			}
		}
	} catch (err) {
		// Failure isn't fatal
		logger.error(`Failed to copy fonts to fontdir : ${err}`, { service, obj: err });
		Sentry.error(err);
	}
}

export async function deleteFont(file: string, repo: string) {
	const fontPath = resolve(resolvedPathRepos('Fonts', repo)[0], basename(file));
	logger.info(`Deleting font ${file}`, { service });
	await fs.unlink(fontPath);
}

export async function addFont(file: string, repo: string) {
	const fontPath = resolve(resolvedPathRepos('Fonts', repo)[0], basename(file));
	const destDir = resolvedPath('Fonts');
	logger.info(`Copying font ${file}`, { service });
	await fs.copyFile(fontPath, destDir);
}
