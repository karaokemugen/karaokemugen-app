import { app, dialog } from 'electron';
import i18next from 'i18next';
import {setManualUpdate, win} from './electron';
import {autoUpdater} from 'electron-updater';
import {exit} from './services/engine';
import { getConfig, setConfig } from './lib/utils/config';
import open from 'open';
import { getState } from './utils/state';

const isMac = process.platform === 'darwin';

let menuItems: any;

export function getMenu() {
	return menuItems;
}

function isOpenElectron(): boolean {
	return getConfig().GUI.OpenInElectron;
}

export async function initMenu() {
	const port = getConfig().Frontend.Port;
	const base = 'http://localhost';
	const urls = {
		operatorOptions: `${base}:${port}/admin?config`,
		systemOptions: `${base}:${port}/system/km/config`,
		home: `${base}:${port}/welcome`,
		operator: `${base}:${port}/admin`,
		public: `${base}:${port}/public`,
		system: `${base}:${port}/system`,
		logs: `${base}:${port}/system/km/log`,
		download: `${base}:${port}/system/km/karas/download`,
		karas: `${base}:${port}/system/km/karas`,
		database: `${base}:${port}/system/km/db`
	};
	menuItems = [
		/**
		 *
		 * MAIN MENU / FILE MENU
		 *
		 */
		{
			label: isMac ? 'Karaoke Mugen' : i18next.t('MENU_FILE'),
			submenu: [
				!isMac ? {
					// Updater menu disabled on macs until we can sign our code
					label: i18next.t('MENU_FILE_UPDATE'),
					click: async () => {
						setManualUpdate(true);
						await autoUpdater.checkForUpdates();
						setManualUpdate(false);
					}
				} : { role: 'services' },
				{
					label: i18next.t('MENU_FILE_ABOUT'),
					click() {
						app.showAboutPanel();
					}
				},
				{ type: 'separator'},
				{
					label: i18next.t('MENU_FILE_QUIT'),
					accelerator: 'CmdOrCtrl+Q',
					click() {
						exit(0);
					}
				}
			]
		},
		   /**
		    *
		    * SECURITY CODE MENU
		    *
			*/
		{
			label: i18next.t('MENU_SECURITYCODE'),
			submenu: [
				{ label: i18next.t('MENU_SECURITYCODE_SHOW'), click() {
					const state = getState();
					dialog.showMessageBox({
						type: 'none',
						title: i18next.t('SECURITY_CODE_TITLE'),
						message: `${i18next.t('SECURITY_CODE_MESSAGE')} ${state.securityCode}`
					});
				}
				}
			]
		},
		  /**
		   *
		   * VIEW MENU
		   *
		   */
		  {
			label: i18next.t('MENU_VIEW'),
			submenu: [
			  { label: i18next.t('MENU_VIEW_RELOAD'), role: 'reload' },
			  { label: i18next.t('MENU_VIEW_RELOADFORCE'), role: 'forcereload' },
			  { label: i18next.t('MENU_VIEW_TOGGLEDEVTOOLS'), role: 'toggledevtools' },
			  { type: 'separator' },
			  { label: i18next.t('MENU_VIEW_RESETZOOM'), role: 'resetzoom' },
			  { label: i18next.t('MENU_VIEW_ZOOMIN'), role: 'zoomin' },
			  { label: i18next.t('MENU_VIEW_ZOOMOUT'), role: 'zoomout' },
			  { type: 'separator' },
			  { label: i18next.t('MENU_VIEW_FULLSCREEN'), role: 'togglefullscreen' }
			]
		  },
		  /**
		   *
		   * GO TO MENU
		   *
		   */
		  {
			label: i18next.t('MENU_GOTO'),
			submenu: [
				{
					label: i18next.t('MENU_GOTO_HOME'),
					accelerator: 'CmdOrCtrl+H',
					click() {
						isOpenElectron()
							? win.loadURL(urls.home)
							: open(urls.home);
					}
				},
				{
					label: i18next.t('MENU_GOTO_OPERATOR'),
					accelerator: 'CmdOrCtrl+O',
					click() {
						isOpenElectron()
							? win.loadURL(urls.operator)
							: open(urls.operator);
					}
				},
				{
					label: i18next.t('MENU_GOTO_SYSTEM'),
					accelerator: 'CmdOrCtrl+S',
					click() {
						isOpenElectron()
							? win.loadURL(urls.system)
							: open(urls.system);
					}
				},
				{
					label: i18next.t('MENU_GOTO_PUBLIC'),
					accelerator: 'CmdOrCtrl+P',
					click() {
						isOpenElectron()
							? win.loadURL(urls.public)
							: open(urls.public);
					}
				},
			]
		  },
		  /**
		   *
		   * TOOLS MENU
		   *
		   */
		  {
			label: i18next.t('MENU_TOOLS'),
			submenu: [
				{
					label: i18next.t('MENU_TOOLS_LOGS'),
					accelerator: 'CmdOrCtrl+L',
					click() {
						isOpenElectron()
							? win.loadURL(urls.logs)
							: open(urls.logs);
					}
				},
				{
					label: i18next.t('MENU_TOOLS_DOWNLOADS'),
					accelerator: 'CmdOrCtrl+D',
					click() {
						isOpenElectron()
							? win.loadURL(urls.download)
							: open(urls.download);
					}
				},
				{
					label: i18next.t('MENU_TOOLS_KARAOKES'),
					accelerator: 'CmdOrCtrl+K',
					click() {
						isOpenElectron()
							? win.loadURL(urls.karas)
							: open(urls.karas);
					}
				},
				{
					label: i18next.t('MENU_TOOLS_DATABASE'),
					accelerator: 'CmdOrCtrl+B',
					click() {
						isOpenElectron()
							? win.loadURL(urls.database)
							: open(urls.database);
					}
				},
			]
		  },
		  /**
		   *
		   * OPTIONS
		   *
		   */
		  {
			label: i18next.t('MENU_OPTIONS'),
			submenu: [
				{
					label: i18next.t('MENU_OPTIONS_OPENINELECTRON'),
					type: 'checkbox',
					checked: isOpenElectron(),
					click() {
						setConfig({ GUI: {OpenInElectron: !isOpenElectron()}});
					}
				},
				{
					label: i18next.t('MENU_OPTIONS_OPERATORCONFIG'),
					accelerator: 'CmdOrCtrl+C',
					click() {
						isOpenElectron()
							? win.loadURL(urls.operatorOptions)
							: open(urls.operatorOptions);
					}
				},
				{
					label: i18next.t('MENU_OPTIONS_SYSTEMCONFIG'),
					accelerator: 'CmdOrCtrl+V',
					click() {
						isOpenElectron()
							? win.loadURL(urls.systemOptions)
							: open(urls.systemOptions);
					}
				},
			]
		  },
		  /**
		   *
		   * WINDOW MENU
		   *
		   */
		  {
			label: i18next.t('MENU_WINDOW'),
			submenu: [
			  { label: i18next.t('MENU_WINDOW_MINIMIZE'), role: 'minimize' },
			  ...(isMac ? [
					{ type: 'separator' },
					{ label: i18next.t('MENU_WINDOW_TOFRONT'), role: 'front' },
					{ type: 'separator' }
			  ] : [
					{ label: i18next.t('MENU_WINDOW_CLOSE'), role: 'close' }
			  ])
			]
		  },
		  /**
		   *
		   * HELP MENU
		   *
		   */
		  {
			label: i18next.t('MENU_HELP'),
			role: 'help',
			submenu: [
			  {
					label: i18next.t('MENU_HELP_WEBSITE'),
					click: () => {
				  open('https://karaokes.moe');
					}
			  }
			]
		  }
	];
}
