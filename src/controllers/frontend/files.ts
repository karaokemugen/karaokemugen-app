import { Router } from 'express';
import { promises as fs } from 'fs';
import multer from 'multer';
import open from 'open';
import { extname, resolve } from 'path';
import { Socket } from 'socket.io';
import { v4 as uuidV4 } from 'uuid';

import { APIData } from '../../lib/types/api';
import { resolvedPathRepos, resolvedPathTemp } from '../../lib/utils/config';
import { asyncExists } from '../../lib/utils/files';
import logger from '../../lib/utils/logger';
import { SocketIOApp } from '../../lib/utils/ws';
import { getKara } from '../../services/kara';
import { APIMessage, errMessage } from '../common';
import { runChecklist } from '../middlewares';
import { requireHTTPAuth, requireValidUser } from '../middlewaresHTTP';

export default function filesController(router: Router) {
	const upload = multer({ dest: resolvedPathTemp() });
	router.route('/importFile')
		.post(requireHTTPAuth, requireValidUser, upload.single('file'), (req, res: any) => {
			res.status(200).send(JSON.stringify(req.file));
		});
}

export function filesSocketController(router: SocketIOApp) {
	router.route('importFile', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'closed');
		try {
			const extension = req.body.extension ? `.${req.body.extension}` : '';
			const filename = `${uuidV4()}${extension}`;
			const fullPath = resolve(resolvedPathTemp(), filename);
			await fs.writeFile(fullPath, req.body.buffer);
			return {
				filename: fullPath
			};
		} catch (err) {
			logger.error('Unable to write received file', { service: 'API', obj: err });
			return { code: 500 };
		}
	});

	router.route('openLyricsFile', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			const { subfile, repository, mediafile } = await getKara(req.body.kid, req.token);
			const lyricsPath = resolve(resolvedPathRepos('Lyrics', repository)[0], subfile);
			if (extname(lyricsPath) === '.ass' && mediafile) {
				for (const repo of resolvedPathRepos('Medias', repository)) {
					const mediaPath = resolve(repo, mediafile);
					if (await asyncExists(mediaPath, true)) {
						const garbageContent = `
[Aegisub Project Garbage]
Audio File: ${mediaPath}
Video File: ${mediaPath}`;

						const garbageTagRegexp = /\n?^\[Aegisub Project Garbage\](.|\n[^\n])*/g;
						let content: string = await fs.readFile(lyricsPath, { encoding: 'utf8' });
						// remove the maybe existing garbage and add the new one
						content = (content.replace(garbageTagRegexp, '') + garbageContent);
						await fs.writeFile(lyricsPath, content);
					}
				}
			}
			await open(lyricsPath);
			return { code: 204 };
		} catch (err) {
			const code = 'LYRICS_FILE_OPEN_ERROR';
			errMessage(code, err);
			throw { code: 500, message: APIMessage(code) };
		}
	});
}