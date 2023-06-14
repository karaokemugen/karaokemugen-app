import i18next from 'i18next';

import { MenuItemBuilderFunction } from '../../types/electron.js';
import { urls } from './index.js';

const builder: MenuItemBuilderFunction = options => {
	const { isMac, layout } = options;
	if (layout === 'REDUCED') {
		return null;
	}
	return {
		label: isMac ? i18next.t('MENU_GOTO_OSX') : i18next.t('MENU_GOTO'),
		submenu: [
			{
				label: i18next.t('MENU_GOTO_HOME'),
				accelerator: 'CmdOrCtrl+H',
				click: urls.home,
			},
			{
				label: i18next.t('MENU_GOTO_OPERATOR'),
				accelerator: 'CmdOrCtrl+O',
				click: urls.operator,
			},
			{
				label: i18next.t('MENU_GOTO_SYSTEM'),
				accelerator: 'CmdOrCtrl+S',
				click: urls.system,
			},
			{
				label: i18next.t('MENU_GOTO_PUBLIC'),
				accelerator: 'CmdOrCtrl+P',
				click: urls.public,
			},
		],
	};
};

export default builder;
