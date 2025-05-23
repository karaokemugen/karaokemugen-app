import './KaraLine.scss';

import i18next from 'i18next';
import { Key, MouseEvent, useContext, useState } from 'react';
import { DraggableProvided } from 'react-beautiful-dnd';
import { toast } from 'react-toastify';

import { closeModal, showModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import ProfilePicture from '../../../utils/components/ProfilePicture';
import {
	buildKaraTitle,
	getOppositePlaylistInfo,
	getPlaylistInfo,
	getSerieOrSingerGroupsOrSingers,
	getTagInLocale,
	getTitleInLocale,
	sortAndHideTags,
} from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';
import {
	displayMessage,
	is_touch_device,
	isNonStandardPlaylist,
	nonStandardPlaylists,
	PLCCallback,
	secondsTimeSpanToHMS,
} from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import KaraMenuModal from '../modals/KaraMenuModal';
import ActionsButtons from './ActionsButtons';
import dayjs from 'dayjs';
import { WS_CMD } from '../../../utils/ws';
import { DBPLCInfo } from '../../../../../src/types/database/playlist';
import { WSCmdDefinition } from '../../../../../src/lib/types/frontend';

const DragHandle = ({ dragHandleProps }: { dragHandleProps: object }) => (
	<span {...dragHandleProps} className="dragHandle">
		<i className="fas fa-ellipsis-v" />
	</span>
);

interface IProps {
	kara: KaraElement;
	side: 'left' | 'right';
	scope: 'admin' | 'public';
	i18nTag: Record<string, string>;
	avatar_file: string;
	indexInPL: number;
	checkKara: (id: number | string) => void;
	deleteCriteria: (kara: KaraElement) => void;
	jingle: boolean;
	sponsor: boolean;
	key: Key;
	openKara: (kara: KaraElement) => void;
	sortable: boolean;
	draggable: DraggableProvided;
	playingIn?: boolean;
	plcidToSwap?: number;
	swapPLCs?: (plcid: number) => void;
}

function KaraLine(props: IProps) {
	const context = useContext(GlobalContext);
	const authData = context.globalState.auth.data;
	const settings = context.globalState.settings.data;
	const kara = props.kara;
	const [karaMenu, setKaraMenu] = useState(false);
	const isAdmin = props.scope === 'admin';

	const upvoteKara = () => {
		const plc_id = kara.plcid ? kara.plcid : kara.public_plc_id[0];
		const data = kara.flag_upvoted ? { downvote: true, plc_id: plc_id } : { plc_id: plc_id };
		commandBackend(WS_CMD.VOTE_PLC, data).catch(() => {});
	};

	const refuseKara = () => {
		commandBackend(WS_CMD.EDIT_PLC, {
			flag_refused: !kara.flag_refused,
			plc_ids: [kara.plcid],
		}).catch(() => {});
	};

	const acceptKara = () => {
		commandBackend(WS_CMD.EDIT_PLC, {
			flag_accepted: !kara.flag_accepted,
			plc_ids: [kara.plcid],
		}).catch(() => {});
	};

	const deleteKara = async () => {
		if (getPlaylistInfo(props.side, context).flag_smart) {
			if (kara) props.deleteCriteria(kara);
		} else {
			await commandBackend(WS_CMD.DELETE_KARA_FROM_PLAYLIST, {
				plc_ids: kara?.plcid ? [kara.plcid] : kara.my_public_plc_id,
			}).catch(() => {});
			if (!kara?.plcid) {
				toast.dismiss(kara.my_public_plc_id[0]);
			}
		}
	};

	const deleteFavorite = () => {
		if (authData.onlineAvailable !== false) {
			commandBackend(WS_CMD.DELETE_FAVORITES, {
				kids: [kara.kid],
			}).catch(() => {});
		} else {
			displayMessage('warning', i18next.t('ERROR_CODES.FAVORITES_ONLINE_NOINTERNET'), 5000);
			return;
		}
	};

	const playKara = () => {
		commandBackend(WS_CMD.PLAY_KARA, {
			kid: kara.kid,
		}).catch(() => {});
	};

	const editPlayingFlag = () => {
		commandBackend(WS_CMD.EDIT_PLC, {
			flag_playing: true,
			plc_ids: [kara.plcid],
		}).catch(() => {});
	};

	const addKara = async (_, pos?: number) => {
		let url: WSCmdDefinition<object, { plc: DBPLCInfo } | void>;
		let data;
		const oppositePlaylist = getOppositePlaylistInfo(props.side, context);
		if (oppositePlaylist?.plaid === nonStandardPlaylists.favorites) {
			if (authData.onlineAvailable !== false) {
				url = WS_CMD.ADD_FAVORITES;
				data = {
					kids: [kara.kid],
				};
			} else {
				displayMessage('warning', i18next.t('ERROR_CODES.FAVORITES_ONLINE_NOINTERNET'), 5000);
				return;
			}
		} else if (isAdmin) {
			if (oppositePlaylist && !oppositePlaylist.flag_smart) {
				if (!isNonStandardPlaylist(getPlaylistInfo(props.side, context).plaid) && !pos) {
					url = WS_CMD.COPY_KARA_TO_PLAYLIST;
					data = {
						plaid: oppositePlaylist.plaid,
						plc_ids: [kara.plcid],
					};
				} else {
					url = WS_CMD.ADD_KARA_TO_PLAYLIST;
					if (pos) {
						data = {
							plaid: oppositePlaylist.plaid,
							requestedby: authData.username,
							kids: [kara.kid],
							pos: pos,
						};
					} else {
						data = {
							plaid: oppositePlaylist.plaid,
							requestedby: authData.username,
							kids: [kara.kid],
						};
					}
				}
			} else {
				url = WS_CMD.ADD_CRITERIAS;
				data = {
					criterias: [
						{
							type: 1001,
							value: kara.kid,
							plaid: oppositePlaylist.plaid,
						},
					],
				};
			}
		} else {
			url = WS_CMD.ADD_KARA_TO_PUBLIC_PLAYLIST;
			data = {
				requestedby: authData.username,
				kids: [kara.kid],
			};
		}
		try {
			const response = await commandBackend(url, data);
			PLCCallback(response, context, kara, props.scope);
		} catch (e: any) {
			throw new Error(e?.message?.code ? e?.message?.code : e?.message);
		}
	};

	const transferKara = async (_, pos?: number) => {
		try {
			await addKara(_, pos);
			deleteKara();
		} catch (_) {
			// already display
		}
	};

	const checkKara = () => {
		if (!isNonStandardPlaylist(getPlaylistInfo(props.side, context).plaid)) {
			props.checkKara(kara.plcid);
		} else {
			props.checkKara(kara.kid);
		}
	};

	const changeVisibilityKara = () => {
		commandBackend(WS_CMD.EDIT_PLC, {
			flag_visible: true,
			plc_ids: [kara.plcid],
		}).catch(() => {});
	};

	const karaTags = (() => {
		// Tags in the header
		const karaTags: JSX.Element[] = [];

		for (const type of ['FAMILIES', 'ORIGINS', 'MISC', 'WARNINGS']) {
			const typeData = tagTypes[type];
			if (kara[typeData.karajson]) {
				karaTags.push(
					...sortAndHideTags(kara[typeData.karajson], props.scope).map(tag => {
						return (
							<div
								key={tag.tid}
								className={`tag ${typeData.color}${type === 'WARNINGS' ? ' problematicTag' : ''}`}
								title={getTagInLocale(settings, tag, props.i18nTag).i18n}
							>
								{isAdmin && !is_touch_device()
									? tag.short
										? tag.short
										: tag.name
									: getTagInLocale(settings, tag, props.i18nTag).i18n}
							</div>
						);
					})
				);
			}
		}
		return karaTags.filter(el => !!el);
	})();

	const openKaraMenu = (event: MouseEvent) => {
		document.getElementById('root').click();
		if (event?.currentTarget) {
			const element = (event.currentTarget as Element).getBoundingClientRect();
			showModal(
				context.globalDispatch,
				<KaraMenuModal
					kara={kara}
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
		if (kara.download_status === 'MISSING' && isAdmin) {
			return <i className="fas fa-fw fa-cloud" title={i18next.t('KARA.MISSING_DOWNLOAD_TOOLTIP')} />;
		} else if (kara.download_status === 'DOWNLOADING' && isAdmin) {
			return (
				<i className="fas fa-fw fa-cloud-download-alt" title={i18next.t('KARA.IN_PROGRESS_DOWNLOAD_TOOLTIP')} />
			);
		}
		return null;
	};

	const karaTitle = buildKaraTitle(settings, kara, false, props.i18nTag);
	const karaSerieOrSingerGroupsOrSingers = getSerieOrSingerGroupsOrSingers(settings, kara, props.i18nTag);
	const plaid = getPlaylistInfo(props.side, context).plaid;
	const shouldShowProfile = settings.config.Frontend?.ShowAvatarsOnPlaylist && props.avatar_file;
	return (
		<div {...props.draggable.draggableProps} ref={props.draggable.innerRef}>
			<div
				className={`list-group-item${kara.flag_playing ? ' currentlyplaying' : ''}${
					kara.flag_dejavu ? ' dejavu' : ''
				}
				${props.indexInPL % 2 === 0 ? ' list-group-item-even' : ''} ${
					(props.jingle || props.sponsor) && isAdmin ? ' marker' : ''
				}
				${props.sponsor && isAdmin ? ' green' : ''}${props.side === 'right' ? ' side-right' : ''}`}
			>
				{!isAdmin && kara.username !== authData.username && kara.flag_visible === false ? (
					<div className="contentDiv">
						<div>
							{
								(settings.config.Playlist.MysterySongs.Labels as string[])[
									kara.pos % (settings.config.Playlist.MysterySongs.Labels as string[]).length | 0
								]
							}
						</div>
					</div>
				) : (
					<>
						<div className="infoDiv">
							{isAdmin &&
							(isNonStandardPlaylist(plaid) ||
								(getPlaylistInfo(props.side, context)?.flag_public &&
									!getPlaylistInfo(props.side, context)?.flag_current)) ? (
								<button
									title={i18next.t('KARA_MENU.PLAY_LIBRARY')}
									className="btn btn-action playKara karaLineButton"
									onClick={playKara}
									disabled={settings.state.quiz.running}
								>
									<i className="fas fa-fw fa-play" />
								</button>
							) : null}
							{isAdmin &&
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
									<i className="fas fa-fw fa-play-circle" />
								</button>
							) : null}
							{isAdmin && !isNonStandardPlaylist(plaid) && !kara.flag_visible ? (
								<button
									type="button"
									className={'btn btn-action btn-primary'}
									onClick={changeVisibilityKara}
								>
									<i className="fas fa-eye-slash"></i>
								</button>
							) : null}
						</div>
						{context.globalState.settings.data.config.Playlist.AllowPublicCurrentPlaylistItemSwap &&
						props.swapPLCs ? (
							<button
								title={i18next.t('KARA.SWAP_TOOLTIP')}
								className={`btn btn-action karaLineButton swapButton ${props.plcidToSwap === kara.plcid ? 'btn-danger' : ''}`}
								onClick={() => props.swapPLCs(kara.plcid)}
							>
								{props.plcidToSwap ? (
									props.plcidToSwap === kara.plcid ? (
										<i className="fas fa-fw fa-xmark" />
									) : (
										<i className="fas fa-fw fa-arrows-turn-right" />
									)
								) : (
									<i className="fas fa-fw fa-retweet" />
								)}
							</button>
						) : null}
						{is_touch_device() || !isAdmin ? (
							<div
								className="contentDiv contentDivMobile"
								onClick={() => props.openKara(kara)}
								tabIndex={1}
							>
								<div className="contentDivMobileTitle">
									<span
										className={`tag inline green ${!isAdmin && kara.children?.length > 0 && settings.user.flag_parentsonly ? 'empty' : undefined}`}
										title={
											!kara.langs ||
											kara.langs.length === 0 ||
											(!isAdmin && kara.children?.length > 0 && settings.user.flag_parentsonly)
												? ''
												: getTagInLocale(settings, kara.langs[0], props.i18nTag).i18n
										}
									>
										{!kara.langs ||
										kara.langs.length === 0 ||
										(!isAdmin && kara.children?.length > 0 && settings.user.flag_parentsonly)
											? ''
											: kara.langs[0].short?.toUpperCase() || kara.langs[0].name.toUpperCase()}
									</span>
									{kara.flag_dejavu && !kara.flag_playing ? (
										<i
											className="fas fa-fw fa-history dejavu-icon"
											title={i18next.t('KARA.DEJAVU_TOOLTIP')}
										/>
									) : null}
									{getTitleInLocale(settings, kara.titles, kara.titles_default_language)}
									{downloadIcon()}
									{kara.warnings?.length > 0 ? (
										<i
											className="fas fa-fw fa-exclamation-triangle problematic"
											title={i18next.t('KARA.PROBLEMATIC_TOOLTIP', {
												tags: kara.warnings
													.map(t => getTagInLocale(settings, t, props.i18nTag).i18n)
													.join(', '),
											})}
										/>
									) : null}
								</div>
								<div className="contentDivMobileSerie">
									<span
										className="tag inline green"
										title={
											kara.songtypes?.length > 0 &&
											getTagInLocale(settings, kara.songtypes[0], props.i18nTag).i18n
										}
									>
										{kara.songtypes?.length > 0 &&
											(kara.songtypes[0].short?.toUpperCase() || kara.songtypes[0].name)}{' '}
										{kara.songorder}
									</span>
									{karaSerieOrSingerGroupsOrSingers}
								</div>
								{kara.upvotes && isAdmin ? (
									<div className="upvoteCount">
										<i className="fas fa-thumbs-up" />
										{kara.upvotes}
									</div>
								) : null}{' '}
								<div className="contentDivMobileTags">
									<div>
										{kara.children?.length > 0 &&
										settings.user.flag_parentsonly &&
										plaid !== nonStandardPlaylists.favorites &&
										!isAdmin ? (
											<>
												<i className="far fa-fixed-width fa-list-alt" />
												&nbsp;
												{i18next.t('KARA.VERSION_AVAILABILITY', {
													count: kara.children.length + 1,
												})}
											</>
										) : (
											<div className="playingIn">
												<div>
													<i className="fas fa-fw fa-clock" />
													{secondsTimeSpanToHMS(kara.duration, 'mm:ss')}
												</div>
												{props.playingIn && kara.playing_at ? (
													<div>
														{i18next.t('KARA_DETAIL.PLAYING_IN', {
															time: dayjs(kara.playing_at).fromNow(true),
															date: dayjs(kara.playing_at).format('LT'),
														})}
													</div>
												) : null}
											</div>
										)}
									</div>
									<div className="tagConteneur">
										{karaTags}
										{sortAndHideTags(kara.versions, props.scope).map(t => (
											<span className="tag white" key={t.tid}>
												{getTagInLocale(settings, t, props.i18nTag).i18n}
											</span>
										))}
									</div>
								</div>
							</div>
						) : (
							<div className="contentDiv" onClick={() => props.openKara(kara)} tabIndex={1}>
								<div className="disable-select karaTitle">
									{kara.flag_dejavu && !kara.flag_playing ? (
										<i
											className="fas fa-fw fa-history dejavu-icon"
											title={i18next.t('KARA.DEJAVU_TOOLTIP')}
										/>
									) : null}
									{karaTitle}
									{downloadIcon()}
									{kara.warnings?.length > 0 ? (
										<i
											className="fas fa-fw fa-exclamation-triangle problematic"
											title={i18next.t('KARA.PROBLEMATIC_TOOLTIP', {
												tags: kara.warnings
													.map(t => getTagInLocale(settings, t, props.i18nTag).i18n)
													.join(', '),
											})}
										/>
									) : null}
									{kara.upvotes ? (
										<div className="upvoteCount" title={i18next.t('KARA_DETAIL.UPVOTE_NUMBER')}>
											<i className="fas fa-thumbs-up" />
											{kara.upvotes}
										</div>
									) : null}
									<div className="tagConteneur">{karaTags}</div>
									<div>
										<div className="playingIn">
											<div>
												<i className="fas fa-fw fa-clock" />
												{secondsTimeSpanToHMS(kara.duration, 'mm:ss')}
											</div>
											{kara.playing_at ? (
												<div>({dayjs(kara.playing_at).format('LT')})</div>
											) : null}
										</div>
									</div>
								</div>
							</div>
						)}
						{isAdmin ? (
							<span className="checkboxKara" onClick={checkKara}>
								{kara.checked ? (
									<i className="far fa-check-square"></i>
								) : (
									<i className="far fa-square"></i>
								)}
							</span>
						) : null}
						<div className={`actionDiv${!isAdmin ? ' vertical' : ''}`}>
							{!is_touch_device() && shouldShowProfile ? (
								<ProfilePicture
									className={`img-circle${is_touch_device() ? ' mobile' : ''}`}
									alt="User Pic"
									user={{
										login: kara.username,
										avatar_file: props.avatar_file,
										nickname: kara.nickname,
										type: kara.user_type,
									}}
								/>
							) : null}
							<div className="btn-group">
								{isAdmin || settings?.config?.Frontend?.Mode === 2 ? (
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
								{isAdmin ? (
									<button
										title={i18next.t('KARA_MENU.KARA_COMMANDS')}
										onClick={event => {
											if (karaMenu) {
												closeKaraMenu();
											} else {
												openKaraMenu(event);
											}
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
					</>
				)}
			</div>
			{props.sponsor && props.jingle && isAdmin ? (
				<div className="marker-label green">{i18next.t('KARA_DETAIL.JINGLE_SPONSOR')}</div>
			) : props.jingle && isAdmin ? (
				<div className="marker-label">{i18next.t('KARA_DETAIL.JINGLE')}</div>
			) : props.sponsor && isAdmin ? (
				<div className="marker-label green">{i18next.t('KARA_DETAIL.SPONSOR')}</div>
			) : (
				''
			)}
		</div>
	);
}

export default KaraLine;
