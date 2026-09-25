import { randomUUID } from 'crypto';
import { Router } from 'express';
import { promises as fs } from 'fs';
import multer from 'multer';
import { resolve } from 'path';

import z from 'zod';
import { WS_CMD } from '../../../kmfrontend/src/utils/ws.mjs';
import { APIMessage } from '../../lib/services/frontend.js';
import { resolvedPath } from '../../lib/utils/config.js';
import { userTypes } from '../../lib/utils/constants.js';
import { sanitizedFileExtension } from '../../lib/utils/files.js';
import logger from '../../lib/utils/logger.js';
import { check } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { openLyricsFile, showLyricsInFolder, showMediaInFolder } from '../../services/karaManagement.js';
import { runChecklist } from '../middlewares.js';
import { requireHTTPAuth, requireValidUser } from '../middlewaresHTTP.js';

const ADMIN_UPLOAD_MAX_SIZE = 45 * 1024 * 1024 * 1024; // 45 GB, upload medias, backgrounds, user avatars, etc.
const USER_UPLOAD_MAX_SIZE = 10 * 1024 * 1024; // 10 MB, upload user avatar

export default function filesController(router: Router) {
	const multerStorage = multer.diskStorage({
		destination: resolvedPath('Temp'),
		// Keep original extension for media type detection
		filename: (_req, file, cb) => cb(null, `${randomUUID()}${sanitizedFileExtension(file.originalname)}`),
	});
	const adminUpload = multer({ 
		storage: multerStorage, 
		limits: { fileSize: ADMIN_UPLOAD_MAX_SIZE, files: 1 }
	}).single('file');
	const userUpload = multer({
		storage: multerStorage,
		limits: { fileSize: USER_UPLOAD_MAX_SIZE, files: 1 }
	}).single('file');

	router.route('/importFile').post(requireHTTPAuth, requireValidUser, (req: any, res: any) => {
		if (req.user.type === userTypes.guest) {
			res.status(403).json(APIMessage('NOT_GUEST'));
			return;
		}
		const upload = req.user.type === userTypes.admin ? adminUpload : userUpload;
		upload(req, res, (err: any) => {
			if (err) {
				if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
					res.status(413).json(APIMessage('UPLOAD_TOO_LARGE'));
				} else {
					logger.error('Unable to receive uploaded file', { service: 'API', obj: err });
					res.status(400).json(APIMessage('UPLOAD_FAILED'));
				}
				return;
			}
			if (!req.file) {
				res.status(400).json(APIMessage('UPLOAD_FAILED'));
				return;
			}
			res.status(200).send(JSON.stringify(req.file));
		});
	});
}

export function filesSocketController(router: SocketIOApp) {
	router.route(WS_CMD.IMPORT_FILE, async (socket, req) => {
		await runChecklist(socket, req, 'user', 'closed');
		try {
			check(req.body, z.object({
				extension: z.string().optional(),
				buffer: z.any(),
			}));
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
		try {
			const rawExtension = req.body.extension ? String(req.body.extension).replace(/^\.+/, '') : '';
			const extension = /^[a-zA-Z0-9]{1,16}$/.test(rawExtension) ? `.${rawExtension}` : '';
			const filename = `${randomUUID()}${extension}`;
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
			check(req.body, z.object({ kid: z.uuidv4() }));
			return await openLyricsFile(req.body.kid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.SHOW_LYRICS_IN_FOLDER, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			check(req.body, z.object({ kid: z.uuidv4() }));
			return await showLyricsInFolder(req.body.kid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.SHOW_MEDIA_IN_FOLDER, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			check(req.body, z.object({ kid: z.uuidv4() }));
			return await showMediaInFolder(req.body.kid);			
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}
