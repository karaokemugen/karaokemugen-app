import i18next from 'i18next';
import React, { Component } from 'react';

import { GlobalContextInterface } from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { displayMessage, is_touch_device } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';

interface IProps {
	checkedkaras: KaraElement[]
	idPlaylist: number;
	publicOuCurrent?: boolean | undefined;
	topKaraMenu: number;
	leftKaraMenu: number;
	closeKaraMenu: () => void;
	context: GlobalContextInterface;
}

class CheckedKaraMenuModal extends Component<IProps, unknown> {

	freeKara = async () => {
		if (this.props.checkedkaras.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		await commandBackend('editPLC', {
			plc_ids: this.props.checkedkaras.map(a => a.playlistcontent_id),
			flag_free: true
		});
		this.props.closeKaraMenu();
	};


	changeVisibilityKaraOn = () => {
		commandBackend('editPLC', {
			plc_ids: this.props.checkedkaras.map(a => a.playlistcontent_id),
			flag_visible: true
		});
		this.props.closeKaraMenu();
	};

	changeVisibilityKaraOff = () => {
		commandBackend('editPLC', {
			plc_ids: this.props.checkedkaras.map(a => a.playlistcontent_id),
			flag_visible: false
		});
		this.props.closeKaraMenu();
	};

	makeFavorite = () => {
		commandBackend('addFavorites', {
			kids: this.props.checkedkaras.map(a => a.kid)
		});
		this.props.closeKaraMenu();
	};

	addToBlacklist = () => {
		commandBackend('createBLC', {
			blcs: this.props.checkedkaras.map(a => {
				return { type: 1001, value: a.kid };
			}),
			set_id: this.props.context.globalState.frontendContext.currentBlSet
		});
		this.props.closeKaraMenu();
	}

	addToWhitelist = () => {
		commandBackend('addKaraToWhitelist', {
			kids: this.props.checkedkaras.map(a => a.kid)
		});
		this.props.closeKaraMenu();
	}

	handleClick = (e: MouseEvent) => {
		if (!(e.target as Element).closest('#modal')) {
			this.props.closeKaraMenu();
		}
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
				{this.props.idPlaylist !== -5 ?
					<li>
						<a href="#" onClick={this.makeFavorite}>
							<i className="fas fa-star" />
							&nbsp;
							{i18next.t('TOOLTIP_FAV')}
						</a>
					</li> : null
				}
				{this.props.publicOuCurrent ?
					<li>
						<a href="#" onClick={this.freeKara} title={i18next.t('KARA_MENU.FREE')}>
							<i className="fas fa-gift" />
							&nbsp;
							{i18next.t('KARA_MENU.FREE_SHORT')}
						</a>
					</li> : null
				}
				{this.props.idPlaylist >= 0 ?
					<li>
						<a href="#" onClick={this.changeVisibilityKaraOn}
							title={i18next.t('KARA_MENU.VISIBLE_ON')}>
							<i className="fas fa-eye" />
							&nbsp;
							{i18next.t('KARA_MENU.VISIBLE_ON_SHORT')}
						</a>
					</li> : null
				}
				{this.props.idPlaylist >= 0 ?
					<li>
						<a href="#" onClick={this.changeVisibilityKaraOff}
							title={i18next.t('KARA_MENU.VISIBLE_OFF')}>
							<i className="fas fa-eye-slash" />
							&nbsp;
							{i18next.t('KARA_MENU.VISIBLE_OFF_SHORT')}
						</a>
					</li> : null
				}
				{this.props.idPlaylist !== -2 && this.props.idPlaylist !== -4 ?
					<li>
						<a href="#" onClick={this.addToBlacklist}>
							<i className="fas fa-ban" />
							&nbsp;
							{i18next.t('KARA_MENU.ADD_BLACKLIST')}
						</a>
					</li> : null
				}
				{this.props.idPlaylist !== -3 ?
					<li>
						<a href="#" onClick={this.addToWhitelist}>
							<i className="fas fa-check-circle" />
							&nbsp;
							{i18next.t('KARA_MENU.ADD_WHITELIST')}
						</a>
					</li> : null
				}
			</ul>
		);
	}
}

export default CheckedKaraMenuModal;
