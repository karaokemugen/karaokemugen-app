import './KaraMenuModal.scss';

import i18next from 'i18next';
import React, { Component } from 'react';

import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import {is_touch_device, isNonStandardPlaylist, nonStandardPlaylists} from '../../../utils/tools';
import { KaraElement } from '../../types/kara';

interface IProps {
	kara: KaraElement;
	plaid: string;
	plaidTo: string;
	publicOuCurrent?: boolean | undefined;
	topKaraMenu: number;
	leftKaraMenu: number;
	closeKaraMenu: () => void;
	transferKara: (event: any, pos?: number) => void;
}

interface IState {
	kara?: KaraElement;
	effect_favorite: boolean,
	effect_blacklist: boolean,
	effect_whitelist: boolean,
	effect_free: boolean,
	effect_visibility: boolean
}

class KaraMenuModal extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			kara: this.props.kara,
			effect_favorite: false,
			effect_blacklist: false,
			effect_whitelist: false,
			effect_free: false,
			effect_visibility: false
		};
		this.getKaraDetail();
	}

	getKaraDetail = async () => {
		try {
			let url;
			let data;
			if (this.props.plaid && isNonStandardPlaylist(this.props.plaid)) {
				url = 'getKara';
				data = { kid: this.props.kara.kid };
			} else {
				url = 'getPLC';
				data = {
					plaid: this.props.plaid,
					plc_id: this.props.kara.plcid
				};
			}
			const response = await commandBackend(url, data);
			this.setState({ kara: response });
			document.getElementById('root').addEventListener('click', this.handleClick);
		} catch (err) {
			this.props.closeKaraMenu();
		}
	};

	onRightClickTransfer = (e: any) => {
		e.preventDefault();
		e.stopPropagation();
		this.props.transferKara(e, -1);
		this.props.closeKaraMenu();
	};

	freeKara = () => {
		try {
			commandBackend('editPLC', {
				plc_ids: [this.state.kara?.plcid],
				flag_free: true
			});
			this.setState({ effect_free: true });
			setTimeout(this.props.closeKaraMenu, 350);
		} catch (e) {
			// already display
		}
	};


	changeVisibilityKara = () => {
		try {
			commandBackend('editPLC', {
				plc_ids: [this.state.kara?.plcid],
				flag_visible: !this.state.kara?.flag_visible
			});
			this.setState({ effect_visibility: true });
			setTimeout(this.props.closeKaraMenu, 350);
		} catch (e) {
			// already display
		}
	};

	makeFavorite = () => {
		this.state.kara?.flag_favorites ?
			commandBackend('deleteFavorites', {
				kids: [this.state.kara?.kid]
			}) :
			commandBackend('addFavorites', {
				kids: [this.state.kara?.kid]
			});
		this.setState({ effect_favorite: true });
		setTimeout(this.props.closeKaraMenu, 350);
	};

	addToBlacklist = () => {
		commandBackend('addCriterias', {
			criterias: [{
				type: 1001,
				value: this.state.kara?.kid,
				plaid: this.context.globalState.settings.data.state.blacklistPlaid
			}]
		});
		this.setState({ effect_blacklist: true });
		setTimeout(this.props.closeKaraMenu, 350);
	}

	addToWhitelist = () => {
		commandBackend('addCriterias', {
			criterias: [{
				type: 1001,
				value: this.state.kara?.kid,
				plaid: this.context.globalState.settings.data.state.whitelistPlaid
			}]
		});
		this.setState({ effect_whitelist: true });
		setTimeout(this.props.closeKaraMenu, 350);
	}

	handleClick = (e: MouseEvent) => {
		if (!(e.target as Element).closest('#modal') && !(e.target as Element).closest('.karaLineButton')) {
			e.preventDefault();
			this.props.closeKaraMenu();
		}
	}

	componentWillUnmount() {
		document.getElementById('root').removeEventListener('click', this.handleClick);
	}

	render() {
		return (
			this.state.kara ?
				<ul
					className="dropdown-menu"
					style={{
						position: 'absolute',
						zIndex: 9998,
						bottom: window.innerHeight < (this.props.topKaraMenu + 250) ? (window.innerHeight - this.props.topKaraMenu) + (is_touch_device() ? 65 : 35) : undefined,
						top: window.innerHeight < (this.props.topKaraMenu + 250) ? undefined : this.props.topKaraMenu,
						left: window.innerWidth < (this.props.leftKaraMenu + 250) ? window.innerWidth - 250 : this.props.leftKaraMenu
					}}>
					{!isNonStandardPlaylist(this.props.plaidTo) && !isNonStandardPlaylist(this.props.plaid) ?
						<li>
							<a href="#" onContextMenu={this.onRightClickTransfer} onClick={(event) => {
								this.props.transferKara(event);
								this.props.closeKaraMenu();
							}}>
								<i className="fas fa-fw fa-exchange-alt" />
								&nbsp;
								{i18next.t('KARA_MENU.TRANSFER_KARA')}
							</a>
						</li> : null
					}
					{!isNonStandardPlaylist(this.props.plaid) && !this.props.kara?.flag_playing ?
						<li>
							<a href="#" onClick={() => {
								try {
									commandBackend('editPLC', {
										pos: -1,
										plc_ids: [this.props.kara.plcid]
									});
									this.props.closeKaraMenu();
								} catch (e) {
									// already display
								}
							}}>
								<i className="fas fa-fw fa-level-up-alt" />
								&nbsp;
								{i18next.t('KARA_MENU.MOVE_KARA')}
							</a>
						</li> : null
					}
					{this.props.plaid !== nonStandardPlaylists.favorites ?
						<li className="animate-button-container">
							<a href="#" onClick={this.makeFavorite}>
								<i className="fas fa-fw fa-star" />
								&nbsp;
								{this.state.kara.flag_favorites ? i18next.t('TOOLTIP_FAV_DEL') : i18next.t('TOOLTIP_FAV')}
							</a>
							<a href="#" className={`animate-button-success${this.state.effect_favorite ? ' activate' : ''}`}>
								<i className="fas fa-fw fa-check-square" />
								&nbsp;
								{this.state.kara.flag_favorites ? i18next.t('KARA_MENU.FAVORITES_REMOVED') : i18next.t('KARA_MENU.FAVORITES_ADDED')}
							</a>
						</li> : null
					}
					{this.props.publicOuCurrent && !this.state.kara.flag_free ?
						<li className="animate-button-container">
							<a href="#" onClick={this.freeKara} title={i18next.t('KARA_MENU.FREE')}>
								<i className="fas fa-fw fa-gift" />
								&nbsp;
								{i18next.t('KARA_MENU.FREE_SHORT')}
							</a>
							<a href="#" className={`animate-button-success${this.state.effect_free ? ' activate' : ''}`}>
								<i className="fas fa-fw fa-check-square" />
								&nbsp;
								{i18next.t('KARA_MENU.FREED')}
							</a>
						</li> : null
					}
					{!isNonStandardPlaylist(this.props.plaid) ?
						<li className="animate-button-container">
							<a href="#" onClick={this.changeVisibilityKara}
								title={this.state.kara.flag_visible ? i18next.t('KARA_MENU.VISIBLE_OFF') : i18next.t('KARA_MENU.VISIBLE_ON')}>
								{this.state.kara.flag_visible ?
									<React.Fragment>
										<i className="fas fa-fw fa-eye-slash" />
										&nbsp;
										{i18next.t('KARA_MENU.VISIBLE_OFF_SHORT')}
									</React.Fragment> :
									<React.Fragment>
										<i className="fas fa-fw fa-eye" />
										&nbsp;
										{i18next.t('KARA_MENU.VISIBLE_ON_SHORT')}
									</React.Fragment>
								}
							</a>
							<a href="#" className={`animate-button-success${this.state.effect_visibility ? ' activate' : ''}`}>
								<i className="fas fa-fw fa-check-square" />
								&nbsp;
								{this.state.kara.flag_visible ? i18next.t('KARA_MENU.HIDDEN') : i18next.t('KARA_MENU.SHOWN')}
							</a>
						</li> : null
					}
					{this.props.plaid !== this.context.globalState.settings.data.state.blacklistPlaid ?
						<li className="animate-button-container">
							<a href="#" onClick={this.addToBlacklist}>
								<i className="fas fa-fw fa-ban" />
								&nbsp;
								{i18next.t('KARA_MENU.ADD_BLACKLIST')}
							</a>
							<a href="#" className={`animate-button-success${this.state.effect_blacklist ? ' activate' : ''}`}>
								<i className="fas fa-fw fa-check-square" />
								&nbsp;
								{i18next.t('KARA_MENU.BLACKLISTED')}
							</a>
						</li> : null
					}
					{this.props.plaid !== this.context.globalState.settings.data.state.whitelistPlaid ?
						<li className="animate-button-container">
							<a href="#" onClick={this.addToWhitelist}>
								<i className="fas fa-fw fa-check-circle" />
								&nbsp;
								{i18next.t('KARA_MENU.ADD_WHITELIST')}
							</a>
							<a href="#" className={`animate-button-success${this.state.effect_whitelist ? ' activate' : ''}`}>
								<i className="fas fa-fw fa-check-square" />
								&nbsp;
								{i18next.t('KARA_MENU.WHITELISTED')}
							</a>
						</li> : null
					}
				</ul> : null
		);
	}
}

export default KaraMenuModal;
