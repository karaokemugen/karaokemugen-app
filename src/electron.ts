import { setState, getState } from './utils/state';
import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import { welcomeToYoukousoKaraokeMugen } from './services/welcome';
import i18next from 'i18next';
import { on } from './lib/utils/pubsub';
import { autoUpdater } from 'electron-updater';
import { configureLocale, getConfig } from './lib/utils/config';
import { main, preInit } from './index';
import logger from './lib/utils/logger';
import { exit } from './services/engine';
import { resolve } from 'path';
import open from 'open';
import { initMenu, getMenu } from './electron_menu';

export let win: Electron.BrowserWindow;

let manualUpdate = false;

export function setManualUpdate(state: boolean) {
	manualUpdate = state;
}

export async function startElectron() {
	setState({electron: app });
	// This is called when Electron finished initializing
	app.on('ready', async () => {
		try {
			await preInit();
		} catch(err) {
			throw Error(err);
		}
		createWindow();
		await initMenu();
		const menu = Menu.buildFromTemplate(getMenu());
		Menu.setApplicationMenu(menu);
		on('KMReady', async () => {
			win.loadURL(await welcomeToYoukousoKaraokeMugen());
			autoUpdater.logger = logger;
			autoUpdater.on('error', (error) => {
				dialog.showErrorBox(`${i18next.t('ERROR')}: `, error === null ? 'unknown' : (error.stack || error).toString());
			});
			autoUpdater.on('update-available', async () => {
				const buttonIndex = await dialog.showMessageBox(win, {
				  type: 'info',
				  title: i18next.t('UPDATE_FOUND'),
				  message: i18next.t('UPDATE_PROMPT'),
				  buttons: [i18next.t('YES'), i18next.t('NO')]
				});
				if (buttonIndex.response === 0) {
				  autoUpdater.downloadUpdate();
				}
			  });

			autoUpdater.on('update-not-available', () => {
				if (manualUpdate) dialog.showMessageBox({
				  title: i18next.t('UPDATE_NOT_AVAILABLE'),
				  message: i18next.t('CURRENT_VERSION_OK')
				});
			  });

			autoUpdater.on('update-downloaded', async () => {
				await dialog.showMessageBox(win, {
				  title: i18next.t('UPDATE_DOWNLOADED'),
				  message: i18next.t('UPDATE_READY_TO_INSTALL_RESTARTING')
				});
				autoUpdater.quitAndInstall();
			});

			if (getConfig().Online.Updates.App && process.platform !== 'darwin') {
				autoUpdater.checkForUpdatesAndNotify();
			}
		});
		ipcMain.on('initPageReady', async () => {
			try {
				await main();
			} catch(err) {
				logger.error(`[Launcher] Error during launch : ${err}`);
			}
		});
	});

	app.on('window-all-closed', () => {
		// On macOS it is common that the application won't quit when all windows are closed until the user doesn't quit with Cmd + Q
		if (process.platform !== 'darwin') {
			exit(0);
		}
	});

	app.on('activate', () => {
		// Recreate the window if the app is clicked on in the dock(for macOS)
		if (win === null) {
			createWindow();
		}
	});

	await configureLocale();
}

function createWindow () {
	// Create the browser window
	const state = getState();
	win = new BrowserWindow({
		width: 1280,
		height: 720,
		backgroundColor: '#36393f',
		icon: resolve(state.resourcePath, 'assets/icon.png'),
		webPreferences: {
			nodeIntegration: true
		}
	});
	// and load the index.html of the app.
	win.loadURL(`file://${resolve(state.resourcePath, 'initpage/index.html')}`);
	win.show();
	win.webContents.on('new-window', (event, url) => {
		event.preventDefault();
		getConfig().GUI.OpenInElectron
		    ? win.loadURL(url)
			: open(url);
	});

	// What to do when the window is closed.
	win.on('closed', () => {
	  win = null;
	});
}

export function setProgressBar(number: number) {
	if (win) win.setProgressBar(number);
}

