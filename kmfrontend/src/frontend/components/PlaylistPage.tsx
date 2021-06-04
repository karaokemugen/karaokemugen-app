import './PlaylistPage.scss';

import i18next from 'i18next';
import React, { useContext, useEffect, useState } from 'react';

import { DBPLC } from '../../../../src/types/database/playlist';
import GlobalContext, { GlobalContextInterface } from '../../store/context';
import { getSerieLanguage, getTagInLocale, sortTagByPriority } from '../../utils/kara';
import { commandBackend, getSocket } from '../../utils/socket';
import { tagTypes } from '../../utils/tagTypes';
import PlayerBox from './public/PlayerBox';

async function fetchNextSongs(plaid: string) {
	const { index } = await commandBackend('findPlayingSongInPlaylist', { plaid });
	const data = await commandBackend('getPlaylistContents', { plaid, from: index + 1, size: 15 });
	return data.content;
}

export default function PlaylistPage() {
	const context: GlobalContextInterface = useContext(GlobalContext);
	const [playlist, setPlaylist] = useState<DBPLC[]>([]);
	const updatePlaylist = (plaid?: string) => {
		if (plaid && plaid !== context.globalState.settings.data.state.currentPlaid) return;
		fetchNextSongs(context.globalState.settings.data.state.currentPlaid).then(pl => {
			setPlaylist(pl);
		});
	};

	useEffect(updatePlaylist, []);
	useEffect(() => {
		getSocket().on('playlistContentsUpdated', updatePlaylist);
		getSocket().on('currentPlaylistUpdated', updatePlaylist);
		document.getElementsByTagName('body')[0].className = 'no-scroll';
		document.title = 'Chibi Playlist';
		return () => {
			getSocket().off('playlistContentsUpdated', updatePlaylist);
			getSocket().off('currentPlaylistUpdated', updatePlaylist);
		};
	}, []);

	return (
		<div className="chibi-playlist">
			<PlayerBox mode="playlist" show={true} currentVisible={false} onKaraChange={kid => {
				if (kid) {
					updatePlaylist();
				}
			}} />
			<h3 className="following">{i18next.t('PUBLIC_HOMEPAGE.NEXT')} <i className="fas fa-fw fa-chevron-right" /></h3>
			<ul>
				{playlist.map(kara => {
					const serieText = kara.series?.length > 0 ? kara.series.slice(0, 3).map(e => getSerieLanguage(context.globalState.settings.data, e, kara.langs[0].name)).join(', ')
						+ (kara.series.length > 3 ? '...' : '')
						: (kara.singers ? kara.singers.slice(0, 3).map(e => e.name).join(', ') + (kara.singers.length > 3 ? '...' : '') : '');
					const songtypeText = [...kara.songtypes].sort(sortTagByPriority).map(e => e.short ? + e.short : e.name).join(' ');
					const songorderText = kara.songorder > 0 ? ' ' + kara.songorder : '';
					const karaVersions = (() => {
						// Tags in the header
						const typeData = tagTypes['VERSIONS'];
						if (kara.versions) {
							return kara[typeData.karajson].sort(sortTagByPriority).map(tag => {
								return <div key={tag.tid} className={`tag inline ${typeData.color}`} title={getTagInLocale(tag)}>
									{getTagInLocale(tag)}
								</div>;
							});
						} else {
							return null;
						}
					})();
					return <li className="following-li" key={kara.kid}>
						<div className="title"><span className="title">{kara.title}</span> {karaVersions}</div>
						<div className="series">{`${serieText} - ${songtypeText}${songorderText}`}</div>
					</li>;
				})}
			</ul>
		</div>
	);
}
