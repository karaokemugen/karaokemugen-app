import { Router } from 'express';

import { SocketIOApp } from '../../lib/utils/ws';

export default function emulateController(router: Router, ws: SocketIOApp) {
	router.route('/command')
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
		.post(async (req, res: any) => {
			res.status(200).json(await ws.emulate(req.body.cmd, req.body.body, req.headers));
		});
}
