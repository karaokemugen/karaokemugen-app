import i18next from 'i18next';

import { MenuItemBuilderFunction } from '../../types/electron';
import { urls } from '.';

const builder: MenuItemBuilderFunction = options => {
	const { layout } = options;
	if (layout === 'REDUCED') {
		return null;
	}
	return {
		label: i18next.t('MENU_TOOLS'),
		submenu: [
			{
				label: i18next.t('MENU_TOOLS_LOGS'),
				accelerator: 'CmdOrCtrl+L',
				click: urls.logs,
			},
			{
				label: i18next.t('MENU_TOOLS_DOWNLOADS'),
				accelerator: 'CmdOrCtrl+D',
				click: urls.download,
			},
			{
				label: i18next.t('MENU_TOOLS_KARAOKES'),
				accelerator: 'CmdOrCtrl+K',
				click: urls.karas,
			},
			{
				label: i18next.t('MENU_TOOLS_DATABASE'),
				accelerator: 'CmdOrCtrl+B',
				click: urls.database,
			},
		],
	};
};

export default builder;
