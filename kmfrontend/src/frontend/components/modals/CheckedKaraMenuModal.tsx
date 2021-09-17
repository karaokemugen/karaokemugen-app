import './KaraMenuModal.scss';

import i18next from 'i18next';
import React, { Component } from 'react';

import GlobalContext, { GlobalContextInterface } from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import {displayMessage, is_touch_device, isNonStandardPlaylist, nonStandardPlaylists} from '../../../utils/tools';
import { KaraElement } from '../../types/kara';

interface IProps {
	checkedKaras: KaraElement[]
	plaid: string;
	plaidTo: string;
	publicOuCurrent?: boolean | undefined;
	topKaraMenu: number;
	leftKaraMenu: number;
	closeKaraMenu: () => void;
	transferKara: (event: any, pos?: number) => void;
}

interface IState {
	effect_favorite: boolean,
	effect_blacklist: boolean,
	effect_whitelist: boolean,
	effect_free: boolean,
	effect_visibility: boolean
}

class CheckedKaraMenuModal extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	state = {
		effect_favorite: false,
		effect_blacklist: false,
		effect_whitelist: false,
		effect_free: false,
		effect_visibility: false
	};

	onRightClickTransfer = (e: any) => {
		e.preventDefault();
		e.stopPropagation();
		this.props.transferKara(e, -1);
		this.props.closeKaraMenu();
	};

	freeKara = async () => {
		if (this.props.checkedKaras.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		try {
			await commandBackend('editPLC', {
				plc_ids: this.props.checkedKaras.map(a => a.plcid),
				flag_free: true
			});
			this.setState({ effect_free: true });
			setTimeout(this.props.closeKaraMenu, 350);
		} catch (e) {
			//already display
		}
	};


	changeVisibilityKaraOn = () => {
		try {
			commandBackend('editPLC', {
				plc_ids: this.props.checkedKaras.map(a => a.plcid),
				flag_visible: true
			});
			this.setState({ effect_visibility: true });
			setTimeout(this.props.closeKaraMenu, 350);
		} catch (e) {
			//already display
		}
	};

	changeVisibilityKaraOff = () => {
		try {
			commandBackend('editPLC', {
				plc_ids: this.props.checkedKaras.map(a => a.plcid),
				flag_visible: false
			});
			this.setState({ effect_visibility: true });
			setTimeout(this.props.closeKaraMenu, 350);
		} catch (e) {
			//already display
		}
	};

	makeFavorite = () => {
		try {
			commandBackend('addFavorites', {
				kids: this.props.checkedKaras.map(a => a.kid)
			});
			this.setState({ effect_favorite: true });
			setTimeout(this.props.closeKaraMenu, 350);
		} catch (e) {
			//already display
		}
	}

	addToBlacklist = () => {
		try {
			commandBackend('addCriterias', {
				criterias: this.props.checkedKaras.map(a => {
					return { type: 1001, value: a.kid, plaid: this.props.plaid };
				})
			});
			this.setState({ effect_blacklist: true });
			setTimeout(this.props.closeKaraMenu, 350);
		} catch (e) {
			//already display
		}
	}

	addToWhitelist = () => {
		try {
			commandBackend('addCriterias', {
				criterias: this.props.checkedKaras.map(a => {
					return { type: 1001, value: a.kid, plaid: this.props.plaid };
				})
			});
			this.setState({ effect_whitelist: true });
			setTimeout(this.props.closeKaraMenu, 350);
		} catch (e) {
			//already display
		}
	}

	handleClick = (e: MouseEvent) => {
		if (!(e.target as Element).closest('#modal') && !(e.target as Element).closest('.karaLineButton')) {
			e.preventDefault();
			this.props.closeKaraMenu();
		}
	}

	componentDidMount() {
		document.getElementById('root').addEventListener('click', this.handleClick);
	}

	componentWillUnmount() {
		document.getElementById('root').removeEventListener('click', this.handleClick);
	}

	render() {
		return (
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
							{i18next.t('TOOLTIP_TRANSFER_SELECT_KARA')}
						</a>
					</li> : null
				}
				{this.props.plaid !== nonStandardPlaylists.favorites ?
					<li className="animate-button-container">
						<a href="#" onClick={this.makeFavorite}>
							<i className="fas fa-star" />
							&nbsp;
							{i18next.t('TOOLTIP_FAV')}
						</a>
						<a href="#" className={`animate-button-success${this.state.effect_favorite ? ' activate':''}`}>
							<i className="fas fa-fw fa-check-square" />
							&nbsp;²
							{i18next.t('KARA_MENU.FAVORITES_ADDED')}
						</a>
					</li> : null
				}
				{this.props.publicOuCurrent ?
					<li className="animate-button-container">
						<a href="#" onClick={this.freeKara} title={i18next.t('KARA_MENU.FREE')}>
							<i className="fas fa-gift" />
							&nbsp;
							{i18next.t('KARA_MENU.FREE_SHORT')}
						</a>
						<a href="#" className={`animate-button-success${this.state.effect_free ? ' activate':''}`}>
							<i className="fas fa-fw fa-check-square" />
							&nbsp;
							{i18next.t('KARA_MENU.FREED')}
						</a>
					</li> : null
				}
				{!isNonStandardPlaylist(this.props.plaid) ?
					<li className="animate-button-container">
						<a href="#" onClick={this.changeVisibilityKaraOn}
							title={i18next.t('KARA_MENU.VISIBLE_ON')}>
							<i className="fas fa-eye" />
							&nbsp;
							{i18next.t('KARA_MENU.VISIBLE_ON_SHORT')}
						</a>
						<a href="#" className={`animate-button-success${this.state.effect_visibility ? ' activate':''}`}>
							<i className="fas fa-fw fa-check-square" />
							&nbsp;
							{i18next.t('KARA_MENU.SHOWN')}
						</a>
					</li> : null
				}
				{!isNonStandardPlaylist(this.props.plaid) ?
					<li className="animate-button-container">
						<a href="#" onClick={this.changeVisibilityKaraOff}
							title={i18next.t('KARA_MENU.VISIBLE_OFF')}>
							<i className="fas fa-eye-slash" />
							&nbsp;
							{i18next.t('KARA_MENU.VISIBLE_OFF_SHORT')}
						</a>
						<a href="#" className={`animate-button-success${this.state.effect_visibility ? ' activate':''}`}>
							<i className="fas fa-fw fa-check-square" />
							&nbsp;
							{i18next.t('KARA_MENU.HIDDEN')}
						</a>
					</li> : null
				}
				{this.props.plaid !== this.context.globalState.settings.data.state.blacklistPlaid ?
					<li className="animate-button-container">
						<a href="#" onClick={this.addToBlacklist}>
							<i className="fas fa-ban" />
							&nbsp;
							{i18next.t('KARA_MENU.ADD_BLACKLIST')}
						</a>
						<a href="#" className={`animate-button-success${this.state.effect_blacklist ? ' activate':''}`}>
							<i className="fas fa-fw fa-check-square" />
							&nbsp;
							{i18next.t('KARA_MENU.BLACKLISTED')}
						</a>
					</li> : null
				}
				{this.props.plaid !== this.context.globalState.settings.data.state.whitelistPlaid ?
					<li className="animate-button-container">
						<a href="#" onClick={this.addToWhitelist}>
							<i className="fas fa-check-circle" />
							&nbsp;
							{i18next.t('KARA_MENU.ADD_WHITELIST')}
						</a>
						<a href="#" className={`animate-button-success${this.state.effect_whitelist ? ' activate':''}`}>
							<i className="fas fa-fw fa-check-square" />
							&nbsp;
							{i18next.t('KARA_MENU.WHITELISTED')}
						</a>
					</li> : null
				}
			</ul>
		);
	}
}

export default CheckedKaraMenuModal;
