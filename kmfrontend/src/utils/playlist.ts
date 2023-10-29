import dayjs from 'dayjs';
import { DBPL } from '../../../src/types/database/playlist';

const exportDateFormat = 'YYYY-MM-DD_HH-mm-ss';

export const getPlaylistExportFileName = (playlist: DBPL) =>
	`KaraMugen_${playlist?.name}_${dayjs().format(exportDateFormat)}.kmplaylist`;

export const getFavoritesExportFileName = (username: string) =>
	`KaraMugen_fav_${username}_${dayjs().format(exportDateFormat)}.kmfavorites`;
