import { setState, getState } from './utils/state';
import { app, BrowserWindow, Menu, MenuItem, ipcMain, dialog } from 'electron';
import { welcomeToYoukousoKaraokeMugen } from './services/welcome';
import i18next from 'i18next';
import { on } from './lib/utils/pubsub';
import { autoUpdater } from 'electron-updater';
import { configureLocale } from './lib/utils/config';
import { main } from './index';
import logger from './lib/utils/logger';
import { exit } from './services/engine';
import { resolve } from 'path';
import open from 'open';

export let win: Electron.BrowserWindow;

export async function startElectron() {
	setState({electron: app });
	// This is called when Electron finished initializing
	app.on('ready', async () => {
		createWindow();
		on('KMReady', async () => {
			win.loadURL(await welcomeToYoukousoKaraokeMugen());
			let menu = Menu.getApplicationMenu();
			menu.append(new MenuItem({ label: i18next.t('MENU_SHOW_SECURITY_CODE'), click() {
				const state = getState();
				dialog.showMessageBox({ type: 'none', title : i18next.t('SECURITY_CODE_TITLE'),
					message: `${i18next.t('SECURITY_CODE_MESSAGE')}
				${state.securityCode}` });
			}}));
			Menu.setApplicationMenu(menu);
			autoUpdater.checkForUpdatesAndNotify();
		});
		ipcMain.on('initPageReady', async () => {
			try {
				await main();
			} catch(err) {
				logger.error(`[Launcher] Error during launch : ${err}`);
				console.log(err);
				exit(1);
			}
		});
	});

	app.on('window-all-closed', () => {
		// On macOS it is common that the application won't quit when all windows are closed until the user doesn't quit with Cmd + Q
		if (process.platform !== 'darwin') {
			exit(0).then(() => app.quit());
		}
	});

	app.on('activate', () => {
		// Recreate the window if the app is clicked on in the dock(for macOS)
		if (win === null) {
			createWindow();
		}
	});

	configureLocale()
		.then(() => {
			const state = getState();
			app.setAboutPanelOptions({
				applicationName: 'Karaoke Mugen',
				applicationVersion: `${state.version.number} (${state.version.name})`,
				copyright: `(c) 2017-${new Date().getFullYear()} Karaoke Mugen Team`,
				version: state.version.number,
				website: 'https://karaokes.moe'
			});
			const menu = new Menu();
			menu.append(new MenuItem({
				label: process.platform === 'darwin' ? 'KaraokeMugen' : i18next.t('MENU_FILE'),
				submenu: [
					{
						label: i18next.t('MENU_FILE_ABOUT'),
						click() {
							app.showAboutPanel();
						}
					},
					{
						label: i18next.t('MENU_FILE_RELOAD'),
						accelerator: 'CmdOrCtrl+R',
						role: 'reload'
					},
					{
						label: i18next.t('MENU_FILE_QUIT'),
						accelerator: 'CmdOrCtrl+Q',
						click() {
							exit(0).then(() => app.quit());
						}
					}
				]
			}));
			Menu.setApplicationMenu(menu);
		});
}

function createWindow () {
	// Create the browser window
	const state = getState();
	win = new BrowserWindow({
		width: 980,
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
		open(url);
	});

	// What to do when the window is closed.
	win.on('closed', () => {
	  win = null;
	});
}

export function setProgressBar(number: number) {
	if (win) win.setProgressBar(number);
}
