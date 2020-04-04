import { setState, getState } from '../utils/state';
import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import { welcomeToYoukousoKaraokeMugen } from '../services/welcome';
import { on } from '../lib/utils/pubsub';
import { configureLocale, getConfig } from '../lib/utils/config';
import { main, preInit } from '../index';
import logger from '../lib/utils/logger';
import { exit } from '../components/engine';
import { resolve } from 'path';
import open from 'open';
import { initMenu, getMenu } from './electronMenu';
import {initAutoUpdate} from './electronAutoUpdate';
import {ipcMain as ipc} from 'electron-better-ipc';

export let win: Electron.BrowserWindow;

let initDone = false;

export async function startElectron() {
	setState({electron: app });
	// This is called when Electron finished initializing
	app.on('ready', async () => {
		try {
			await preInit();
		} catch(err) {
			throw Error(err);
		}
		await initElectronWindow();
		on('KMReady', async () => {
			win.loadURL(await welcomeToYoukousoKaraokeMugen());
			initAutoUpdate();
			initDone = true;
		});
		ipcMain.once('initPageReady', async () => {
			try {
				await main();
			} catch(err) {
				logger.error(`[Launcher] Error during launch : ${err}`);
			}
		});
	});

	app.on('window-all-closed', () => {
		exit(0);
	});

	app.on('activate', async () => {
		// Recreate the window if the app is clicked on in the dock(for macOS)
		if (win === null) {
			await initElectronWindow();
		}
	});

	ipc.answerRenderer('get-file-paths', async options => {
		return (await dialog.showOpenDialog(options)).filePaths
	});

	await configureLocale();
}

async function initElectronWindow() {
	await createWindow();
	await initMenu();
	const menu = Menu.buildFromTemplate(getMenu());
	Menu.setApplicationMenu(menu);
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
	getConfig().GUI.OpenInElectron && url.indexOf('//localhost') != -1
	? win.loadURL(url)
	: open(url);
}

export function setProgressBar(number: number) {
	if (win) win.setProgressBar(number);
}

