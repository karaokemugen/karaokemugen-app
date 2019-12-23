
import {requireAuth, requireValidUser, requireAdmin} from '../middlewares/auth';
import {requireNotDemo} from '../middlewares/demo';

import {getDownloadBLC, addDownloadBLC, removeDownloadBLC, emptyDownloadBLC, getDownloads, removeDownload, retryDownload, pauseQueue, startDownloads, addDownloads, wipeDownloads, updateAllKaras, downloadAllKaras, cleanAllKaras} from '../../services/download';
import {getRepos} from '../../services/repo';
import { Router } from 'express';

export default function downloadController(router: Router) {

	router.get('/repos', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			const repos = await getRepos();
			res.json(repos);
		} catch(err) {
			res.status(500).send(`Error getting repositories: ${err}`);
		}
	});
	router.post('/downloads', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const msg = await addDownloads(req.body.repository,req.body.downloads);
			res.status(200).send(msg);
		} catch(err) {
			res.status(500).send(`Error while adding download: ${err}`);
		}
	});
	router.get('/downloads', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			const downloads = await getDownloads();
			res.json(downloads);
		} catch(err) {
			res.status(500).send(`Error getting downloads: ${err}`);
		}
	});
	router.delete('/downloads', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await wipeDownloads();
			res.status(200).send('Download queue emptied completely');
		} catch(err) {
			res.status(500).send(`Error wiping downloads: ${err}`);
		}
	});
	router.delete('/downloads/:uuid', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await removeDownload(req.params.uuid);
			res.status(200).send('Download removed');
		} catch(err) {
			res.status(500).send(`Error removing download: ${err}`);
		}
	});
	router.put('/downloads/:uuid/retry', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await retryDownload(req.params.uuid);
			res.status(200).send('Download back into queue');
		} catch(err) {
			res.status(500).send(`Error retrying download: ${err}`);
		}
	});
	router.put('/downloads/pause', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await pauseQueue();
			res.status(200).send('Downloads paused');
		} catch(err) {
			res.status(500).send(`Error pausing downloads: ${err}`);
		}
	});
	router.put('/downloads/start', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await startDownloads();
			res.status(200).send('Downloads starting');
		} catch(err) {
			res.status(500).send(`Error starting downloads: ${err}`);
		}
	});
	router.get('/downloads/blacklist/criterias', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			const blc = await getDownloadBLC();
			res.status(200).json(blc);
		} catch(err) {
			res.status(500).send(`Error getting download BLCs : ${err}`);
		}
	});
	router.post('/downloads/blacklist/criterias', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await addDownloadBLC({ type: req.body.type, value: req.body.value});
			res.status(200).send('Download blacklist criteria added');
		} catch(err) {
			res.status(500).send(`Error adding download BLC : ${err}`);
		}
	});
	router.delete('/downloads/blacklist/criterias/:id', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await removeDownloadBLC(parseInt(req.params.id));
			res.status(200).send('Download blacklist criteria removed');
		} catch(err) {
			res.status(500).send(`Error removing download BLC : ${err}`);
		}
	});
	router.delete('/downloads/blacklist/criterias', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await emptyDownloadBLC();
			res.status(200).send('Download blacklist criterias emptied');
		} catch(err) {
			res.status(500).send(`Error emptying download BLC : ${err}`);
		}
	});
	router.post('/downloads/update', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await updateAllKaras(req.body.repository);
			res.status(200).send('Update in progress');
		} catch(err) {
			res.status(500).send(`Error computing update: ${err}`);
		}
	});
	router.post('/downloads/all', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await downloadAllKaras(req.body.repository);
			res.status(200).send('Download in progress');
		} catch(err) {
			res.status(500).send(`Error computing update: ${err}`);
		}
	});
	router.post('/downloads/clean', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await cleanAllKaras(req.body.repository);
			res.status(200).send('Cleanup in progress');
		} catch(err) {
			res.status(500).send(`Error computing update: ${err}`);
		}
	});
}