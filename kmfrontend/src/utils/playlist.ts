import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
	faArrowsTurnToDots,
	faBan,
	faBook,
	faCheckCircle,
	faGlobe,
	faListOl,
	faPlayCircle,
	faStar,
} from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';

import { DBPL } from '../../../src/types/database/playlist';
import type { GlobalContextInterface } from '../store/context';
import { nonStandardPlaylists } from './tools';

// Playlist icon can be from fontawesome or al-icon css class
export type PlaylistIcon = IconDefinition | { alIcon: string };

const exportDateFormat = 'YYYY-MM-DD_HH-mm-ss';

export const getPlaylistExportFileName = (playlist: DBPL) =>
	`KaraMugen_${playlist?.name}_${dayjs().format(exportDateFormat)}.kmplaylist`;

export const getFavoritesExportFileName = (username: string) =>
	`KaraMugen_fav_${username}_${dayjs().format(exportDateFormat)}.kmfavorites`;

export const getPlaylistIcon = (playlist: DBPL, context: GlobalContextInterface): PlaylistIcon[] => {
	// public & current playlist :  play-circle & globe icons
	if (playlist?.flag_public && playlist?.flag_current) return [faPlayCircle, faGlobe];
	// public playlist : globe icon
	if (playlist?.flag_public) return [faGlobe];
	// current playlist : play-circle icon
	if (playlist?.flag_current) return [faPlayCircle];
	// library : book icon
	if (playlist?.plaid === nonStandardPlaylists.library) return [faBook];
	// animelist depending of user settings
	if (playlist?.plaid === nonStandardPlaylists.animelist)
		return [{ alIcon: `icon-${context?.globalState.settings.data.user.anime_list_to_fetch}` }];
	// blacklist : ban icon
	if (playlist?.plaid === context.globalState.settings.data.state.blacklistPlaid) return [faBan];
	// whitelist : check-circle icon
	if (playlist?.plaid === context.globalState.settings.data.state.whitelistPlaid) return [faCheckCircle];
	// fallback playlist : arrows-turn-to-dots icon
	if (playlist?.plaid === context.globalState.settings.data.state.fallbackPlaid) return [faArrowsTurnToDots];
	// favorites : star icon
	if (playlist?.plaid === nonStandardPlaylists.favorites) return [faStar];
	// others playlist : list-ol icon
	return [faListOl];
};
