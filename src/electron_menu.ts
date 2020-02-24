import { app } from 'electron';
import i18next from 'i18next';
import {setManualUpdate} from './electron';
import {autoUpdater} from 'electron-updater';
import {exit} from './services/engine';

const isMac = process.platform === 'darwin'

let menuItems: any

export function getMenu() {
	return menuItems;
}

export async function initMenu() {
	menuItems = [
		{
			label: isMac ? app.name : i18next.t('MENU_FILE'),
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
		{
			label: i18next.t('MENU_EDIT'),
			submenu: [
			  { label: i18next.t('MENU_EDIT_UNDO'), role: 'undo' },
			  { label: i18next.t('MENU_EDIT_REDO'), role: 'redo' },
			  { type: 'separator' },
			  { label: i18next.t('MENU_EDIT_CUT'), role: 'cut' },
			  { label: i18next.t('MENU_EDIT_COPY'), role: 'copy' },
			  { label: i18next.t('MENU_EDIT_PASTE'), role: 'paste' },
			  ...(isMac ? [
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
			  ] : [
				{ label: i18next.t('MENU_EDIT_DELETE'), role: 'delete' },
				{ type: 'separator' },
				{ label: i18next.t('MENU_EDIT_SELECTALL'), role: 'selectAll' }
			  ])
			]
		  },
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
		  // { role: 'windowMenu' }
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
		  {
			label: i18next.t('MENU_HELP'),
			role: 'help',
			submenu: [
			  {
				label: i18next.t('MENU_HELP_WEBSITE'),
				click: () => {
				  open('https://karaokes.moe')
				}
			  }
			]
		  }
	];
}
