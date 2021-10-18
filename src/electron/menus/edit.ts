import i18next from 'i18next';

import { MenuItemBuilderFunction } from '../../types/electron';

const builder: MenuItemBuilderFunction = (options) => {
	if (options.isMac || options.layout === 'REDUCED') {
		return null;
	}
	return {
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
	};
};

export default builder;
