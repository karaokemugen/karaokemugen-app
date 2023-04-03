import { promises as fs } from 'fs';
import { isAbsolute, normalize, resolve, sep } from 'path';
import { blockDevices, fsSize } from 'systeminformation';

import { isMediaFile } from '../lib/utils/files.js';
import logger from '../lib/utils/logger.js';
import { KMFileType } from '../types/files.js';
import { getState } from './state.js';

const service = 'Files';

export function detectKMFileTypes(data: any): KMFileType {
	return data?.header?.description || data?.Header?.description;
}

export function pathIsContainedInAnother(p1, p2) {
	if (!isAbsolute(p1) || !isAbsolute(p2)) throw new Error('One of the paths is not absolute.');
	let origin = normalize(p1);
	origin = origin.endsWith(sep) ? origin : `${origin}${sep}`;
	let dst = normalize(p2);
	dst = dst.endsWith(sep) ? dst : `${dst}${sep}`;
	return dst.startsWith(origin);
}

export async function getFreeSpace(resolvedPath: string): Promise<number | null> {
	const fileSystems = await fsSize();
	logger.debug(`Filesystems reported with ${resolvedPath}`, { service, obj: fileSystems });
	// Let's find out which mount has our path
	const fileSystem = fileSystems.find(f => resolvedPath.toLowerCase().startsWith(f.mount.toLowerCase()));
	// If path doesn't exist, let's return 0 bytes left
	if (!fileSystem) return null;
	return fileSystem.available;
}

export async function browseFs(dir: string, onlyMedias: boolean) {
	const directory = await fs.readdir(dir, {
		encoding: 'utf8',
		withFileTypes: true,
	});
	let list = directory.map(e => {
		return {
			name: e.name,
			isDirectory: e.isDirectory(),
		};
	});
	if (onlyMedias) list = list.filter(f => isMediaFile(f.name));
	const drives = getState().os === 'win32' ? await blockDevices() : null;
	const fullPath = resolve(dir).replace(/\/$/g, '');
	return {
		contents: list,
		drives,
		fullPath,
	};
}
