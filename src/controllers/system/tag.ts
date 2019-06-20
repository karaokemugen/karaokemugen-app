import { Router } from "express";
import { requireAdmin, requireValidUser, requireAuth } from "../middlewares/auth";
import {getRemoteTags} from '../../services/download';
import { getTags } from "../../services/tag";


export default function systemTagController(router: Router) {
	router.get('/system/tags', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			let tags: any;
			if (req.query.instance) {
				tags = await getRemoteTags(req.query.instance, {
					filter: req.query.filter,
					type: req.query.type,
					from: 0,
					size: 999999999
				});
			} else {
				tags = await getTags({
					filter: req.query.filter,
					type: req.query.type,
					from: 0,
					size: 999999999
				});
			}
			res.json(tags);
		} catch(err) {
			res.status(500).send(`Error while fetching tags: ${err}`);
		}
	});
}