import i18next from 'i18next';

import { MenuItemBuilderFunction } from '../../types/electron';

const builder: MenuItemBuilderFunction = () => {
	return {
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
	};
};

export default builder;
