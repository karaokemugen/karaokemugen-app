import './PlayerBox.scss';

import i18next from 'i18next';
import { sample } from 'lodash';
import { ReactFragment, RefObject, useContext, useEffect, useRef, useState } from 'react';
import ResizeObserver from 'resize-observer-polyfill';

import { PublicPlayerState } from '../../../../../src/types/state';
import GlobalContext from '../../../store/context';
import { getPreviewLink, getTagInLocale, getTitleInLocale, sortAndHideTags } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';
import { secondsTimeSpanToHMS } from '../../../utils/tools';

interface IProps {
	mode: 'fixed' | 'homepage' | 'playlist';
	show: boolean;
	currentVisible: boolean;
	goToCurrentPL?: () => void;
	onResize?: (bottom: string) => void;
	onKaraChange?: (kid: string) => void;
}

function PlayerBox(props: IProps) {
	const context = useContext(GlobalContext);
	const [width, setWidth] = useState('0');
	const [title, setTitle] = useState(i18next.t('KARA_PAUSED_WAITING'));
	const [subtitle, setSubtitle] = useState('');
	const [length, setLength] = useState(0);
	const [timePosition, setTimePosition] = useState(0);
	const [img, setImg] = useState('');
	const [kid, setKid] = useState('');
	const [favorites, setFavorites] = useState(new Set<string>());
	const [karaVersions, setKaraVersions] = useState<ReactFragment>();
	const ref: RefObject<HTMLDivElement> = useRef();
	const containerRef: RefObject<HTMLDivElement> = useRef();

	const resetBox = () => {
		setTitle(i18next.t('KARA_PAUSED_WAITING'));
		setSubtitle('');
		setWidth('0');
		setLength(0);
		setTimePosition(0);
		setImg('');
		setKid('');
	};

	const resizeCheck = () => {
		if (containerRef?.current) {
			props.onResize(`${containerRef.current.scrollHeight}px`);
		}
	};

	const getFavorites = async (payload?: string) => {
		if (payload === undefined || payload === context.globalState.auth.data.username) {
			const result = await commandBackend('getFavorites', { mini: true });
			const set = new Set<string>();
			for (const kara of result) {
				set.add(kara.kid);
			}
			setFavorites(set);
		}
	};

	const toggleFavorite = async event => {
		event.stopPropagation();
		if (favorites.has(kid)) {
			await commandBackend('deleteFavorites', {
				kids: [kid],
			});
		} else {
			await commandBackend('addFavorites', {
				kids: [kid],
			});
		}
	};

	/**
	 * refresh the player infos
	 */
	const refreshPlayerInfos = async (data: PublicPlayerState) => {
		if (data.mediaType || data.currentSong) {
			setWidth('0');
			if (data.mediaType === 'stop') {
				resetBox();
				setTitle(i18next.t('KARA_PAUSED_WAITING'));
				setSubtitle(sample(i18next.t('KARA_PAUSED_TAGLINES', { returnObjects: true })));
				if (props.onKaraChange) props.onKaraChange(null);
			} else if (data.mediaType === 'Jingles') {
				resetBox();
				setTitle(i18next.t('JINGLE_TIME'));
				setSubtitle(sample(i18next.t('JINGLE_TAGLINES', { returnObjects: true })));
				if (props.onKaraChange) props.onKaraChange(null);
			} else if (data.mediaType === 'Intros') {
				resetBox();
				setTitle(i18next.t('INTRO_TIME'));
				setSubtitle(sample(i18next.t('INTRO_TAGLINES', { returnObjects: true })));
				if (props.onKaraChange) props.onKaraChange(null);
			} else if (data.mediaType === 'Outros') {
				resetBox();
				setTitle(i18next.t('OUTRO_TIME'));
				setSubtitle(sample(i18next.t('OUTRO_TAGLINES', { returnObjects: true })));
				if (props.onKaraChange) props.onKaraChange(null);
			} else if (data.mediaType === 'Encores') {
				resetBox();
				setTitle(i18next.t('ENCORES_TIME'));
				setSubtitle(sample(i18next.t('ENCORES_TAGLINES', { returnObjects: true })));
				if (props.onKaraChange) props.onKaraChange(null);
			} else if (data.mediaType === 'Sponsors') {
				resetBox();
				setTitle(i18next.t('SPONSOR_TIME'));
				setSubtitle(sample(i18next.t('SPONSOR_TAGLINES', { returnObjects: true })));
				if (props.onKaraChange) props.onKaraChange(null);
			} else if (data.mediaType === 'pause') {
				resetBox();
				setTitle(i18next.t('PAUSE_TIME'));
				setSubtitle(sample(i18next.t('PAUSE_TAGLINES', { returnObjects: true })));
				if (props.onKaraChange) props.onKaraChange(null);
			} else if (data.mediaType === 'poll') {
				resetBox();
				setTitle(i18next.t('POLL_TIME'));
				setSubtitle(sample(i18next.t('POLL_TAGLINES', { returnObjects: true })));
				if (props.onKaraChange) props.onKaraChange(null);
			} else if (data.currentSong) {
				const kara = data.currentSong;
				const serieText =
					kara.series?.length > 0
						? kara.series
								.slice(0, 3)
								.map(e => getTagInLocale(context?.globalState.settings.data, e))
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
									title={getTagInLocale(context?.globalState.settings.data, tag)}
								>
									{getTagInLocale(context?.globalState.settings.data, tag)}
								</div>
							);
						});
					} else {
						return null;
					}
				})();

				if (props.onKaraChange) props.onKaraChange(kara.kid);
				resetBox();
				setTitle(getTitleInLocale(context.globalState.settings.data, kara.titles));
				setSubtitle(`${serieText} - ${songtypeText}${songorderText}`);
				setLength(kara.duration);
				setKid(kara.kid);
				setImg(`url(${getPreviewLink(kara)})`);
				setKaraVersions(karaVersions);
			}
		}

		if (ref.current) {
			const newWidth = (ref.current.offsetWidth * data.timeposition) / length + 'px';

			if (data.timeposition && length !== 0) {
				setWidth(newWidth);
				setTimePosition(data.timeposition);
			}
		}
	};

	const getFirstPlayerInfos = async () => {
		if (
			context.globalState.auth.isAuthenticated &&
			context?.globalState.settings.data.config?.Frontend?.Mode !== 0
		) {
			try {
				const result = await commandBackend('getPlayerStatus');
				refreshPlayerInfos(result);
			} catch (e) {
				// already display
			}
			if (props.mode === 'homepage' && context.globalState.auth.data.role !== 'guest') {
				getFavorites();
			}
		}
	};

	useEffect(() => {
		let observer;
		getFirstPlayerInfos();
		getSocket().on('connect', getFirstPlayerInfos);
		if (props.mode === 'fixed') {
			observer = new ResizeObserver(resizeCheck);
			observer.observe(containerRef.current);
			resizeCheck();
		} else {
			if (context.globalState.auth.data.role !== 'guest') getSocket().on('favoritesUpdated', getFavorites);
		}
		return () => {
			getSocket().off('connect', getFirstPlayerInfos);
			window.removeEventListener('resize', resizeCheck);
			if (observer) {
				observer.disconnect();
			} else {
				if (context.globalState.auth.data.role !== 'guest') getSocket().off('favoritesUpdated', getFavorites);
			}
		};
	}, []);

	useEffect(() => {
		getSocket().on('playerStatus', refreshPlayerInfos);
		return () => {
			getSocket().off('playerStatus', refreshPlayerInfos);
		};
	}, [length]);

	return (
		<div
			onClick={props.currentVisible ? props.goToCurrentPL : undefined}
			className={`player-box${props.mode === 'fixed' ? ' fixed' : ''}`}
			style={{ ['--img' as any]: img, display: props.show ? undefined : 'none' }}
			ref={containerRef}
		>
			{props.mode !== 'fixed' ? (
				<div className="first">
					<p>{i18next.t('PUBLIC_HOMEPAGE.NOW_PLAYING')}</p>
					{props.currentVisible && props.goToCurrentPL ? (
						<p className="next" tabIndex={0} onKeyDown={props.goToCurrentPL}>
							{i18next.t('PUBLIC_HOMEPAGE.NEXT')}
							<i className="fas fa-fw fa-chevron-right" />
						</p>
					) : null}
				</div>
			) : null}
			{props.mode === 'fixed' ? (
				<div className="title inline">
					<div>
						<h3 className="song">{title}</h3>
						{karaVersions}
					</div>
					<h4 className="series">{subtitle}</h4>
				</div>
			) : (
				<div className="title">
					<div>
						<h3 className="song">{title}</h3>
						{karaVersions}
					</div>
					<h4 className="series">{subtitle}</h4>
				</div>
			)}
			{props.mode === 'homepage' && length !== 0 && context.globalState.auth.data.role !== 'guest' ? (
				<button className="btn favorites" onClick={toggleFavorite}>
					<i className="fas fa-fw fa-star" />
					{favorites.has(kid) ? i18next.t('KARA_MENU.FAV_DEL') : i18next.t('KARA_MENU.FAV')}
				</button>
			) : null}
			{length !== 0 ? (
				<>
					{props.mode !== 'fixed' ? (
						<div className="timers">
							<div>{secondsTimeSpanToHMS(Math.round(timePosition), 'mm:ss')}</div>
							<div>{secondsTimeSpanToHMS(length, 'mm:ss')}</div>
						</div>
					) : null}
					<div className="progress-bar-container" ref={ref}>
						<div className="progress-bar" style={{ width: width }} />
					</div>
				</>
			) : null}
		</div>
	);
}

export default PlayerBox;
