import i18next from 'i18next';

import { exit } from '../../components/engine';
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
				// Updater menu disabled on macs until we can sign our code
				label: i18next.t('MENU_FILE_UPDATE'),
				visible: !isMac && !getState().forceDisableAppUpdate,
				click: checkForUpdates,
			},
			{ role: 'services', visible: isMac && !isReduced },
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
