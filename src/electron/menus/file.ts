import i18next from 'i18next';

import { exit } from '../../components/engine';
import { getConfig, setConfig } from '../../lib/utils/config';
import { MenuItemBuilderFunction } from '../../types/electron';
import { getState } from '../../utils/state';
import { showAbout } from '../electron';
import { checkForUpdates, importFile, urls } from '.';

const builder: MenuItemBuilderFunction = options => {
	const { isMac, layout } = options;
	const isReduced = layout === 'REDUCED';
	return {
		label: isMac ? 'Karaoke Mugen' : i18next.t('MENU_FILE'),
		submenu: [
			{
				label: i18next.t('MENU_HELP_ABOUT'),
				click: showAbout,
				visible: isMac,
			},
			{ type: 'separator', visible: isMac },
			{
				label: i18next.t('MENU_OPTIONS_OPERATORCONFIG_OSX'),
				accelerator: 'CmdOrCtrl+T',
				visible: isMac && !isReduced,
				click: urls.operatorOptions,
			},
			{
				label: i18next.t('MENU_OPTIONS_SYSTEMCONFIG_OSX'),
				accelerator: 'CmdOrCtrl+G',
				visible: isMac && !isReduced,
				click: urls.systemOptions,
			},
			!isReduced && isMac ? { type: 'separator' } : null,
			{
				label: i18next.t('MENU_FILE_UPDATE'),
				visible: !getState().forceDisableAppUpdate,
				click: checkForUpdates,
			},
			{
				label: i18next.t('MENU_OPTIONS_CHECKFORUPDATES'),
				type: 'checkbox',
				checked: getConfig().Online.Updates.App,
				visible: !getState().forceDisableAppUpdate && isMac,
				click: () => {
					setConfig({ Online: { Updates: { App: !getConfig().Online.Updates.App } } });
				},
			},
			{
				visible: !isReduced,
				label: i18next.t('MENU_FILE_IMPORT'),
				type: 'submenu',
				submenu: [
					{
						label: i18next.t('MENU_FILE_IMPORT_PLAYLIST'),
						click: importFile,
					},
					{
						label: i18next.t('MENU_FILE_IMPORT_FAVORITES'),
						click: importFile,
					},
					{
						label: i18next.t('MENU_FILE_IMPORT_KARABUNDLE'),
						click: importFile,
					},
				],
			},
			{ type: 'separator', visible: !isReduced },
			{
				label: isMac ? i18next.t('MENU_FILE_QUIT_OSX') : i18next.t('MENU_FILE_QUIT'),
				accelerator: 'CmdOrCtrl+Q',
				click: () => {
					exit();
				},
			},
		],
	};
};

export default builder;
