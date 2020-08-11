// These routes are only available in --test mode

import { Router } from 'express';

import { getState } from '../../utils/state';

export default function miscController(router: Router) {
	router.route('/state')
		.get((_req: any, res: any) => {
			res.json(getState());
		});
}