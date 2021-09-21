import './KaraDetail.scss';

import i18next from 'i18next';
import React, { MouseEvent, ReactNode, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';

import { DBKaraTag, lastplayed_ago } from '../../../../../src/lib/types/database/kara';
import { DBPLCInfo } from '../../../../../src/types/database/playlist';
import { KaraDownloadRequest } from '../../../../../src/types/download';
import nanamiSingPng from '../../../assets/nanami-sing.png';
import nanamiSingWebP from '../../../assets/nanami-sing.webp';
import { setBgImage } from '../../../store/actions/frontendContext';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext, { GlobalContextInterface } from '../../../store/context';
import { buildKaraTitle, formatLyrics, getPreviewLink, getTitleInLocale, sortTagByPriority } from '../../../utils/kara';
import { commandBackend, isRemote } from '../../../utils/socket';
import { tagTypes, YEARS } from '../../../utils/tagTypes';
import {
	displayMessage,
	is_touch_device,
	isNonStandardPlaylist,
	nonStandardPlaylists,
	secondsTimeSpanToHMS
} from '../../../utils/tools';
import { View } from '../../types/view';
import InlineTag from './InlineTag';

interface IProps {
	kid: string | undefined;
	scope: string;
	plaid?: string;
	criteriaLabel?: string;
	playlistcontentId?: number;
	closeOnPublic?: () => void;
	changeView?: (
		view: View,
		tagType?: number,
		searchValue?: string,
		searchCriteria?: 'year' | 'tag'
	) => void;
}

export default function KaraDetail(props: IProps) {
	const context: GlobalContextInterface = useContext(GlobalContext);
	const [kara, setKara] = useState<DBPLCInfo>();
	const [isFavorite, setFavorite] = useState(false);
	const [showVideo, setShowVideo] = useState(false);
	const [lyrics, setLyrics] = useState<string[]>([]);

	const keyObserverHandler = (e: KeyboardEvent) => {
		if (e.key === 'Escape' && !document.getElementById('video')) {
			closeModalWithContext();
		}
	};

	const setBg = () => {
		if (props.scope === 'admin') {
			return;
		}
		const generated = kara ? `url('${getPreviewLink(kara)}')` : 'none';
		if (generated !== context.globalState.frontendContext.backgroundImg) {
			setBgImage(context.globalDispatch, generated);
		}
	};

	const closeModalWithContext = () => closeModal(context.globalDispatch);

	const onClickOutsideModal = (e: MouseEvent) => {
		if (!(e.target as Element).closest('.modal-dialog')) {
			closeModalWithContext();
		}
	};

	const getKaraDetail = async (kid?: string) => {
		try {
			let url: string;
			let data: { plaid?: string, plc_id?: number, kid?: string };
			if (props.plaid && !isNonStandardPlaylist(props.plaid)) {
				url = 'getPLC';
				data = { plaid: props.plaid, plc_id: props.playlistcontentId };
			} else {
				url = 'getKara';
				data = { kid: (kid ? kid : props.kid) };
			}
			const karaGet = await commandBackend(url, data);
			await setKara(karaGet);
			await setFavorite(karaGet.flag_favorites || props.plaid === nonStandardPlaylists.favorites);
			if (karaGet.subfile) fetchLyrics();
		} catch (err) {
			closeModalWithContext();
		}
	};

	const getLastPlayed = (lastPlayed_at: Date, lastPlayed: lastplayed_ago) => {
		if (
			lastPlayed &&
			!lastPlayed.days &&
			!lastPlayed.months &&
			!lastPlayed.years
		) {
			const timeAgo =
				(lastPlayed.seconds ? lastPlayed.seconds : 0) +
				(lastPlayed.minutes ? lastPlayed.minutes * 60 : 0) +
				(lastPlayed.hours ? lastPlayed.hours * 3600 : 0);
			const timeAgoStr =
				lastPlayed.minutes || lastPlayed.hours
					? secondsTimeSpanToHMS(timeAgo, 'hm')
					: secondsTimeSpanToHMS(timeAgo, 'ms');

			return i18next.t('KARA_DETAIL.LAST_PLAYED_2', { time: timeAgoStr });
		} else if (lastPlayed_at) {
			return i18next.t('KARA_DETAIL.LAST_PLAYED', { date: new Date(lastPlayed_at).toLocaleDateString() });
		}
		return null;
	};

	const fetchLyrics = async () => {
		try {
			let response = await commandBackend('getKaraLyrics', { kid: props.kid });
			if (response?.length > 0) {
				response = formatLyrics(response);
			}
			setLyrics(response?.map(value => value.text) || []);
		} catch (e) {
			// already display
		}
	};

	const getInlineTag = (e: DBKaraTag, tagType: number) => {
		return <InlineTag
			key={e.tid}
			scope={props.scope}
			tag={e}
			tagType={tagType}
			className={e.problematic ? 'problematicTag' : 'inlineTag'}
			changeView={props.changeView}
		/>;
	};

	const makeFavorite = () => {
		if (context.globalState.auth.data.onlineAvailable !== false) {
			isFavorite ?
				commandBackend('deleteFavorites', {
					kids: [props.kid]
				}) :
				commandBackend('addFavorites', {
					kids: [props.kid]
				});
			setFavorite(!isFavorite);
		} else {
			displayMessage('warning', i18next.t('ERROR_CODES.FAVORITES_ONLINE_NOINTERNET'), 5000);
			return;
		}
	};

	const addKara = async () => {
		const response = await commandBackend('addKaraToPublicPlaylist', {
			requestedby: context.globalState.auth.data.username,
			kids: [props.kid]
		});
		if (response && response.code && response.data?.plc) {
			let message;
			if (response.data?.plc.time_before_play) {
				const playTime = new Date(Date.now() + response.data.plc.time_before_play * 1000);
				const playTimeDate = playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2);
				const beforePlayTime = secondsTimeSpanToHMS(response.data.plc.time_before_play, 'hm');
				message = (<>
					{i18next.t(`SUCCESS_CODES.${response.code}`, {
						song: getTitleInLocale(context.globalState.settings.data, kara.titles)
					})}
					<br />
					{i18next.t('KARA_DETAIL.TIME_BEFORE_PLAY', {
						time: beforePlayTime,
						date: playTimeDate
					})}
				</>);
			} else {
				message = (<>
					{i18next.t(`SUCCESS_CODES.${response.code}`, {
						song: getTitleInLocale(context.globalState.settings.data, kara.titles)
					})}
				</>);
			}
			displayMessage('success', <div className="toast-with-img">
				<picture>
					<source type="image/webp" srcSet={nanamiSingWebP} />
					<source type="image/png" srcSet={nanamiSingPng} />
					<img src={nanamiSingPng} alt="Nanami is singing!" />
				</picture>
				<span>
					{message}
					<br />
					<button className="btn" onClick={e => {
						e.preventDefault();
						e.stopPropagation();
						commandBackend('deleteKaraFromPlaylist', { plc_ids: [response.data.plc.plcid] })
							.then(() => {
								toast.dismiss(response.data.plc.plcid);
								displayMessage('success', i18next.t('SUCCESS_CODES.KARA_DELETED'));
							}).catch(() => {
								toast.dismiss(response.data.plc.plcid);
							});
					}}>{i18next.t('CANCEL')}</button>
				</span>
			</div>, 10000, 'top-left', response.data.plc.plcid);
		}
	};

	const downloadMedia = () => {
		const downloadObject: KaraDownloadRequest = {
			mediafile: kara.mediafile,
			kid: kara.kid,
			size: kara.mediasize,
			name: buildKaraTitle(context.globalState.settings.data, kara, true) as string,
			repository: kara.repository
		};
		commandBackend('addDownloads', { downloads: [downloadObject] }).catch(() => { });
	};

	const placeHeader = (headerEl: ReactNode) => createPortal(headerEl, document.getElementById('menu-supp-root'));

	useEffect(() => {
		setBg();
	}, [kara]);

	useEffect(() => {
		if (props.scope === 'admin' && !is_touch_device())
			document.addEventListener('keyup', keyObserverHandler);
		setBg();
		if (props.kid || props.plaid) {
			getKaraDetail();
		}
		return () => {
			if (props.scope === 'admin' && !is_touch_device())
				document.removeEventListener('keyup', keyObserverHandler);
			if (props.scope === 'public')
				setBgImage(context.globalDispatch, 'none');
		};
	}, []);

	if (kara) {

		// Tags in the header
		const karaTags = [];

		if (kara.langs) {
			const isMulti = kara.langs.find(e => e.name.indexOf('mul') > -1);
			isMulti ? karaTags.push(<div key={isMulti.tid} className="tag">
				{getInlineTag(isMulti, tagTypes.LANGS.type)}
			</div>) : karaTags.push(...kara.langs.sort(sortTagByPriority).map(tag => {
				return <div key={tag.tid} className="tag green" title={tag.short ? tag.short : tag.name}>
					{getInlineTag(tag, tagTypes.LANGS.type)}
				</div>;
			}));
		}
		if (kara.songtypes) {
			karaTags.push(...kara.songtypes.sort(sortTagByPriority).map(tag => {
				return <div key={tag.tid} className="tag green" title={tag.short ? tag.short : tag.name}>
					{getInlineTag(tag, tagTypes.SONGTYPES.type)}{kara.songorder > 0 ? ' ' + kara.songorder : ''}
				</div>;
			}));
		}
		for (const type of ['VERSIONS', 'FAMILIES', 'PLATFORMS', 'GENRES', 'ORIGINS', 'GROUPS', 'MISC']) {
			const tagData = tagTypes[type];
			if (kara[tagData.karajson]) {
				karaTags.push(...kara[tagData.karajson].sort(sortTagByPriority).map(tag => {
					return <div key={tag.tid} className={`tag ${tagData.color}`}
						title={tag.short ? tag.short : tag.name}>
						{getInlineTag(tag, tagData.type)}
					</div>;
				}));
			}
		}

		// Tags in the page/modal itself (singers, songwriters, creators, karaoke authors)
		const karaBlockTags = [];
		for (const type of ['SINGERS', 'SONGWRITERS', 'CREATORS', 'AUTHORS']) {
			let key = 0;
			const tagData = tagTypes[type];
			if (kara[tagData.karajson].length > 0) {
				karaBlockTags.push(<div className={`detailsKaraLine colored ${tagData.color}`}
					key={tagData.karajson}>
					<i className={`fas fa-fw fa-${tagData.icon}`} />
					<div>
						{i18next.t(`KARA.${type}_BY`)}
						<span key={`${type}${key}`} className="detailsKaraLineContent"> {kara[tagData.karajson]
							.map(e => getInlineTag(e, tagData.type)).reduce((acc, x, index, arr): any => acc === null ? [x] : [acc, (index + 1 === arr.length) ?
								<span key={`${type}${key}`}
									className={`colored ${tagData.color}`}> {i18next.t('AND')} </span> :
								<span key={`${type}${key}`}
									className={`colored ${tagData.color}`}>, </span>, x], null)}</span>
					</div>
				</div>);
				key++;
			}
		}

		const playTime = kara.time_before_play > 0 ? new Date(Date.now() + kara.time_before_play * 1000) : null;
		const details = (
			<React.Fragment>
				{props.criteriaLabel ? <div className="detailsKaraLine">
					<span>
						<i className="fas fa-fw fa-ban" />
						{props.criteriaLabel}
					</span>
				</div> : null}
				<div className="detailsKaraLine timeData">
					<span>
						<i className="fas fa-fw fa-clock" />
						{secondsTimeSpanToHMS(kara.duration, 'mm:ss')}
					</span>
					<span>
						{playTime
							? i18next.t('KARA_DETAIL.PLAYING_IN', {
								time: secondsTimeSpanToHMS(kara.time_before_play, 'hm'),
								date: playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2)
							})
							: (kara.lastplayed_ago
								? getLastPlayed(kara.lastplayed_at, kara.lastplayed_ago)
								: '')
						}
					</span>
				</div>
				{kara.upvotes && props.scope === 'admin' ?
					<div className="detailsKaraLine">
						<span
							title={i18next.t('KARA_DETAIL.UPVOTE_NUMBER')}>
							<i className="fas fa-thumbs-up" />
							{kara.upvotes}
						</span>
					</div> : null
				}
				<div className="detailsKaraLine">
					<span>
						{props.playlistcontentId ? i18next.t('KARA_DETAIL.ADDED') : i18next.t('KARA_DETAIL.CREATED')}
						{kara.created_at ? <>
							{i18next.t('KARA_DETAIL.ADDED_2')}
							<span className="boldDetails">{new Date(kara.created_at).toLocaleString()}</span>
						</> : null
						}
						{kara.nickname ? <>
							{i18next.t('KARA_DETAIL.ADDED_3')}
							<span className="boldDetails">{kara.nickname}</span>
						</> : null
						}
					</span>
				</div>
				{karaBlockTags}
				<div className="detailsKaraLine">
					<span className="boldDetails">
						<i className={`fas fa-fw fa-${YEARS.icon}`} />
						{kara.year}
					</span>
				</div>
			</React.Fragment>
		);

		const addKaraButton = (
			<button
				type="button"
				onClick={addKara}
				className="btn btn-action"
			>
				<i className="fas fa-fw fa-plus" />
				<span>{i18next.t('TOOLTIP_ADDKARA')}</span>
			</button>
		);

		const makeFavButton = (
			<button
				type="button"
				onClick={makeFavorite}
				className={`makeFav btn btn-action${isFavorite ? ' currentFav' : ''}`}
			>
				<i className="fas fa-fw fa-star" />
				<span>{isFavorite ? i18next.t('KARA_MENU.FAV_DEL') : i18next.t('KARA_MENU.FAV')}</span>
			</button>
		);

		const showVideoButton = (isRemote() && !/\./.test(kara.repository)) ? null : (
			<button
				type="button"
				className="btn btn-action"
				onClick={() => setShowVideo(!showVideo)}
			>
				<i className="fas fa-fw fa-video" />
				<span>{showVideo ? i18next.t('KARA_DETAIL.HIDE_VIDEO') : i18next.t('KARA_DETAIL.SHOW_VIDEO')}</span>
			</button>
		);

		const downloadVideoButton = kara.download_status !== 'MISSING' ? null : (
			<button
				type="button"
				className="btn btn-action"
				onClick={downloadMedia}
			>
				<i className="fas fa-fw fa-file-download" />
				<span>{i18next.t('KARA_DETAIL.DOWNLOAD_MEDIA')}</span>
			</button>
		);

		const video = showVideo ? (
			<video
				src={(isRemote() || kara.download_status !== 'DOWNLOADED') ?
					`https://${kara.repository}/downloads/medias/${kara.mediafile}` : `/medias/${kara.mediafile}`}
				controls={true} autoPlay={true} loop={true} playsInline={true}
				onLoadStart={(e) => e.currentTarget.volume = 0.5}
				className={`modal-video${props.scope === 'public' ? ' public' : ''}`} />
		) : null;

		const lyricsKara = kara.subfile ? (<div className="lyricsKara detailsKaraLine">
			{lyrics?.length > 0 ? <div className="boldDetails">
				<i className="fas fa-fw fa-closed-captioning" />
				{i18next.t('KARA_DETAIL.LYRICS')}
			</div> : null}
			{kara.subfile && lyrics?.map((ligne, index) => {
				return (
					<React.Fragment key={index}>
						{ligne}
						<br />
					</React.Fragment>
				);
			})}
		</div>) : null;

		const header = (
			<div className={`modal-header img-background${props.scope === 'public' ? ' fixed' : ''}`}
				style={{ ['--img' as any]: props.scope === 'admin' ? `url('${getPreviewLink(kara)}')` : 'none' }}>
				<div className="modal-header-title">
					{props.scope === 'public' ?
						<button
							className="transparent-btn"
							type="button" onClick={props.closeOnPublic}>
							<i className="fas fa-fw fa-arrow-left" />
						</button> : null}
					<div className="modal-title-block">
						<h4 className="modal-title">{getTitleInLocale(context.globalState.settings.data, kara.titles)}</h4>
						<h5 className="modal-series">
							<InlineTag tag={kara.series[0] || kara.singers[0]}
								scope={props.scope}
								changeView={props.changeView}
								tagType={kara.series[0] ? 1 : 2} />
						</h5>
					</div>
					{props.scope === 'admin' ?
						<button
							className="transparent-btn"
							type="button" onClick={closeModalWithContext}>
							<i className="fas fa-fw fa-times" />
						</button> : null}
				</div>
				<div className="tagConteneur">
					{karaTags}
				</div>
			</div>
		);

		let infoKaraTemp;
		if (props.scope === 'admin') {
			infoKaraTemp = (
				<div className="modal modalPage" onClick={onClickOutsideModal}>
					<div className="modal-dialog">
						<div className="modal-content detailsKara">
							{header}
							<div className="detailsKara">
								<div className="centerButtons">
									{makeFavButton}
									{showVideoButton}
									{downloadVideoButton}
								</div>
								{video}
								{details}
								{lyricsKara}
							</div>
						</div>
					</div>
				</div>
			);
		} else {
			infoKaraTemp = (
				<React.Fragment>
					{placeHeader(header)}
					<div className="detailsKara">
						<div className="centerButtons">
							{context.globalState.auth.data.role === 'guest' ? null : makeFavButton}
							{
								kara?.public_plc_id?.length >= 1 ? null : addKaraButton
							}
							{showVideoButton}
						</div>
						{video}
						{details}
						{lyricsKara}
					</div>
				</React.Fragment>
			);
		}
		return infoKaraTemp;
	} else {
		return null;
	}
}