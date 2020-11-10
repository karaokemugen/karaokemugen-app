import { Router } from 'express';
import multer from 'multer';

import { resolvedPathTemp } from '../../lib/utils/config';
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