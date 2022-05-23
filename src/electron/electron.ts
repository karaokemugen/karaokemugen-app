import { app, BrowserWindow, dialog, ipcMain, Menu, protocol } from 'electron';
import { promises as fs } from 'fs';
import i18next from 'i18next';
import open from 'open';
import { resolve } from 'path';

import { exit, welcomeToYoukousoKaraokeMugen } from '../components/engine';
import { init, preInit } from '../components/init';
import { selectUsers } from '../dao/user';
import { getConfig, resolvedPath, setConfig } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import { testJSON } from '../lib/utils/validators';
import { emitWS } from '../lib/utils/ws';
import { importFavorites } from '../services/favorites';
import { importPlaylist, playlistImported } from '../services/playlist';
import { addRepo, getRepo } from '../services/repo';
import { generateAdminPassword } from '../services/user';
import { MenuLayout } from '../types/electron';
import { detectKMFileTypes } from '../utils/files';
import { getState, setState } from '../utils/state';
import { tip } from '../utils/tips';
import { emitIPC } from './electronLogger';
import { createMenu } from './electronMenu';

const service = 'Electron';

// eslint-disable-next-line import/no-mutable-exports
export let win: Electron.BrowserWindow;
let chibiPlayerWindow: Electron.BrowserWindow;
let chibiPlaylistWindow: Electron.BrowserWindow;
let aboutWindow: Electron.BrowserWindow;

let initDone = false;

export function startElectron() {
	setState({ electron: !!app });
	// Fix bug that makes the web views not updating if they're hidden behind other windows.
	// It's better for streamers who capture the web interface through OBS.
	app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
	// This is called when Electron finished initializing
	app.on('ready', async () => {
		try {
			await preInit();
		} catch (err) {
			console.log(err);
			// This is usually very much fatal.
			throw err;
		}
		// Register km:// protocol for internal use only.
		try {
			registerKMProtocol();
		} catch (err) {
			logger.warn('KM protocol could not be registered!', { obj: err, service });
		}
		// Create electron window with init screen
		if (!getState().opt.cli) await initElectronWindow();
		// Once init page is ready, or if we're in cli mode we start running init operations
		//
		if (getState().opt.cli) {
			await initMain();
		} else {
			ipcMain.once('initPageReady', initMain);
		}
		registerIPCEvents();
	});

	// macOS only. Yes.
	app.on('open-url', (_event, url: string) => {
		handleProtocol(url.substring(5).split('/'));
	});

	// Windows all closed should quit the app, even on macOS.
	app.on('window-all-closed', async () => {
		await exit(0);
	});

	// Recreate the window if the app is clicked on in the dock(for macOS)
	app.on('activate', () => {
		if (win === null) {
			initElectronWindow();
		}
	});

	// Acquiring lock to prevent two KMs from running at the same time.
	// Also allows to get us the files we need.
	if (!app.requestSingleInstanceLock()) process.exit();
	app.on('second-instance', (_event, args) => {
		if (args[args.length - 1] === '--kill') {
			exit(0);
		} else {
			focusWindow();
			const file = args[args.length - 1];
			if (file && file !== '.' && !file.startsWith('--')) {
				file.startsWith('km://') ? handleProtocol(file.substr(5).split('/')) : handleFile(file);
			}
		}
	});

	// Redefining quit function
	app.on('will-quit', () => {
		exit(0);
	});

	if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
}

/** This is called once KM Engine fully started so we can open the right windows */
export async function postInit() {
	const state = getState();
	if (!state.opt.cli) {
		win?.loadURL(await welcomeToYoukousoKaraokeMugen());
		if (getConfig().GUI.ChibiPlayer.Enabled) {
			updateChibiPlayerWindow(true);
		}
		if (getConfig().GUI.ChibiPlaylist.Enabled) {
			updateChibiPlaylistWindow(true);
		}
		if (getConfig().App.FirstRun) {
			applyMenu('REDUCED');
		} else {
			applyMenu('DEFAULT');
		}
	}
	initDone = true;
}

function registerKMProtocol() {
	protocol.registerStringProtocol('km', req => {
		const args = req.url.substring(5).split('/');
		handleProtocol(args);
	});
}

async function initMain() {
	try {
		await init();
	} catch (err) {
		logger.error('Error during launch', { service, obj: err });
		// We only throw if in cli mode. In UI mode throwing would exit the app immediately without allowing users to read the error message
		if (getState().opt.cli) throw err;
	}
}

/** Register IPC events the backend listens to. The frontend sends these. */
async function registerIPCEvents() {
	ipcMain.on('get-file-paths', async (event, options) => {
		event.sender.send('get-file-paths-response', (await dialog.showOpenDialog(options)).filePaths);
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
		setConfig({ GUI: { ChibiPlayer: { AlwaysOnTop: !getConfig().GUI.ChibiPlayer.AlwaysOnTop } } });
	});
	ipcMain.on('closeChibiPlayer', (_event, _eventData) => {
		updateChibiPlayerWindow(false);
		setConfig({ GUI: { ChibiPlayer: { Enabled: false } } });
		if (getConfig().App.FirstRun) {
			applyMenu('REDUCED');
		} else {
			applyMenu('DEFAULT');
		}
	});
	ipcMain.on('focusMainWindow', (_event, _eventData) => {
		focusWindow();
	});
	ipcMain.on('openFolder', (_event, eventData) => {
		if (eventData.type === 'streamFiles') {
			open(resolve(resolvedPath('StreamFiles')));
		}
	});
}

export async function handleProtocol(args: string[]) {
	try {
		logger.info(`Received protocol uri km://${args.join('/')}`, { service });
		if (!getState().ready) return;
		switch (args[0]) {
			case 'addRepo':
				const repoName = args[1];
				const repo = getRepo(repoName);
				if (!repo) {
					const buttons = await dialog.showMessageBox({
						type: 'none',
						title: i18next.t('UNKNOWN_REPOSITORY_ADD.TITLE'),
						message: `${i18next.t('UNKNOWN_REPOSITORY_ADD.MESSAGE', { repoName })}`,
						buttons: [i18next.t('YES'), i18next.t('NO')],
					});
					if (buttons.response === 0) {
						await addRepo({
							Name: repoName,
							Online: true,
							Enabled: true,
							SendStats: false,
							AutoMediaDownloads: 'updateOnly',
							MaintainerMode: false,
							BaseDir: `repos/${repoName}/json`,
							Path: {
								Medias: [`repos/${repoName}/medias`],
							},
						});
					}
				} else {
					await dialog.showMessageBox({
						type: 'none',
						title: i18next.t('REPOSITORY_ALREADY_EXISTS.TITLE'),
						message: `${i18next.t('REPOSITORY_ALREADY_EXISTS.MESSAGE', { repoName })}`,
					});
				}
				break;
			default:
				throw 'Unknown protocol';
		}
	} catch (err) {
		logger.error(`Unknown command : ${args.join('/')}`, { service });
	}
}

export async function handleFile(file: string, username?: string, onlineToken?: string) {
	try {
		logger.info(`Received file path ${file}`, { service });
		if (!getState().ready) return;
		if (!username) {
			const users = await selectUsers();
			const adminUsersOnline = users.filter(u => u.type === 0 && u.login !== 'admin');
			// We have no other choice but to pick only the first one
			username = adminUsersOnline[0]?.login;
			if (!username) {
				username = 'admin';
				logger.warn('Could not find a username, switching to admin by default', { service });
			}
		}
		const rawData = await fs.readFile(resolve(file), 'utf-8');
		if (!testJSON(rawData)) {
			logger.debug(`File ${file} is not JSON, ignoring`, { service });
			return;
		}
		const data = JSON.parse(rawData);
		const KMFileType = detectKMFileTypes(data);
		const url = `http://localhost:${getConfig().System.FrontendPort}/admin`;
		switch (KMFileType) {
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
				// Unrecognized, ignoring
				throw 'Filetype not recognized';
		}
	} catch (err) {
		logger.error(`Could not handle ${file}`, { service, obj: err });
	}
}

export function applyMenu(layout: MenuLayout) {
	createMenu(layout);
}

async function initElectronWindow() {
	await createWindow();
	applyMenu('REDUCED');
}

async function createWindow() {
	// Create the browser window
	const state = getState();
	win = new BrowserWindow({
		width: 1400,
		height: 900,
		backgroundColor: '#36393f',
		show: false,
		icon: resolve(state.resourcePath, 'build/icon.png'),
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});
	// and load the index.html of the app.
	if (initDone) {
		win?.loadURL(await welcomeToYoukousoKaraokeMugen());
	} else {
		win?.loadURL(`file://${resolve(state.resourcePath, 'initpage/index.html')}`);
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
		chibiPlayerWindow?.destroy();
		chibiPlaylistWindow?.destroy();
	});
}

function openLink(url: string) {
	url.indexOf('//localhost') !== -1 ? win?.loadURL(url) : open(url);
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

export function closeAllWindows() {
	// Hide main window since destroying it would force-kill the app.
	win?.hide();
	chibiPlayerWindow?.destroy();
	chibiPlaylistWindow?.destroy();
	aboutWindow?.destroy();
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
				nodeIntegration: true,
				contextIsolation: false,
			},
			icon: resolve(state.resourcePath, 'build/icon.png'),
		});
		const port = state.frontendPort;
		chibiPlayerWindow.once('ready-to-show', () => {
			chibiPlayerWindow.show();
		});
		chibiPlayerWindow.on('moved', () => {
			const pos = chibiPlayerWindow.getPosition();
			setConfig({
				GUI: {
					ChibiPlayer: {
						PositionX: pos[0],
						PositionY: pos[1],
					},
				},
			});
		});
		// Apparently it can be destroyed even though we just created it, perhaps if KM gets killed early during startup, who knows.
		// Sometimes I wonder what our users are doing.
		if (chibiPlayerWindow) {
			await chibiPlayerWindow.loadURL(`http://localhost:${port}/chibi?admpwd=${await generateAdminPassword()}`);
		}
	} else {
		chibiPlayerWindow?.destroy();
	}
}

export function setChibiPlayerAlwaysOnTop(enabled: boolean) {
	if (chibiPlayerWindow) chibiPlayerWindow.setAlwaysOnTop(enabled);
}

export async function updateChibiPlaylistWindow(show: boolean) {
	const state = getState();
	const conf = getConfig();
	if (show) {
		chibiPlaylistWindow = new BrowserWindow({
			width: conf.GUI.ChibiPlaylist.Width,
			height: conf.GUI.ChibiPlaylist.Height,
			x: conf.GUI.ChibiPlaylist.PositionX,
			y: conf.GUI.ChibiPlaylist.PositionY,
			show: false,
			backgroundColor: '#36393f',
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false,
			},
			resizable: true,
			icon: resolve(state.resourcePath, 'build/icon.png'),
		});
		const port = state.frontendPort;
		chibiPlaylistWindow.once('ready-to-show', () => {
			chibiPlaylistWindow.show();
		});
		chibiPlaylistWindow.on('resized', () => {
			const size = chibiPlaylistWindow.getSize();
			setConfig({
				GUI: {
					ChibiPlaylist: {
						Width: size[0],
						Height: size[1],
					},
				},
			});
		});
		chibiPlaylistWindow.on('moved', () => {
			const pos = chibiPlaylistWindow.getPosition();
			setConfig({
				GUI: {
					ChibiPlaylist: {
						PositionX: pos[0],
						PositionY: pos[1],
					},
				},
			});
		});
		await chibiPlaylistWindow.loadURL(
			`http://localhost:${port}/chibiPlaylist?admpwd=${await generateAdminPassword()}`
		);
	} else {
		chibiPlaylistWindow?.destroy();
	}
}

export async function showAbout() {
	if (aboutWindow?.focusable) {
		aboutWindow.focus();
	} else {
		const state = getState();
		aboutWindow = new BrowserWindow({
			width: 700,
			height: 450,
			show: false,
			backgroundColor: '#36393f',
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false,
			},
			resizable: false,
			icon: resolve(state.resourcePath, 'build/icon.png'),
			title: i18next.t('ABOUT.TITLE'),
		});
		aboutWindow.on('ready-to-show', () => {
			aboutWindow.show();
		});
		aboutWindow.on('close', () => {
			aboutWindow.destroy();
			aboutWindow = undefined;
		});
		aboutWindow.loadURL(`http://localhost:${state.frontendPort}/about?admpwd=${await generateAdminPassword()}`);
	}
}
