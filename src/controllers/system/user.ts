import { Router } from "express";
import { requireValidUser, requireAdmin, requireAuth } from "../middlewares/auth";
import { requireNotDemo } from "../middlewares/demo";
import {editUser, createUser, findUserByName, listUsers, deleteUser} from '../../services/user';


export default function systemUsersController(router: Router) {
	router.get('/system/users', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			const users = await listUsers();
			res.json(users);
		} catch(err) {
			res.status(500).send(`Error while fetching users: ${err}`);
		}
	});

	router.get('/system/users/:userLogin', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const user = await findUserByName(req.params.userLogin);
			res.json(user);
		} catch(err) {
			res.status(500).send(`Error while fetching user: ${err}`);
		}
	});

	router.post('/system/users', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await createUser(req.body);
			res.send('OK');
		} catch(err) {
			res.status(500).send(`Error while creating user: ${err}`);
		}
	});

	router.put('/system/users/:userLogin', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await editUser(req.body.login, req.body, req.body.avatar, req.authToken.role);
			res.status(200).send('User edited');
		} catch(err) {
			res.status(500).send(`Error editing user: ${err}`);
		}
	});

	router.delete('/system/users/:userLogin', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await deleteUser(req.params.userLogin);
			res.status(200).send('User deleted');
		} catch(err) {
			res.status(500).send(`Error deleting user: ${err}`);
		}
	});

}