import i18next from 'i18next';

import { exit } from '../../components/engine.js';
import { getConfig, setConfig } from '../../lib/utils/config.js';
import { MenuItemBuilderFunction } from '../../types/electron.js';
import { getState } from '../../utils/state.js';
import { showAbout } from '../electron.js';
import { checkForUpdates, urls } from './index.js';

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
			isMac ? { type: 'separator' } : null,
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
