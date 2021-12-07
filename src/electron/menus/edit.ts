import i18next from 'i18next';

import { MenuItemBuilderFunction } from '../../types/electron';

const builder: MenuItemBuilderFunction = (options) => {
	const { isMac } = options;
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
			isMac ? { type: 'separator' } : null,
			isMac
				? {
						label: i18next.t('MENU_EDIT_SPEECH'),
						submenu: [
							{ label: i18next.t('MENU_EDIT_STARTSPEECH'), role: 'startSpeaking' },
							{ label: i18next.t('MENU_EDIT_STOPSPEECH'), role: 'stopSpeaking' },
						],
				  }
				: null,
		],
	};
};

export default builder;
