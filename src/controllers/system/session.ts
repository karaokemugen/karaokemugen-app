import { Router } from "express";
import { requireAdmin, updateUserLoginTime, requireAuth, requireValidUser } from "../middlewares/auth";
import { check } from "../../lib/utils/validators";
import { exportSession, setActiveSession, getSessions, addSession, editSession, removeSession, mergeSessions } from "../../services/session";

export default function systemSessionController(router: Router) {
	router.route('/system/sessions')
		.get(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (_req, res) => {
			try {
				const sessions = await getSessions();
				res.json(sessions);
			} catch(err) {
				res.status(500).send(`Error listing sessions : ${err}`);
			}
		})
		.post(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req,res) => {
			//Validate form data
			const validationErrors = check(req.body, {
				name: {presence: {allowEmpty: false}}
			});
			if (!validationErrors) {
				// No errors detected
				try {
					await addSession(req.body.name, req.body.date, req.body.private);
					res.status(200).send('Session created');
				} catch(err) {
					res.status(500).send(`Session creation error : ${err}`);				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
	router.route('/system/sessions/merge')
		.post(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			const validationErrors = check(req.body, {
				seid1: {uuidArrayValidator: true},
				seid2: {uuidArrayValidator: true}
			});
			if (!validationErrors) {
				try {
					await mergeSessions(req.body.seid1, req.body.seid2);
					res.status(200).send('Sessions merged');
				} catch(err) {
					res.status(500).send(`Error merging sessions : ${err}`);
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
	router.route('/system/sessions/:seid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
		.put(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req,res) => {
			//Validate form data
			const validationErrors = check(req.body, {
				name: {presence: {allowEmpty: false}}
			});
			if (!validationErrors) {
				// No errors detected
				try {
					await editSession(req.params.seid, req.body.name, req.body.started_at, req.body.private);
					res.status(200).send('Session updated');
				} catch(err) {
					res.status(500).send(`Error updating session : ${err}`);
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		})
		.post(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			setActiveSession(req.params.seid);
			res.send('Session activated');
		})
		.delete(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			try {
				await removeSession(req.params.seid);
				res.status(200).send('Session deleted');
			} catch(err) {
				res.status(500).send(`Error deleting session : ${err}`);
			}
		});
	router.route('/system/sessions/:seid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/export')
		.get(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req,res) => {
			try {
				await exportSession(req.params.seid);
				res.status(200).send('Session exported');
			} catch(err) {
				res.status(500).send(err);
			}
		});
}
