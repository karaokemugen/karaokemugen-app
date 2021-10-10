import './KaraLine.scss';

import i18next from 'i18next';
import { Key, MouseEvent, useContext, useState } from 'react';
import { DraggableProvided } from 'react-beautiful-dnd';
import { toast } from 'react-toastify';

import { DBKaraTag } from '../../../../../src/lib/types/database/kara';
import nanamiSingPng from '../../../assets/nanami-sing.png';
import nanamiSingWebP from '../../../assets/nanami-sing.webp';
import { closeModal, showModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import ProfilePicture from '../../../utils/components/ProfilePicture';
import {
	buildKaraTitle,
	getOppositePlaylistInfo,
	getPlaylistInfo,
	getTagInLocale,
	getTitleInLocale,
	sortTagByPriority,
} from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';
import {
	displayMessage,
	is_touch_device,
	isNonStandardPlaylist,
	nonStandardPlaylists,
	secondsTimeSpanToHMS,
} from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import KaraMenuModal from '../modals/KaraMenuModal';
import ActionsButtons from './ActionsButtons';

const DragHandle = ({ dragHandleProps }) => (
	<span {...dragHandleProps} className="dragHandle">
		<i className="fas fa-ellipsis-v" />
	</span>
);

interface IProps {
	kara: KaraElement;
	side: 'left' | 'right';
	scope: 'admin' | 'public';
	i18nTag: { [key: string]: { [key: string]: string } };
	avatar_file: string;
	indexInPL: number;
	checkKara: (id: number | string) => void;
	deleteCriteria: (kara: KaraElement) => void;
	jingle: boolean;
	sponsor: boolean;
	key: Key;
	toggleKaraDetail: (kara: KaraElement, plaid: string) => void;
	sortable: boolean;
	draggable: DraggableProvided;
}

function KaraLine(props: IProps) {
	const context = useContext(GlobalContext);
	const [karaMenu, setKaraMenu] = useState(false);

	const upvoteKara = () => {
		const plc_id = props.kara.plcid ? props.kara.plcid : props.kara.public_plc_id[0];
		const data = props.kara.flag_upvoted ? { downvote: 'true', plc_id: plc_id } : { plc_id: plc_id };
		commandBackend('votePLC', data).catch(() => {});
	};

	const refuseKara = () => {
		commandBackend('editPLC', {
			flag_refused: !props.kara.flag_refused,
			plc_ids: [props.kara.plcid],
		}).catch(() => {});
	};

	const acceptKara = () => {
		commandBackend('editPLC', {
			flag_accepted: !props.kara.flag_accepted,
			plc_ids: [props.kara.plcid],
		}).catch(() => {});
	};

	const deleteKara = async () => {
		if (getPlaylistInfo(props.side, context).flag_smart) {
			props.deleteCriteria(props.kara);
		} else {
			await commandBackend('deleteKaraFromPlaylist', {
				plc_ids: props.kara?.plcid ? [props.kara.plcid] : props.kara.my_public_plc_id,
			}).catch(() => {});
			if (!props.kara?.plcid) {
				toast.dismiss(props.kara.my_public_plc_id[0]);
			}
		}
	};

	const deleteFavorite = () => {
		if (context.globalState.auth.data.onlineAvailable !== false) {
			commandBackend('deleteFavorites', {
				kids: [props.kara.kid],
			}).catch(() => {});
		} else {
			displayMessage('warning', i18next.t('ERROR_CODES.FAVORITES_ONLINE_NOINTERNET'), 5000);
			return;
		}
	};

	const playKara = () => {
		commandBackend('playKara', {
			kid: props.kara.kid,
		}).catch(() => {});
	};

	const editPlayingFlag = () => {
		commandBackend('editPLC', {
			flag_playing: true,
			plc_ids: [props.kara.plcid],
		}).catch(() => {});
	};

	const addKara = async (_event?: any, pos?: number) => {
		let url = '';
		let data;
		if (getOppositePlaylistInfo(props.side, context).plaid === nonStandardPlaylists.favorites) {
			if (context.globalState.auth.data.onlineAvailable !== false) {
				url = 'addFavorites';
				data = {
					kids: [props.kara.kid],
				};
			} else {
				displayMessage('warning', i18next.t('ERROR_CODES.FAVORITES_ONLINE_NOINTERNET'), 5000);
				return;
			}
		} else if (props.scope === 'admin') {
			if (!getOppositePlaylistInfo(props.side, context).flag_smart) {
				if (!isNonStandardPlaylist(getPlaylistInfo(props.side, context).plaid) && !pos) {
					url = 'copyKaraToPlaylist';
					data = {
						plaid: getOppositePlaylistInfo(props.side, context).plaid,
						plc_ids: [props.kara.plcid],
					};
				} else {
					url = 'addKaraToPlaylist';
					if (pos) {
						data = {
							plaid: getOppositePlaylistInfo(props.side, context).plaid,
							requestedby: context.globalState.auth.data.username,
							kids: [props.kara.kid],
							pos: pos,
						};
					} else {
						data = {
							plaid: getOppositePlaylistInfo(props.side, context).plaid,
							requestedby: context.globalState.auth.data.username,
							kids: [props.kara.kid],
						};
					}
				}
			} else {
				url = 'addCriterias';
				data = {
					criterias: [
						{
							type: 1001,
							value: props.kara.kid,
							plaid: getOppositePlaylistInfo(props.side, context).plaid,
						},
					],
				};
			}
		} else {
			url = 'addKaraToPublicPlaylist';
			data = {
				requestedby: context.globalState.auth.data.username,
				kids: [props.kara.kid],
			};
		}
		const response = await commandBackend(url, data).catch(() => {});
		if (response && response.code && response.data?.plc) {
			let message;
			if (response.data?.plc.time_before_play) {
				const playTime = new Date(Date.now() + response.data.plc.time_before_play * 1000);
				const playTimeDate = playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2);
				const beforePlayTime = secondsTimeSpanToHMS(response.data.plc.time_before_play, 'hm');
				message = (
					<>
						{i18next.t(`SUCCESS_CODES.${response.code}`, {
							song: getTitleInLocale(context.globalState.settings.data, props.kara.titles),
						})}
						<br />
						{i18next.t('KARA_DETAIL.TIME_BEFORE_PLAY', {
							time: beforePlayTime,
							date: playTimeDate,
						})}
					</>
				);
			} else {
				message = (
					<>
						{i18next.t(`SUCCESS_CODES.${response.code}`, {
							song: getTitleInLocale(context.globalState.settings.data, props.kara.titles),
						})}
					</>
				);
			}
			displayMessage(
				'success',
				<div className="toast-with-img">
					<picture>
						<source type="image/webp" srcSet={nanamiSingWebP} />
						<source type="image/png" srcSet={nanamiSingPng} />
						<img src={nanamiSingPng} alt="Nanami is singing!" />
					</picture>
					<span>
						{message}
						<br />
						<button
							className="btn"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								commandBackend('deleteKaraFromPlaylist', { plc_ids: [response.data.plc.plcid] })
									.then(() => {
										toast.dismiss(response.data.plc.plcid);
										displayMessage('success', i18next.t('SUCCESS_CODES.KARA_DELETED'));
									})
									.catch(() => {
										toast.dismiss(response.data.plc.plcid);
									});
							}}
						>
							{i18next.t('CANCEL')}
						</button>
					</span>
				</div>,
				10000,
				'top-left',
				response.data.plc.plcid
			);
		}
	};

	const transferKara = async (event: any, pos?: number) => {
		await addKara(event, pos);
		deleteKara();
	};

	const checkKara = () => {
		if (!isNonStandardPlaylist(getPlaylistInfo(props.side, context).plaid)) {
			props.checkKara(props.kara.plcid);
		} else {
			props.checkKara(props.kara.kid);
		}
	};

	const changeVisibilityKara = () => {
		commandBackend('editPLC', {
			flag_visible: true,
			plc_ids: [props.kara.plcid],
		}).catch(() => {});
	};

	const karaTags = (() => {
		// Tags in the header
		const karaTags: JSX.Element[] = [];
		const data = props.kara;

		if (data.langs && (props.scope === 'public' || is_touch_device())) {
			const isMulti = data.langs.find((e) => e.name.indexOf('mul') > -1);
			isMulti
				? karaTags.push(
					<div key={isMulti.tid} className="tag">
						{getTagInLocale(context?.globalState.settings.data, isMulti)}
					</div>
				  )
				: karaTags.push(
					...data.langs.sort(sortTagByPriority).map((tag, i) => {
						if (i === 0) return undefined;
						return (
							<div
								key={tag.tid}
								className="tag green"
								title={getTagInLocale(context?.globalState.settings.data, tag, props.i18nTag)}
							>
								{getTagInLocale(context?.globalState.settings.data, tag, props.i18nTag)}
							</div>
						);
					})
				  );
		}
		if (data.songtypes && (props.scope === 'public' || is_touch_device())) {
			karaTags.push(
				...data.songtypes.sort(sortTagByPriority).map((tag, i) => {
					if (i === 0) return undefined;
					return (
						<div
							key={tag.tid}
							className="tag green"
							title={getTagInLocale(context?.globalState.settings.data, tag, props.i18nTag)}
						>
							{getTagInLocale(context?.globalState.settings.data, tag, props.i18nTag)}
							{data.songorder > 0 ? ' ' + data.songorder : ''}
						</div>
					);
				})
			);
		}
		for (const type of ['FAMILIES', 'PLATFORMS', 'ORIGINS', 'MISC']) {
			const typeData = tagTypes[type];
			if (data[typeData.karajson]) {
				karaTags.push(
					...data[typeData.karajson].sort(sortTagByPriority).map((tag) => {
						return (
							<div
								key={tag.tid}
								className={`tag ${typeData.color}${tag.problematic ? ' problematicTag' : ''}`}
								title={getTagInLocale(context?.globalState.settings.data, tag, props.i18nTag)}
							>
								{props.scope === 'admin' && !is_touch_device()
									? tag.short
										? tag.short
										: tag.name
									: getTagInLocale(context?.globalState.settings.data, tag, props.i18nTag)}
							</div>
						);
					})
				);
			}
		}
		return karaTags.filter((el) => !!el);
	})();

	const isProblematic = () => {
		const problematic: DBKaraTag[] = [];
		for (const tagType of Object.keys(tagTypes)) {
			if ((props.kara[tagType.toLowerCase()] as unknown as DBKaraTag[])?.length > 0) {
				problematic.push(...props.kara[tagType.toLowerCase()].filter((t: DBKaraTag) => t.problematic));
			}
		}
		return problematic;
	};

	const getSerieOrSingers = (data: KaraElement) => {
		return data.series && data.series.length > 0
			? data.series.map((e) => getTagInLocale(context?.globalState.settings.data, e, props.i18nTag)).join(', ')
			: data.singers.map((e) => getTagInLocale(context?.globalState.settings.data, e, props.i18nTag)).join(', ');
	};

	const openKaraMenu = (event: MouseEvent) => {
		document.getElementById('root').click();
		if (event?.currentTarget) {
			const element = (event.currentTarget as Element).getBoundingClientRect();
			showModal(
				context.globalDispatch,
				<KaraMenuModal
					kara={props.kara}
					side={props.side}
					topKaraMenu={element.bottom}
					leftKaraMenu={element.left}
					transferKara={transferKara}
					closeKaraMenu={closeKaraMenu}
				/>
			);
			setKaraMenu(true);
		}
	};

	const closeKaraMenu = () => {
		closeModal(context.globalDispatch);
		setKaraMenu(false);
	};

	const downloadIcon = () => {
		// Tags in the header
		const data = props.kara;

		if (data.download_status === 'MISSING' && props.scope === 'admin') {
			return <i className="fas fa-fw fa-cloud" title={i18next.t('KARA.MISSING_DOWNLOAD_TOOLTIP')} />;
		} else if (data.download_status === 'DOWNLOADING' && props.scope === 'admin') {
			return (
				<i className="fas fa-fw fa-cloud-download-alt" title={i18next.t('KARA.IN_PROGRESS_DOWNLOAD_TOOLTIP')} />
			);
		}
		return null;
	};

	const problematic = isProblematic();
	const karaTitle = buildKaraTitle(context.globalState.settings.data, props.kara, false, props.i18nTag);
	const karaSerieOrSingers = getSerieOrSingers(props.kara);
	const kara = props.kara;
	const scope = props.scope;
	const plaid = getPlaylistInfo(props.side, context).plaid;
	const shouldShowProfile =
		context.globalState.settings.data.config.Frontend?.ShowAvatarsOnPlaylist && props.avatar_file;
	return (
		<div {...props.draggable.draggableProps} ref={props.draggable.innerRef}>
			<div
				className={`list-group-item${kara.flag_playing ? ' currentlyplaying' : ''}${
					kara.flag_dejavu ? ' dejavu' : ''
				}
				${props.indexInPL % 2 === 0 ? ' list-group-item-even' : ''} ${
			(props.jingle || props.sponsor) && scope === 'admin' ? ' marker' : ''
		}
				${props.sponsor && scope === 'admin' ? ' green' : ''}${props.side === 'right' ? ' side-right' : ''}`}
			>
				{scope === 'public' &&
				kara.username !== context.globalState.auth.data.username &&
				kara.flag_visible === false ? (
						<div className="contentDiv">
							<div>
								{
									(context.globalState.settings.data.config.Playlist.MysterySongs.Labels as string[])[
										props.kara.pos %
										(
											context.globalState.settings.data.config.Playlist.MysterySongs
												.Labels as string[]
										).length |
										0
									]
								}
							</div>
						</div>
					) : (
						<>
							<div className="infoDiv">
								{scope === 'admin' &&
							(isNonStandardPlaylist(plaid) ||
								(getPlaylistInfo(props.side, context)?.flag_public &&
									!getPlaylistInfo(props.side, context)?.flag_current)) ? (
										<button
											title={i18next.t('KARA_MENU.PLAY_LIBRARY')}
											className="btn btn-action playKara karaLineButton"
											onClick={playKara}
										>
											<i className="fas fa-play" />
										</button>
									) : null}
								{scope === 'admin' &&
							!isNonStandardPlaylist(plaid) &&
							!(
								getPlaylistInfo(props.side, context)?.flag_public &&
								!getPlaylistInfo(props.side, context)?.flag_current
							) ? (
										<button
											title={i18next.t('KARA_MENU.PLAY')}
											className="btn btn-action playKara karaLineButton"
											onClick={editPlayingFlag}
										>
											<i className="fas fa-play-circle" />
										</button>
									) : null}
								{scope === 'admin' && !isNonStandardPlaylist(plaid) && !kara.flag_visible ? (
									<button
										type="button"
										className={'btn btn-action btn-primary'}
										onClick={changeVisibilityKara}
									>
										<i className="fas fa-eye-slash"></i>
									</button>
								) : null}
							</div>
							{is_touch_device() || props.scope === 'public' ? (
								<div
									className="contentDiv contentDivMobile"
									onClick={() => props.toggleKaraDetail(kara, plaid)}
									tabIndex={1}
								>
									<div className="contentDivMobileTitle">
										<span
											className="tag inline green"
											title={getTagInLocale(
												context?.globalState.settings.data,
												kara.langs[0],
												props.i18nTag
											)}
										>
											{kara.langs[0].short?.toUpperCase() || kara.langs[0].name.toUpperCase()}
										</span>
										{kara.flag_dejavu && !kara.flag_playing ? (
											<i
												className="fas fa-fw fa-history dejavu-icon"
												title={i18next.t('KARA.DEJAVU_TOOLTIP')}
											/>
										) : null}
										{getTitleInLocale(context.globalState.settings.data, kara.titles)}
										{downloadIcon()}
										{problematic.length > 0 ? (
											<i
												className="fas fa-fw fa-exclamation-triangle problematic"
												title={i18next.t('KARA.PROBLEMATIC_TOOLTIP', {
													tags: problematic
														.map((t) =>
															getTagInLocale(
																context?.globalState.settings.data,
																t,
																props.i18nTag
															)
														)
														.join(', '),
												})}
											/>
										) : null}
									</div>
									<div className="contentDivMobileSerie">
										<span
											className="tag inline green"
											title={getTagInLocale(
												context?.globalState.settings.data,
												kara.songtypes[0],
												props.i18nTag
											)}
										>
											{kara.songtypes[0].short?.toUpperCase() || kara.songtypes[0].name}{' '}
											{kara.songorder}
										</span>
										{karaSerieOrSingers}
									</div>
									{kara.upvotes && props.scope === 'admin' ? (
										<div className="upvoteCount">
											<i className="fas fa-thumbs-up" />
											{kara.upvotes}
										</div>
									) : null}
									{!is_touch_device() ? (
										<div className="tagConteneur">
											{karaTags}
											{kara.versions?.sort(sortTagByPriority).map((t) => (
												<span className="tag white" key={t.tid}>
													{getTagInLocale(context?.globalState.settings.data, t, props.i18nTag)}
												</span>
											))}
										</div>
									) : null}
								</div>
							) : (
								<div
									className="contentDiv"
									onClick={() => props.toggleKaraDetail(kara, plaid)}
									tabIndex={1}
								>
									<div className="disable-select karaTitle">
										{kara.flag_dejavu && !kara.flag_playing ? (
											<i
												className="fas fa-fw fa-history dejavu-icon"
												title={i18next.t('KARA.DEJAVU_TOOLTIP')}
											/>
										) : null}
										{karaTitle}
										{downloadIcon()}
										{problematic.length > 0 ? (
											<i
												className="fas fa-fw fa-exclamation-triangle problematic"
												title={i18next.t('KARA.PROBLEMATIC_TOOLTIP', {
													tags: problematic
														.map((t) =>
															getTagInLocale(
																context?.globalState.settings.data,
																t,
																props.i18nTag
															)
														)
														.join(', '),
												})}
											/>
										) : null}
										{kara.upvotes && props.scope === 'admin' ? (
											<div className="upvoteCount" title={i18next.t('KARA_DETAIL.UPVOTE_NUMBER')}>
												<i className="fas fa-thumbs-up" />
												{kara.upvotes}
											</div>
										) : null}
										<div className="tagConteneur">{karaTags}</div>
									</div>
								</div>
							)}
							{scope === 'admin' ? (
								<span className="checkboxKara" onClick={checkKara}>
									{kara.checked ? (
										<i className="far fa-check-square"></i>
									) : (
										<i className="far fa-square"></i>
									)}
								</span>
							) : null}
							<div className="actionDiv">
								{!is_touch_device() && shouldShowProfile ? (
									<ProfilePicture
										className={`img-circle${is_touch_device() ? ' mobile' : ''}`}
										alt="User Pic"
										user={{
											login: props.kara.username,
											avatar_file: props.avatar_file,
											nickname: props.kara.nickname,
											type: props.kara.user_type,
										}}
									/>
								) : null}
								<div className="btn-group">
									{props.scope === 'admin' ||
								context?.globalState.settings.data?.config?.Frontend?.Mode === 2 ? (
											<ActionsButtons
												side={props.side}
												scope={props.scope}
												kara={kara}
												addKara={addKara}
												deleteKara={deleteKara}
												deleteFavorite={deleteFavorite}
												upvoteKara={upvoteKara}
												refuseKara={refuseKara}
												acceptKara={acceptKara}
											/>
										) : null}
									{scope === 'admin' ? (
										<button
											title={i18next.t('KARA_MENU.KARA_COMMANDS')}
											onClick={(event) => {
												karaMenu ? closeKaraMenu() : openKaraMenu(event);
											}}
											className={
												'btn showPlaylistCommands karaLineButton' + (karaMenu ? ' btn-primary' : '')
											}
										>
											<i className="fas fa-wrench" />
										</button>
									) : null}
								</div>
								{props.sortable ? <DragHandle dragHandleProps={props.draggable.dragHandleProps} /> : null}
							</div>
							{is_touch_device() ? (
								<div className="tagConteneur mobile">
									{karaTags}
									{kara.versions?.sort(sortTagByPriority).map((t) => (
										<span className="tag white" key={t.tid}>
											{getTagInLocale(context?.globalState.settings.data, t, props.i18nTag)}
										</span>
									))}
									{!(is_touch_device() && scope === 'admin') && shouldShowProfile ? (
										<div className="img-container">
											<ProfilePicture
												className={`img-circle${is_touch_device() ? ' mobile' : ''}`}
												alt="User Pic"
												user={{
													login: props.kara.username,
													avatar_file: props.avatar_file,
													nickname: props.kara.username,
												}}
											/>
										</div>
									) : null}
								</div>
							) : null}
						</>
					)}
			</div>
			{props.sponsor && props.jingle && scope === 'admin' ? (
				<div className="marker-label green">{i18next.t('KARA_DETAIL.JINGLE_SPONSOR')}</div>
			) : props.jingle && scope === 'admin' ? (
				<div className="marker-label">{i18next.t('KARA_DETAIL.JINGLE')}</div>
			) : props.sponsor && scope === 'admin' ? (
				<div className="marker-label green">{i18next.t('KARA_DETAIL.SPONSOR')}</div>
			) : (
				''
			)}
		</div>
	);
}

export default KaraLine;
