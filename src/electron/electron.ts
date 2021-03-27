import { app, BrowserWindow, dialog,ipcMain, Menu,protocol } from 'electron';
import i18next from 'i18next';
import open from 'open';
import { resolve } from 'path';

import { exit } from '../components/engine';
import { listUsers } from '../dao/user';
import { main, preInit } from '../index';
import {getConfig, setConfig} from '../lib/utils/config';
import { asyncReadFile } from '../lib/utils/files';
import logger from '../lib/utils/logger';
import { emit,on } from '../lib/utils/pubsub';
import { testJSON } from '../lib/utils/validators';
import { emitWS } from '../lib/utils/ws';
import { importSet } from '../services/blacklist';
import { addDownloads,integrateDownloadBundle } from '../services/download';
import { importFavorites } from '../services/favorites';
import { isAllKaras } from '../services/kara';
import { playSingleSong } from '../services/karaokeEngine';
import { importPlaylist, playlistImported} from '../services/playlist';
import { addRepo,getRepo, getRepos } from '../services/repo';
import { generateAdminPassword } from '../services/user';
import { welcomeToYoukousoKaraokeMugen } from '../services/welcome';
import { detectKMFileTypes } from '../utils/files';
import { getState,setState } from '../utils/state';
import { tip } from '../utils/tips';
import { initAutoUpdate } from './electronAutoUpdate';
import { emitIPC } from './electronLogger';
import { getMenu,initMenu } from './electronMenu';

export let win: Electron.BrowserWindow;
export let chibiPlayerWindow: Electron.BrowserWindow;

let initDone = false;

export function startElectron() {
	setState({electron: app ? true : false });
	// This is called when Electron finished initializing
	app.on('ready', async () => {
		try {
			await preInit();
		} catch(err) {
			console.log(err);
			// This is usually very much fatal.
			emit('initError', err);
			return;
		}
		// Register km:// protocol for internal use only.
		protocol.registerStringProtocol('km', req => {
			const args = req.url.substr(5).split('/');
			handleProtocol(args);
		});
		await initElectronWindow();
		on('KMReady', async () => {
			win.loadURL(await welcomeToYoukousoKaraokeMugen());
			if (!getState().forceDisableAppUpdate) initAutoUpdate();
			if (getConfig().GUI.ChibiPlayer.Enabled) {
				updateChibiPlayerWindow(true);
			}
			initDone = true;
		});
		ipcMain.once('initPageReady', async () => {
			try {
				await main();
			} catch(err) {
				logger.error('Error during launch', {service: 'Launcher', obj: err});
			}
		});
		ipcMain.on('getSecurityCode', (event, _eventData) => {
			event.sender.send('getSecurityCodeResponse', getState().securityCode);
		});
		ipcMain.on('droppedFiles', async (_event, eventData) => {
			for (const path of eventData.files) {
				await handleFile(path, eventData.username, eventData.onlineToken);
			}
		});
		ipcMain.on('tip', (_event, _eventData) => {
			emitIPC('techTip', tip());
		});
		ipcMain.on('setChibiPlayerAlwaysOnTop', (_event, _eventData) => {
			setChibiPlayerAlwaysOnTop(!getConfig().GUI.ChibiPlayer.AlwaysOnTop);
			setConfig({GUI:{ChibiPlayer:{ AlwaysOnTop: !getConfig().GUI.ChibiPlayer.AlwaysOnTop }}});
		});
		ipcMain.on('closeChibiPlayer', (_event, _eventData) => {
			updateChibiPlayerWindow(false);
			setConfig({GUI: {ChibiPlayer: { Enabled: false }}});
			applyMenu();
		});
		ipcMain.on('focusMainWindow', (_event, _eventData) => {
			focusWindow();
		});
	});

	// macOS only. Yes.
	app.on('open-url', (_event, url: string) => {
		handleProtocol(url.substr(5).split('/'));
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
}

export async function handleProtocol(args: string[]) {
	try {
		logger.info(`Received protocol uri km://${args.join('/')}`, {service: 'ProtocolHandler'});
		if (!getState().ready) return;
		switch(args[0]) {
		case 'download':
			const domain = args[1];
			const kid = args[2];
			const name = await checkRepositoryExists(domain, false);
			if (name) await addDownloads([
				{
					name: 'Karaoke',
					kid: kid,
					repository: domain,
					size: 0
				}
			]);
			break;
		case 'addRepo':
			const repoName = args[1];
			const repo = getRepo(repoName);
			if (!repo) {
				const buttons = await dialog.showMessageBox({
					type: 'none',
					title: i18next.t('UNKNOWN_REPOSITORY_ADD.TITLE'),
					message: `${i18next.t('UNKNOWN_REPOSITORY_ADD.MESSAGE', {repoName: repoName})}`,
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
							Tags: [`repos/${repoName}/tags`],
						}
					});
				}
			} else {
				await dialog.showMessageBox({
					type: 'none',
					title: i18next.t('REPOSITORY_ALREADY_EXISTS.TITLE'),
					message: `${i18next.t('REPOSITORY_ALREADY_EXISTS.MESSAGE', {repoName: repoName})}`
				});
			}
			break;
		default:
			throw 'Unknown protocol';
		}
	} catch(err) {
		logger.error(`Unknown command : ${args.join('/')}`, {service: 'ProtocolHandler'});
	}
}

export async function handleFile(file: string, username?: string, onlineToken?: string) {
	try {
		logger.info(`Received file path ${file}`, {service: 'FileHandler'});
		if (!getState().ready) return;
		if (!username) {
			const users = await listUsers();
			const adminUsersOnline = users.filter(u => u.type === 0 && u.login !== 'admin');
			// We have no other choice but to pick only the first one
			username = adminUsersOnline[0]?.login;
			if (!username) {
				username = 'admin';
				logger.warn('Could not find a username, switching to admin by default', {service: 'FileHandler'});
			}
		}
		const rawData = await asyncReadFile(resolve(file), 'utf-8');
		if (!testJSON(rawData)) {
			logger.debug(`File ${file} is not JSON, ignoring`, {service: 'FileHandler'});
			return;
		}
		const data = JSON.parse(rawData);
		const KMFileType = detectKMFileTypes(data);
		const url = `http://localhost:${getConfig().Frontend.Port}/admin`;
		switch(KMFileType) {
		case 'Karaoke Mugen Karaoke Bundle File':
			const repoName = data.kara.data.data.repository;
			const destRepo = await checkRepositoryExists(repoName);
			await integrateDownloadBundle(data, destRepo);
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
			await importFavorites(data, username, onlineToken);
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
		logger.error(`Could not handle ${file}`, {service: 'Electron', obj: err});
	}
}

async function checkRepositoryExists(repoName: string, useLocal = true): Promise<string> {
	const repo = getRepo(repoName);
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
				SendStats: getConfig().Online.Stats,
				Path: {
					Karas: [`repos/${repoName}/karaokes`],
					Lyrics: [`repos/${repoName}/lyrics`],
					Medias: [`repos/${repoName}/medias`],
					Tags: [`repos/${repoName}/tags`],
				}
			});
			return repoName;
		} else {
			if (!useLocal) return;
			// If user says no, we'll use the first local Repo we find
			const repos = getRepos();
			const localRepos = repos.filter(r => r.Enabled && !r.Online);
			if (localRepos.length === 0) {
				await dialog.showMessageBox({
					type: 'none',
					title: i18next.t('UNKNOWN_REPOSITORY_NO_LOCAL.TITLE'),
					message: `${i18next.t('UNKNOWN_REPOSITORY_NO_LOCAL.MESSAGE')}`
				});
				return;
			} else {
				return localRepos[0].Name;
			}
		}
	} else {
		return repoName;
	}
}

export function applyMenu() {
	initMenu();
	const menu = Menu.buildFromTemplate(getMenu());
	Menu.setApplicationMenu(menu);
}

async function initElectronWindow() {
	await createWindow();
	applyMenu();
}

async function createWindow() {
	// Create the browser window
	const state = getState();
	win = new BrowserWindow({
		width: 1280,
		height: 720,
		backgroundColor: '#36393f',
		show: false,
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

	win.once('ready-to-show', () => {
		win.show();
	});
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
		if (chibiPlayerWindow) chibiPlayerWindow.destroy();
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

export async function updateChibiPlayerWindow(show: boolean) {
	const state = getState();
	const conf = getConfig();
	if (show) {
		chibiPlayerWindow = new BrowserWindow({
			width: 521,
			height: 139,
			x: conf.GUI.ChibiPlayer.PositionX,
			y: conf.GUI.ChibiPlayer.PositionY,
			frame: false,
			resizable: false,
			show: false,
			alwaysOnTop: getConfig().GUI.ChibiPlayer.AlwaysOnTop,
			backgroundColor: '#36393f',
			webPreferences: {
				nodeIntegration: true
			},
			icon: resolve(state.resourcePath, 'build/icon.png'),
		});
		const port = state.frontendPort;
		chibiPlayerWindow.once('ready-to-show', () => {
			chibiPlayerWindow.show();
		});
		chibiPlayerWindow.on('moved', () => {
			const pos = chibiPlayerWindow.getPosition();
			setConfig({ GUI: {
				ChibiPlayer: {
					PositionX: pos[0],
					PositionY: pos[1]
				}
			}});
		});
		await chibiPlayerWindow.loadURL(`http://localhost:${port}/chibi?admpwd=${await generateAdminPassword()}`);
	} else {
		chibiPlayerWindow?.destroy();
	}
}

export function setChibiPlayerAlwaysOnTop(enabled: boolean) {
	if (chibiPlayerWindow) chibiPlayerWindow.setAlwaysOnTop(enabled);
}
