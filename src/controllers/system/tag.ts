import { Router } from "express";
import { requireAdmin, requireValidUser, requireAuth } from "../middlewares/auth";
import {getRemoteTags} from '../../services/download';
import { getTags, deleteTag, editTag, addTag } from "../../services/tag";
import { getTag } from "../../dao/tag";


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
	router.delete('/system/tags/:tid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await deleteTag(req.params.tid);
			res.status(200).send('Tag deleted');
		} catch(err) {
			res.status(500).send(`Error deleting tag: ${err}`);
		}
	});
	router.get('/system/tags/:tid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const tag = await getTag(req.params.tid);
			res.json(tag);
		} catch(err) {
			res.status(500).send(`Error getting tag: ${err}`)
		}
	});

	router.put('/system/tags/:tid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const tag = editTag(req.params.tid, req.body);
			res.json(tag);
		} catch(err) {
			res.status(500).send(`Error editing tag: ${err}`);
		}
	});

	router.post('/system/tags', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await addTag(req.body);
			res.status(200).send('Tag added');
		} catch(err) {
			res.status(500).send(`Error adding tag: ${err}`);
		}
	});
}