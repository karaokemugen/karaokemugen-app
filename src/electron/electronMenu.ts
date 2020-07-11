import openAboutWindow from 'about-window';
import { clipboard,dialog } from 'electron';
import {autoUpdater} from 'electron-updater';
import i18next from 'i18next';
import open from 'open';
import { resolve } from 'path';

import {exit} from '../components/engine';
import { getConfig, setConfig } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import { removeNulls } from '../lib/utils/object_helpers';
import { getState } from '../utils/state';
import {handleFile,win} from './electron';
import { setManualUpdate } from './electronAutoUpdate';

const isMac = process.platform === 'darwin';

let menuItems: any;

export function getMenu() {
	return menuItems;
}

function isOpenElectron(): boolean {
	return getConfig().GUI.OpenInElectron;
}

export function initMenu() {
	const port = getConfig().Frontend.Port;
	const base = 'http://localhost';
	const urls = {
		operatorOptions: `${base}:${port}/admin?config`,
		systemOptions: `${base}:${port}/system/km/options`,
		home: `${base}:${port}/welcome`,
		operator: `${base}:${port}/admin`,
		public: `${base}:${port}/`,
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
				{
					label: i18next.t('MENU_FILE_ABOUT'),
					click() {
						const version = getState().version;
						const versionSHA = version.sha
							? `version ${version.sha}`
							: '';
						openAboutWindow({
							icon_path: resolve(getState().resourcePath, 'build/icon.png'),
							product_name: `Karaoke Mugen "${version.name}"`,
							bug_link_text: i18next.t('ABOUT.BUG_REPORT'),
							bug_report_url: 'https://lab.shelter.moe/karaokemugen/karaokemugen-app/issues/new?issue%5Bassignee_id%5D=&issue%5Bmilestone_id%5D=',
							homepage: 'https://mugen.karaokes.moe',
							description: versionSHA,
							copyright: 'by Karaoke Mugen Dev Team, under MIT license',
							use_version_info: true,
							css_path: resolve(getState().resourcePath, 'build/electronAboutWindow.css')
						});

					}
				},
				{ type: 'separator'},
				!isMac && !getState().forceDisableAppUpdate ? {
					// Updater menu disabled on macs until we can sign our code
					label: i18next.t('MENU_FILE_UPDATE'),
					click: async () => {
						setManualUpdate(true);
						logger.info('Checking for updates manually', {service: 'AppUpdate'});
						await autoUpdater.checkForUpdates();
						setManualUpdate(false);
					}
				} : { role: 'services' },
				{
					label: i18next.t('MENU_FILE_IMPORT'),
					async click() {
						const files = await dialog.showOpenDialog({
							properties: ['openFile', 'multiSelections']
						});
						if (!files.canceled) {
							for (const file of files.filePaths) {
								await handleFile(file);
							}
						}
					}
				},
				{ type: 'separator'},
				{
					label: isMac ? i18next.t('MENU_FILE_QUIT_OSX') : i18next.t('MENU_FILE_QUIT'),
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
				{ label: i18next.t('MENU_SECURITYCODE_SHOW'), async click() {
					const state = getState();
					const buttons = await dialog.showMessageBox({
						type: 'none',
						title: i18next.t('SECURITY_CODE_TITLE'),
						message: `${i18next.t('SECURITY_CODE_MESSAGE')} ${state.securityCode}`,
						buttons: [i18next.t('COPY_TO_CLIPBOARD'), i18next.t('IT_IS_IN_MY_HEAD')],
					});
					if (buttons.response === 0) {
						clipboard.writeText(state.securityCode.toString());
					}
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
				!isMac && !getState().forceDisableAppUpdate ? {
					label: i18next.t('MENU_OPTIONS_CHECKFORUPDATES'),
					type: 'checkbox',
					checked: getConfig().Online.Updates.App,
					click() {
						setConfig({ Online: {Updates: { App: !getConfig().Online.Updates.App}}});
					}
				} : null,
				{
					label: i18next.t('MENU_OPTIONS_OPERATORCONFIG'),
					accelerator: 'CmdOrCtrl+F',
					click() {
						isOpenElectron()
							? win.loadURL(urls.operatorOptions)
							: open(urls.operatorOptions);
					}
				},
				{
					label: i18next.t('MENU_OPTIONS_SYSTEMCONFIG'),
					accelerator: 'CmdOrCtrl+G',
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
					{ label: i18next.t('MENU_WINDOW_TOFRONT'), role: 'front' },
					{ label: i18next.t('MENU_WINDOW_CLOSE'), role: 'close' }
				] : [])
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
	if (isMac) {
		menuItems.splice(2, 0,
			/**
			*
			* EDIT MENU
			*
			*/
			{
				label: i18next.t('MENU_EDIT'),
				submenu: [
					{ label: i18next.t('MENU_EDIT_UNDO'), role: 'undo' },
					{ label: i18next.t('MENU_EDIT_REDO'), role: 'redo' },
					{ type: 'separator' },
					{ label: i18next.t('MENU_EDIT_CUT'), role: 'cut' },
					{ label: i18next.t('MENU_EDIT_COPY'), role: 'copy' },
					{ label: i18next.t('MENU_EDIT_PASTE'), role: 'paste' },
					{ label: i18next.t('MENU_EDIT_PASTEWITHSTYLE'), role: 'pasteAndMatchStyle' },
					{ label: i18next.t('MENU_EDIT_DELETE'), role: 'delete' },
					{ label: i18next.t('MENU_EDIT_SELECT_ALL'), role: 'selectAll' },
					{ type: 'separator' },
					{
						label: i18next.t('MENU_EDIT_SPEECH'),
						submenu: [
							{ label: i18next.t('MENU_EDIT_STARTSPEECH'), role: 'startspeaking' },
							{ label: i18next.t('MENU_EDIT_STOPSPEECH'), role: 'stopspeaking' }
						]
					}
				]
			});
	}
	removeNulls(menuItems);
}
