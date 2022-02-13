import './PlaylistPage.scss';

import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import { DBPLC } from '../../../../src/lib/types/database/playlist';
import GlobalContext from '../../store/context';
import { getTagInLocale, getTitleInLocale, sortAndHideTags } from '../../utils/kara';
import { commandBackend, getSocket } from '../../utils/socket';
import { tagTypes } from '../../utils/tagTypes';
import PlayerBox from './public/PlayerBox';

async function fetchNextSongs(plaid: string) {
	const { index } = await commandBackend('findPlayingSongInPlaylist', { plaid });
	return commandBackend('getPlaylistContents', { plaid, from: index + 1, size: 15 });
}

export default function PlaylistPage() {
	const context = useContext(GlobalContext);
	const [playlist, setPlaylist] = useState<DBPLC[]>([]);
	const [i18n, seti18n] = useState<any>([]);
	const updatePlaylist = (plaid?: string) => {
		if (plaid && plaid !== context.globalState.settings.data.state.currentPlaid) return;
		fetchNextSongs(context.globalState.settings.data.state.currentPlaid).then(data => {
			setPlaylist(data.content);
			seti18n(data.i18n);
		});
	};

	useEffect(() => {
		getSocket().on('playlistContentsUpdated', updatePlaylist);
		getSocket().on('currentPlaylistUpdated', updatePlaylist);
		return () => {
			getSocket().off('playlistContentsUpdated', updatePlaylist);
			getSocket().off('currentPlaylistUpdated', updatePlaylist);
		};
	}, [context.globalState.settings.data.state.currentPlaid]);

	useEffect(() => {
		updatePlaylist();
		document.getElementsByTagName('body')[0].className = 'no-scroll';
		document.title = 'Chibi Playlist';
	}, []);

	return (
		<div className="chibi-playlist">
			<PlayerBox
				mode="playlist"
				show={true}
				currentVisible={false}
				onKaraChange={kid => {
					if (kid) {
						updatePlaylist();
					}
				}}
			/>
			<h3 className="following">
				{i18next.t('PUBLIC_HOMEPAGE.NEXT')} <i className="fas fa-fw fa-chevron-right" />
			</h3>
			<ul>
				{playlist.map(kara => {
					const serieText =
						kara.series?.length > 0
							? kara.series
									.slice(0, 3)
									.map(e => getTagInLocale(context.globalState.settings.data, e, i18n))
									.join(', ') + (kara.series.length > 3 ? '...' : '')
							: kara.singers
							? kara.singers
									.slice(0, 3)
									.map(e => e.name)
									.join(', ') + (kara.singers.length > 3 ? '...' : '')
							: '';
					const songtypeText = sortAndHideTags(kara.songtypes, 'public')
						.map(e => (e.short ? +e.short : e.name))
						.join(' ');
					const songorderText = kara.songorder > 0 ? ' ' + kara.songorder : '';
					const karaVersions = (() => {
						// Tags in the header
						const typeData = tagTypes['VERSIONS'];
						if (kara.versions) {
							return sortAndHideTags(kara[typeData.karajson], 'public').map(tag => {
								return (
									<div
										key={tag.tid}
										className={`tag inline ${typeData.color}`}
										title={getTagInLocale(context.globalState.settings.data, tag)}
									>
										{getTagInLocale(context.globalState.settings.data, tag)}
									</div>
								);
							});
						} else {
							return null;
						}
					})();
					return (
						<li className="following-li" key={kara.kid}>
							<div className="title">
								<span className="title">
									{getTitleInLocale(context.globalState.settings.data, kara.titles)}
								</span>{' '}
								{karaVersions}
							</div>
							<div className="series">{`${serieText} - ${songtypeText}${songorderText}`}</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
