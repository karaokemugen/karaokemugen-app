/* eslint-env browser */

import { TREE } from 'isomorphic-git';
import pq from 'p-queue';

import {DiffType} from '../src/types/git';
const {ipcRenderer} = require('electron');
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const { parentPort } = require('worker_threads');

const queue = new pq({concurrency: 32});

async function queueWriteFile(...args) {
	await queue.add(() => fs.promises.writeFile(...args));
}

const qfs = {
	promises: {
		...fs.promises,
		writeFile: queueWriteFile
	}
};

async function walkMap(filepath: string, [A, B]) {
	// ignore directories
	if (filepath === '.') {
		return;
	}
	let type: DiffType;
	let content: any;
	if (A && B) {
		if ((await A.type()) === 'tree' || (await B.type()) === 'tree') {
			return;
		}
		const Aoid = await A.oid();
		const Boid = await B.oid();
		if (Aoid === Boid) {
			type = 'equal';
		} else {
			type = 'modify';
		}
	} else if (!A) {
		type = 'add';
	} else if (!B) {
		type = 'delete';
		if (filepath.endsWith('.json')) content = await A.content();
	} else {
		// wtf
		throw {
			message: 'Something went wrong',
			data: [A, B]
		};
	}

	return {
		path: filepath,
		type: type,
		content: content
	};
}

function trees(commitA: string, commitB: string) {
	return [
		TREE({ ref: commitA }),
		TREE({ ref: commitB })
	];
}

async function processGitCommand(data: any) {
	// data {
	//  command: string, git command
	//  options: object with options
	// }
	let cache = {};
	let error: any;
	let res: any;
	console.log('Received stuff :');
	console.log(data);
	try {
		res = await git[data.command]({
			fs: qfs,
			http,
			trees: data.command === 'walk' ? trees(data.options.commitA, data.options.commitB) : undefined,
			map: data.command === 'walk' ? walkMap : undefined,
			onProgress: (event: any) => {
				const message = {
					repo: data.options.repo,
					phase: event.phase,
					total: event.total,
					loaded: event.loaded
				};
				if (ipcRenderer) {
					ipcRenderer.send('gitProgress', message);
				} else {
					parentPort.postMessage({
						type: 'gitProgress',
						message: message
					});
				}
			},
			cache,
			...data.options
		});
		console.log('Finished :');
		console.log(res);
	} catch(err) {
		error = err;
	} finally {
		cache = {};
		const message = {
			repo: data?.options?.repo,
			error: error?.toString(),
			res: res
		};
		if (ipcRenderer) {
			console.log('Sending message');
			if (error) console.log(error);
			ipcRenderer.send('gitEnd', message);
		} else {
			parentPort.postMessage({
				type: 'gitEnd',
				message: message
			});
			process.exit();
		}
	}
}

if (ipcRenderer) {
	ipcRenderer.on('git', async (_event, data) => {
		await processGitCommand(data);
	});
} else {
	parentPort.on('message', async (data) => {
		await processGitCommand(data);
	});
}