import { Router } from 'express';
import multer from 'multer';
import { resolve } from 'path';
import { Socket } from 'socket.io';
import { v4 as uuidV4 } from 'uuid';

import { APIData } from '../../lib/types/api';
import { resolvedPathTemp } from '../../lib/utils/config';
import { asyncWriteFile } from '../../lib/utils/files';
import logger from '../../lib/utils/logger';
import { SocketIOApp } from '../../lib/utils/ws';
import { runChecklist } from '../middlewares';
import { requireHTTPAuth, requireValidUser } from '../middlewaresHTTP';

export default function filesController(router: Router) {
	const upload = multer({ dest: resolvedPathTemp()});
	router.route('/importfile')
	/**
 * @api {post} /importfile Upload media/lyrics file to server
 * @apiName importFile
 * @apiVersion 3.1.0
 * @apiGroup Karaokes
 * @apiPermission admin
 * @apiDescription API used to upload files for kara edit/creation form
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {file} file File to upload to server
 * @apiSuccess {string} originalname Original name on the user's computer
 * @apiSuccess {string} filename Name as stored on the server
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */
		.post(requireHTTPAuth, requireValidUser, upload.single('file'), (req, res: any) => {
			res.status(200).send(JSON.stringify(req.file));
		});
}

export function filesSocketController(router: SocketIOApp) {
	router.route('importfile', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'closed');
		try {
			const extension = req.body.extension ? `.${req.body.extension}` : '';
			const filename = `${uuidV4()}${extension}`;
			const fullPath = resolve(resolvedPathTemp(), filename);
			await asyncWriteFile(fullPath, req.body.buffer);
			return {
				filename: fullPath
			};
		} catch(err) {
			logger.error('Unable to write received file', {service: 'API', obj: err});
			return { code: 500 };
		}
	});
}