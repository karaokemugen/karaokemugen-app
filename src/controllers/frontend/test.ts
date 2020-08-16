// These routes are only available in --test mode

import { Router } from 'express';

import { getConfig } from '../../lib/utils/config';
import { getState } from '../../utils/state';

export default function miscController(router: Router) {
	router.route('/state')
		.get((_req: any, res: any) => {
			res.json(getState());
		});
	router.route('/fullConfig')
		.get((_req: any, res: any) => {
			res.json(getConfig());
		});
}