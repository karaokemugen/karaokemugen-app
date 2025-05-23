import { Router } from 'express';
import { promises as fs } from 'fs';
import multer from 'multer';
import { resolve } from 'path';
import { v4 as uuidV4 } from 'uuid';

import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { APIMessage } from '../../lib/services/frontend.js';
import { resolvedPath } from '../../lib/utils/config.js';
import logger from '../../lib/utils/logger.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { openLyricsFile, showLyricsInFolder, showMediaInFolder } from '../../services/karaManagement.js';
import { runChecklist } from '../middlewares.js';
import { requireHTTPAuth, requireValidUser } from '../middlewaresHTTP.js';

export default function filesController(router: Router) {
	const upload = multer({ dest: resolvedPath('Temp') });
	router.route('/importFile').post(requireHTTPAuth, requireValidUser, upload.single('file'), (req, res: any) => {
		res.status(200).send(JSON.stringify(req.file));
	});
}

export function filesSocketController(router: SocketIOApp) {
	router.route(WS_CMD.IMPORT_FILE, async (socket, req) => {
		await runChecklist(socket, req, 'user', 'closed');
		try {
			const extension = req.body.extension ? `.${req.body.extension}` : '';
			const filename = `${uuidV4()}${extension}`;
			const fullPath = resolve(resolvedPath('Temp'), filename);
			await fs.writeFile(fullPath, req.body.buffer);
			return {
				filename: fullPath,
			};
		} catch (err) {
			logger.error('Unable to write received file', { service: 'API', obj: err });
			return { code: 500 };
		}
	});

	router.route(WS_CMD.OPEN_LYRICS_FILE, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			return await openLyricsFile(req.body.kid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.SHOW_LYRICS_IN_FOLDER, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			return await showLyricsInFolder(req.body.kid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.SHOW_MEDIA_IN_FOLDER, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			return await showMediaInFolder(req.body.kid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}
