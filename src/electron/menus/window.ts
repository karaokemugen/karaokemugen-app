import i18next from 'i18next';

import { getConfig, setConfig } from '../../lib/utils/config';
import { MenuItemBuilderFunction } from '../../types/electron';
import { updateChibiPlayerWindow, updateChibiPlaylistWindow } from '../electron';

const builder: MenuItemBuilderFunction = (options) => {
	const { layout } = options;
	const isReduced = layout === 'REDUCED';
	return {
		label: i18next.t('MENU_WINDOW'),
		submenu: [
			{ label: i18next.t('MENU_WINDOW_MINIMIZE'), role: 'minimize' },
			!isReduced ? { type: 'separator' } : null,
			{
				label: i18next.t('MENU_OPTIONS_OPENINELECTRON'),
				type: 'checkbox',
				checked: getConfig().GUI.OpenInElectron,
				click: () => {
					setConfig({ GUI: { OpenInElectron: !getConfig().GUI.OpenInElectron } });
				},
				visible: !isReduced,
			},
			{
				label: i18next.t('MENU_OPTIONS_CHIBIPLAYER'),
				type: 'checkbox',
				accelerator: 'CmdOrCtrl+I',
				checked: getConfig().GUI.ChibiPlayer.Enabled,
				click: () => {
					updateChibiPlayerWindow(!getConfig().GUI.ChibiPlayer.Enabled);
					setConfig({ GUI: { ChibiPlayer: { Enabled: !getConfig().GUI.ChibiPlayer.Enabled } } });
				},
				visible: !isReduced,
			},
			{
				label: i18next.t('MENU_OPTIONS_CHIBIPLAYLIST'),
				type: 'checkbox',
				accelerator: 'CmdOrCtrl+Y',
				checked: getConfig().GUI.ChibiPlaylist.Enabled,
				click: () => {
					updateChibiPlaylistWindow(!getConfig().GUI.ChibiPlaylist.Enabled);
					setConfig({ GUI: { ChibiPlaylist: { Enabled: !getConfig().GUI.ChibiPlaylist.Enabled } } });
				},
				visible: !isReduced,
			},
		],
	};
};

export default builder;
