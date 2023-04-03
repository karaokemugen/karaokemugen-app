import { Router } from 'express';

import { SocketIOApp } from '../../lib/utils/ws.js';

export default function emulateController(router: Router, ws: SocketIOApp) {
	router.route('/command').post(async (req, res: any) => {
		const socketRes = await ws.emulate(req.body.cmd, req.body.body, req.headers);
		if (!socketRes.err) {
			res.status(200).json(socketRes);
		} else {
			res.status(socketRes?.data?.code || 500).json(socketRes);
		}
	});
}
