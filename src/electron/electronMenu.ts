import openAboutWindow from 'about-window';
import { dialog, MenuItem, MenuItemConstructorOptions } from 'electron';
import {autoUpdater} from 'electron-updater';
import i18next from 'i18next';
import open from 'open';
import { resolve } from 'path';

import { exit } from '../components/engine';
import { getConfig, setConfig } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import { removeNulls } from '../lib/utils/objectHelpers';
import { getState } from '../utils/state';
import { handleFile, updateChibiPlayerWindow, updateChibiPlaylistWindow, win } from './electron';
import { setManualUpdate } from './electronAutoUpdate';

const isMac = process.platform === 'darwin';

let menuItems: Array<(MenuItemConstructorOptions) | (MenuItem)>;

export function getMenu() {
	return menuItems;
}

export function initMenu() {
	const port = getState().frontendPort;
	const base = 'http://localhost';
	const urls = {
		operatorOptions: `${base}:${port}/admin/options`,
		systemOptions: `${base}:${port}/system/options`,
		home: `${base}:${port}/welcome`,
		operator: `${base}:${port}/admin`,
		public: `${base}:${port}/public`,
		system: `${base}:${port}/system/home`,
		logs: `${base}:${port}/system/log`,
		download: `${base}:${port}/system/karas/download`,
		karas: `${base}:${port}/system/karas`,
		database: `${base}:${port}/system/db`
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
					click: displayAbout,
					visible: isMac
				},
				isMac ? { type: 'separator', visible: isMac }:null,
				{
					label: i18next.t('MENU_OPTIONS_OPERATORCONFIG_OSX'),
					accelerator: 'CmdOrCtrl+T',
					visible: isMac,
					click: () => {
						openURL(urls.operatorOptions);
					}
				},
				{
					label: i18next.t('MENU_OPTIONS_SYSTEMCONFIG_OSX'),
					accelerator: 'CmdOrCtrl+G',
					visible: isMac,
					click: () => {
						openURL(urls.systemOptions);
					}
				},
				isMac ? { type: 'separator', visible: isMac }:null,
				{
					// Updater menu disabled on macs until we can sign our code
					label: i18next.t('MENU_FILE_UPDATE'),
					visible: !isMac && !getState().forceDisableAppUpdate,
					click: checkForUpdates
				},
				{ role: 'services', visible: isMac },
				{
					label: i18next.t('MENU_FILE_IMPORT'),
					type: 'submenu',
					submenu: [
						{
							label: i18next.t('MENU_FILE_IMPORT_PLAYLIST'),
							click: importFile
						},
						{
							label: i18next.t('MENU_FILE_IMPORT_FAVORITES'),
							click: importFile
						},
						{
							label: i18next.t('MENU_FILE_IMPORT_KARABUNDLE'),
							click: importFile
						},
						{
							label: i18next.t('MENU_FILE_IMPORT_BLCSET'),
							click: importFile
						},
					]
				},
				{ type: 'separator'},
				{
					label: isMac ? i18next.t('MENU_FILE_QUIT_OSX') : i18next.t('MENU_FILE_QUIT'),
					accelerator: 'CmdOrCtrl+Q',
					click: () => {
						exit();
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
				{ label: i18next.t('MENU_VIEW_RELOADFORCE'), role: 'forceReload' },
				{ label: i18next.t('MENU_VIEW_TOGGLEDEVTOOLS'), role: 'toggleDevTools' },
				{ type: 'separator' },
				{ label: i18next.t('MENU_VIEW_RESETZOOM'), role: 'resetZoom' },
				{ label: i18next.t('MENU_VIEW_ZOOMIN'), role: 'zoomIn' },
				{ label: i18next.t('MENU_VIEW_ZOOMOUT'), role: 'zoomOut' },
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
			label: isMac ? i18next.t('MENU_GOTO_OSX') : i18next.t('MENU_GOTO'),
			submenu: [
				{
					label: i18next.t('MENU_GOTO_HOME'),
					accelerator: 'CmdOrCtrl+H',
					click: () => {
						openURL(urls.home);
					}
				},
				{
					label: i18next.t('MENU_GOTO_OPERATOR'),
					accelerator: 'CmdOrCtrl+O',
					click: () => {
						openURL(urls.operator);
					}
				},
				{
					label: i18next.t('MENU_GOTO_SYSTEM'),
					accelerator: 'CmdOrCtrl+S',
					click: () => {
						openURL(urls.system);
					}
				},
				{
					label: i18next.t('MENU_GOTO_PUBLIC'),
					accelerator: 'CmdOrCtrl+P',
					click: () => {
						openURL(urls.public);
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
					click: () => {
						openURL(urls.logs);
					}
				},
				{
					label: i18next.t('MENU_TOOLS_DOWNLOADS'),
					accelerator: 'CmdOrCtrl+D',
					click: () => {
						openURL(urls.download);
					}
				},
				{
					label: i18next.t('MENU_TOOLS_KARAOKES'),
					accelerator: 'CmdOrCtrl+K',
					click: () => {
						openURL(urls.karas);
					}
				},
				{
					label: i18next.t('MENU_TOOLS_DATABASE'),
					accelerator: 'CmdOrCtrl+B',
					click: () => {
						openURL(urls.database);
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
			visible: !isMac,
			submenu: [
				{
					label: i18next.t('MENU_OPTIONS_CHECKFORUPDATES'),
					type: 'checkbox',
					checked: getConfig().Online.Updates.App,
					visible: !getState().forceDisableAppUpdate,
					click: () => {
						setConfig({Online: {Updates: { App: !getConfig().Online.Updates.App}}});
					}
				},
				{ type: 'separator' },
				{
					label: i18next.t('MENU_OPTIONS_OPERATORCONFIG'),
					accelerator: 'CmdOrCtrl+T',
					click: () => {
						openURL(urls.operatorOptions);
					}
				},
				{
					label: i18next.t('MENU_OPTIONS_SYSTEMCONFIG'),
					accelerator: 'CmdOrCtrl+G',
					click: () => {
						openURL(urls.systemOptions);
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
				{ type: 'separator' },
				{
					label: i18next.t('MENU_OPTIONS_OPENINELECTRON'),
					type: 'checkbox',
					checked: getConfig().GUI.OpenInElectron,
					click: () => {
						setConfig({GUI: {OpenInElectron: !getConfig().GUI.OpenInElectron}});
					}
				},
				{
					label: i18next.t('MENU_OPTIONS_CHIBIPLAYER'),
					type: 'checkbox',
					accelerator: 'CmdOrCtrl+I',
					checked: getConfig().GUI.ChibiPlayer.Enabled,
					click: () => {
						updateChibiPlayerWindow(!getConfig().GUI.ChibiPlayer.Enabled);
						setConfig({GUI: {ChibiPlayer: { Enabled: !getConfig().GUI.ChibiPlayer.Enabled }}});
					}
				},
				{
					label: i18next.t('MENU_OPTIONS_CHIBIPLAYLIST'),
					type: 'checkbox',
					accelerator: 'CmdOrCtrl+Y',
					checked: getConfig().GUI.ChibiPlaylist.Enabled,
					click: () => {
						updateChibiPlaylistWindow(!getConfig().GUI.ChibiPlaylist.Enabled);
						setConfig({GUI: {ChibiPlaylist: { Enabled: !getConfig().GUI.ChibiPlaylist.Enabled }}});
					}
				}
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
					label: i18next.t('MENU_HELP_GUIDE'),
					click: () => {
						open(`https://docs.karaokes.moe/${getState().defaultLocale}/user-guide/getting-started/`);
					}
				},
				{
					label: i18next.t('MENU_HELP_WEBSITE'),
					click: () => {
						open('https://karaokes.moe');
					}
				},
				{
					label: i18next.t('MENU_HELP_TWITTER'),
					click: () => {
						open('https://twitter.com/KaraokeMugen');
					}
				},
				{
					label: i18next.t('MENU_HELP_DISCORD'),
					click: () => {
						open('https://karaokes.moe/discord');
					}
				},
				{
					label: i18next.t('MENU_HELP_GITLAB'),
					click: () => {
						open('https://lab.shelter.moe/karaokemugen/karaokemugen-app');
					}
				},
				{ type: 'separator'},
				{
					label: i18next.t('MENU_HELP_CHANGELOG'),
					click: () => {
						open('https://lab.shelter.moe/karaokemugen/karaokemugen-app/-/releases');
					}
				},
				{ type: 'separator'},
				{
					label: i18next.t('MENU_HELP_CONTRIB_DOC'),
					click: () => {
						open(`https://docs.karaokes.moe/${getState().defaultLocale}/contrib-guide/base/`);
					}
				},
				{
					label: i18next.t('MENU_HELP_SEND_KARAOKE'),
					click: () => {
						open('https://kara.moe/base/import');
					}
				},
				{ type: 'separator'},
				{
					label: i18next.t('MENU_HELP_REPORT_BUG'),
					click: () => {
						open('https://lab.shelter.moe/karaokemugen/karaokemugen-app/-/issues');
					}
				},
				{
					label: i18next.t('MENU_FILE_ABOUT'),
					click: displayAbout,
					visible: !isMac
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
					{ label: i18next.t('MENU_EDIT_DELETE'), role: 'delete' },
					{ label: i18next.t('MENU_EDIT_SELECT_ALL'), role: 'selectAll' },
					{ type: 'separator' },
					{
						label: i18next.t('MENU_EDIT_SPEECH'),
						submenu: [
							{ label: i18next.t('MENU_EDIT_STARTSPEECH'), role: 'startSpeaking' },
							{ label: i18next.t('MENU_EDIT_STOPSPEECH'), role: 'stopSpeaking' }
						]
					}
				]
			});
	}
	menuItems = removeNulls(menuItems);
}

function openURL(url: string) {
	getConfig().GUI.OpenInElectron
		? win?.loadURL(url)
		: open(url);
}

async function checkForUpdates() {
	setManualUpdate(true);
	logger.info('Checking for updates manually', {service: 'AppUpdate'});
	await autoUpdater.checkForUpdates().catch(() => {
		// Handled in electronAutoUpadte.ts
	});
	setManualUpdate(false);
}

async function importFile() {
	const files = await dialog.showOpenDialog({
		properties: ['openFile', 'multiSelections']
	});
	if (!files.canceled) {
		for (const file of files.filePaths) {
			await handleFile(file);
		}
	}
}

function displayAbout() {
	{
		const version = getState().version;
		const versionSHA = version.sha
			? `version ${version.sha}`
			: '';
		openAboutWindow({
			icon_path: resolve(getState().resourcePath, 'build/icon.png'),
			product_name: `Karaoke Mugen\n${version.name}`,
			bug_link_text: i18next.t('ABOUT.BUG_REPORT'),
			bug_report_url: 'https://lab.shelter.moe/karaokemugen/karaokemugen-app/issues/new?issue%5Bassignee_id%5D=&issue%5Bmilestone_id%5D=',
			homepage: 'https://mugen.karaokes.moe',
			description: versionSHA,
			copyright: i18next.t('ABOUT.COPYRIGHT'),
			use_version_info: true,
			css_path: resolve(getState().resourcePath, 'build/electronAboutWindow.css'),
			win_options: {
				title: i18next.t('ABOUT.TITLE')
			}
		});
	}
}
