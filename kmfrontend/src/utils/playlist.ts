import dayjs from 'dayjs';

import { DBPL } from '../../../src/types/database/playlist';
import type { GlobalContextInterface } from '../store/context';
import { nonStandardPlaylists } from './tools';

const exportDateFormat = 'YYYY-MM-DD_HH-mm-ss';

export const getPlaylistExportFileName = (playlist: DBPL) =>
	`KaraMugen_${playlist?.name}_${dayjs().format(exportDateFormat)}.kmplaylist`;

export const getFavoritesExportFileName = (username: string) =>
	`KaraMugen_fav_${username}_${dayjs().format(exportDateFormat)}.kmfavorites`;

export const getPlaylistIcon = (playlist: PlaylistElem, context: GlobalContextInterface) => {
	// public & current playlist :  play-circle & globe icons
	if (playlist?.flag_public && playlist?.flag_current) return ['fa-play-circle', 'fa-globe'];
	// public playlist : globe icon
	if (playlist?.flag_public) return ['fa-globe'];
	// current playlist : play-circle icon
	if (playlist?.flag_current) return ['fa-play-circle'];
	// library : book icon
	if (playlist?.plaid === nonStandardPlaylists.library) return ['fa-book'];
	// animelist depending of user settings
	if (playlist?.plaid === nonStandardPlaylists.animelist)
		return [`icon-${context?.globalState.settings.data.user.anime_list_to_fetch}`];
	// blacklist : ban icon
	if (playlist?.plaid === context.globalState.settings.data.state.blacklistPlaid) return ['fa-ban'];
	// whitelist : check-circle icon
	if (playlist?.plaid === context.globalState.settings.data.state.whitelistPlaid) return ['fa-check-circle'];
	// fallback playlist : arrows-turn-to-dots icon
	if (playlist?.plaid === context.globalState.settings.data.state.fallbackPlaid) return ['fa-arrows-turn-to-dots'];
	// favorites : star icon
	if (playlist?.plaid === nonStandardPlaylists.favorites) return ['fa-star'];
	// others playlist : list-ol icon
	return ['fa-list-ol'];
};
