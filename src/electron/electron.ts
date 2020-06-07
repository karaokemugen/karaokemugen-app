import { app, BrowserWindow, dialog,ipcMain, Menu } from 'electron';
import i18next from 'i18next';
import open from 'open';
import { resolve } from 'path';
import { v4 as uuidV4 } from 'uuid';

import { exit } from '../components/engine';
import { listUsers } from '../dao/user';
import { main, preInit } from '../index';
import { configureLocale, getConfig } from '../lib/utils/config';
import { asyncReadFile } from '../lib/utils/files';
import logger from '../lib/utils/logger';
import { on } from '../lib/utils/pubsub';
import { emitWS } from '../lib/utils/ws';
import { integrateDownloadBundle } from '../services/download';
import { importSet } from '../services/blacklist';
import { importFavorites } from '../services/favorites';
import { isAllKaras } from '../services/kara';
import { playSingleSong } from '../services/player';
import { importPlaylist, playlistImported} from '../services/playlist';
import { addRepo,getRepo, getRepos } from '../services/repo';
import { welcomeToYoukousoKaraokeMugen } from '../services/welcome';
import { detectKMFileTypes } from '../utils/files';
import { getState,setState } from '../utils/state';
import {initAutoUpdate} from './electronAutoUpdate';
import { getMenu,initMenu } from './electronMenu';

export let win: Electron.BrowserWindow;

let initDone = false;

export async function startElectron() {
	setState({electron: app });
	// This is called when Electron finished initializing
	app.on('ready', async () => {
		try {
			await preInit();
		} catch(err) {
			throw new Error(err);
		}
		await initElectronWindow();
		on('KMReady', async () => {
			win.loadURL(await welcomeToYoukousoKaraokeMugen());
			if (!getState().forceDisableAppUpdate) initAutoUpdate();
			initDone = true;
		});
		ipcMain.once('initPageReady', async () => {
			try {
				await main();
			} catch(err) {
				logger.error(`[Launcher] Error during launch : ${err}`);
			}
		});
		ipcMain.on('droppedFiles', async (_event, eventData) => {
			for (const path of eventData.files) {
				await handleFile(path, eventData.username);
			}
		});
	});

	app.on('window-all-closed', async () => {
		await exit(0);
	});

	app.on('activate', async () => {
		// Recreate the window if the app is clicked on in the dock(for macOS)
		if (win === null) {
			await initElectronWindow();
		}
	});

	ipcMain.on('get-file-paths', async (event, options) => {
		event.sender.send('get-file-paths-response', (await dialog.showOpenDialog(options)).filePaths);
	});

	await configureLocale();
}

export async function handleFile(file: string, username?: string) {
	try {
		logger.info(`[FileHandler] Received file path ${file}`);
		if (!username) {
			const users = await listUsers();
			const adminUsersOnline = users.filter(u => u.type === 0 && u.login !== 'admin');
			// We have no other choice but to pick only the first one
			username = adminUsersOnline[0]?.login;
			if (!username) {
				username = 'admin';
				logger.warn('[FileHandler] Could not find a username, switching to admin by default');
			}
		}
		const rawData = await asyncReadFile(resolve(file), 'utf-8');
		const data = JSON.parse(rawData);
		const KMFileType = detectKMFileTypes(data);
		const url = `http://localhost:${getConfig().Frontend.Port}/admin`;
		switch(KMFileType) {
		case 'Karaoke Mugen Karaoke Bundle File':
			const repoName = data.kara.data.data.repository;
			const repo = getRepo(repoName);
			let destRepo = repoName;
			if (!repo) {
				const buttons = await dialog.showMessageBox({
					type: 'none',
					title: i18next.t('UNKNOWN_REPOSITORY_DOWNLOAD.TITLE'),
					message: `${i18next.t('UNKNOWN_REPOSITORY_DOWNLOAD.MESSAGE')}`,
					buttons: [i18next.t('YES'), i18next.t('NO')],
				});
				if (buttons.response === 0) {
					await addRepo({
						Name: repoName,
						Online: true,
						Enabled: true,
						Path: {
							Karas: [`repos/${repoName}/karaokes`],
							Lyrics: [`repos/${repoName}/lyrics`],
							Medias: [`repos/${repoName}/medias`],
							Series: [`repos/${repoName}/series`],
							Tags: [`repos/${repoName}/tags`],
						}
					});
				} else {
					// If user says no, we'll use the first local Repo we find
					const repos = getRepos();
					const localRepos = repos.filter(r => r.Enabled && !r.Online);
					if (localRepos.length === 0) {
						await dialog.showMessageBox({
							type: 'none',
							title: i18next.t('UNKNOWN_REPOSITORY_NO_LOCAL.TITLE'),
							message: `${i18next.t('UNKNOWN_REPOSITORY_NO_LOCAL.MESSAGE')}`
						});
						break;
					} else {
						destRepo = localRepos[0].Name;
					}
				}
			}
			await integrateDownloadBundle(data, uuidV4(), destRepo);
			break;
		case 'Karaoke Mugen BLC Set File':
			await importSet(data);
			if (win && !win.webContents.getURL().includes('/admin')) {
				win.loadURL(url);
				win.webContents.on('did-finish-load', () => emitWS('BLCSetsUpdated'));
			} else {
				emitWS('BLCSetsUpdated');
			}
			break;
		case 'Karaoke Mugen Favorites List File':
			if (!username) throw 'Unable to find a user to import the file to';
			await importFavorites(data, username);
			if (win && !win.webContents.getURL().includes('/admin')) {
				win.loadURL(url);
				win.webContents.on('did-finish-load', () => emitWS('favoritesUpdated', username));
			} else {
				emitWS('favoritesUpdated', username);
			}
			break;
		case 'Karaoke Mugen Karaoke Data File':
			const kara = await isAllKaras([data.data.kid]);
			if (kara.length > 0) throw 'Song unknown in database';
			await playSingleSong(data.data.kid);
			if (win && !win.webContents.getURL().includes('/admin')) win.loadURL(url);
			break;
		case 'Karaoke Mugen Playlist File':
			if (!username) throw 'Unable to find a user to import the file to';
			const res = await importPlaylist(data, username);
			if (win && !win.webContents.getURL().includes('/admin')) {
				win.loadURL(url);
				win.webContents.on('did-finish-load', () => playlistImported(res));
			} else {
				playlistImported(res);
			}
			break;
		default:
			//Unrecognized, ignoring
			throw 'Filetype not recognized';
		}
	} catch(err) {
		logger.error(`[Electron] Could not handle ${file} : ${err}`);
	}
}

export async function applyMenu() {
	await initMenu();
	const menu = Menu.buildFromTemplate(getMenu());
	Menu.setApplicationMenu(menu);
}

async function initElectronWindow() {
	await createWindow();
	await applyMenu();
}

async function createWindow() {
	// Create the browser window
	const state = getState();
	win = new BrowserWindow({
		width: 1280,
		height: 720,
		backgroundColor: '#36393f',
		icon: resolve(state.resourcePath, 'build/icon.png'),
		webPreferences: {
			nodeIntegration: true
		}
	});
	// and load the index.html of the app.
	if (initDone) {
		win.loadURL(await welcomeToYoukousoKaraokeMugen());
	} else {
		win.loadURL(`file://${resolve(state.resourcePath, 'initpage/index.html')}`);
	}

	win.show();
	win.webContents.on('new-window', (event, url) => {
		event.preventDefault();
		openLink(url);
	});
	win.webContents.on('will-navigate', (event, url) => {
		event.preventDefault();
		openLink(url);
	});

	// What to do when the window is closed.
	win.on('closed', () => {
		win = null;
	});
}

function openLink(url: string) {
	getConfig().GUI.OpenInElectron && url.indexOf('//localhost') !== -1
		? win.loadURL(url)
		: open(url);
}

export function setProgressBar(number: number) {
	if (win) win.setProgressBar(number);
}

export function focusWindow() {
	if (win) {
		if (win.isMinimized()) win.restore();
		win.focus();
	}
}
