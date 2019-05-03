import { Router } from "express";
import { requireAdmin, requireValidUser, requireAuth } from "../middlewares/auth";
import { getTags } from "../../services/tag";


export default function systemTagController(router: Router) {
	router.get('/system/tags', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const tags = await getTags({
				filter: req.query.filter,
				type: req.query.type,
				from: 0,
				size: 999999999
			});
			res.json(tags);
		} catch(err) {
			res.status(500).send(`Error while fetching tags: ${err}`);
		}
	});
}