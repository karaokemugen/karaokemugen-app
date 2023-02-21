import { clipboard } from 'electron';
import i18next from 'i18next';

import { getConfig, setConfig } from '../../lib/utils/config';
import { generateAdminPassword } from '../../services/user';
import { MenuItemBuilderFunction } from '../../types/electron';
import { editSetting } from '../../utils/config';
import { getState } from '../../utils/state';
import { updateChibiPlayerWindow, updateChibiPlaylistWindow } from '../electron';

const builder: MenuItemBuilderFunction = options => {
	const { layout } = options;
	const isReduced = layout === 'REDUCED';
	return {
		label: i18next.t('MENU_WINDOW'),
		submenu: [
			{ label: i18next.t('MENU_WINDOW_MINIMIZE'), role: 'minimize' },
			!isReduced ? { type: 'separator' } : null,
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
			{
				label: i18next.t('MENU_OPTIONS_CHIBIPLAYLIST_LINK'),
				click: async () => {
					const state = getState();
					clipboard.writeText(
						`http://localhost:${state.frontendPort}/chibiPlaylist?admpwd=${await generateAdminPassword()}`
					);
				},
				visible: !isReduced,
			},
			{
				label: i18next.t('MENU_WINDOW_PLAYERMONITOR'),
				type: 'checkbox',
				accelerator: 'CmdOrCtrl+A',
				checked: getConfig().Player.Monitor,
				click: () => {
					editSetting({ Player: { Monitor: !getConfig().Player.Monitor } });
				},
				visible: !isReduced,
			},
		],
	};
};

export default builder;
