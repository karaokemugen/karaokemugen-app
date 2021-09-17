import i18next from 'i18next';
import React, { Component } from 'react';

import { DBPL } from '../../../../../src/lib/types/database/playlist';
import { closeModal } from '../../../store/actions/modal';
import { setSettings } from '../../../store/actions/settings';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { displayMessage } from '../../../utils/tools';

interface IProps {
	changeIdPlaylist: (plaid: string, idBLSet?: number) => void
	mode: 'create' | 'edit';
	playlistInfo?: DBPL;
}

interface IState {
	name: string;
	flag_current: boolean;
	flag_public: boolean;
	flag_visible: boolean;
	flag_whitelist: boolean,
	flag_blacklist: boolean,
	flag_smart: boolean,
}

class PlaylistModal extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	state = {
		name: this.props.mode === 'edit' && this.props.playlistInfo?.name || undefined,
		flag_current: this.props.mode === 'edit' ? this.props.playlistInfo?.flag_current : false,
		flag_public: this.props.mode === 'edit' ? this.props.playlistInfo?.flag_public : false,
		flag_smart: this.props.mode === 'edit' ? this.props.playlistInfo?.flag_smart : false,
		flag_whitelist: this.props.mode === 'edit' ? this.props.playlistInfo?.flag_whitelist : false,
		flag_blacklist: this.props.mode === 'edit' ? this.props.playlistInfo?.flag_blacklist : false,
		flag_visible: this.props.mode === 'edit' ? this.props.playlistInfo?.flag_visible : true
	}

	createPlaylist = async () => {
		try {
			const response = await commandBackend(
				'createPlaylist',
				{
					name: this.state.name,
					flag_visible: this.state.flag_visible,
					flag_current: this.state.flag_current,
					flag_smart: this.state.flag_smart,
					flag_whitelist: this.state.flag_whitelist,
					flag_blacklist: this.state.flag_blacklist,
					flag_public: this.state.flag_public,
				}
			);
			this.props.changeIdPlaylist(response.plaid);
			this.closeModal();
		} catch (e) {
			// already display
		}
	};

	editPlaylist = async () => {
		await commandBackend('editPlaylist', {
			name: this.state.name,
			flag_visible: this.state.flag_visible,
			flag_current: this.state.flag_current,
			flag_smart: this.state.flag_smart,
			flag_whitelist: this.state.flag_whitelist,
			flag_blacklist: this.state.flag_blacklist,
			flag_public: this.state.flag_public,
			plaid: this.props.playlistInfo.plaid
		});
		setSettings(this.context.globalDispatch);
		this.closeModal();
	};

	toggleCurrent = () => {
		if (this.props.mode === 'edit' && this.props.playlistInfo?.flag_current) {
			displayMessage('warning', i18next.t('MODAL.PLAYLIST_MODAL.CANNOT_CURRENT_PLAYLIST'),
				4500, 'top-center');
		} else {
			this.setState({
				flag_current: !this.state.flag_current,
				flag_smart: false,
				flag_whitelist: false,
				flag_blacklist: false
			});
		}
	}

	togglePublic = () => {
		if (this.props.mode === 'edit' && this.props.playlistInfo?.flag_public) {
			displayMessage('warning', i18next.t('MODAL.PLAYLIST_MODAL.CANNOT_PUBLIC'), 4500, 'top-center');
		} else {
			this.setState({
				flag_public: !this.state.flag_public,
				flag_smart: false,
				flag_whitelist: false,
				flag_blacklist: false
			});
		}
	}

	toggleSmart = () => {
		if (this.props.mode === 'edit' || this.state.flag_current || this.state.flag_public) {
			displayMessage('warning', i18next.t('MODAL.PLAYLIST_MODAL.CANNOT_SMART'), 4500, 'top-center');
		} else {
			this.setState({
				flag_public: false,
				flag_current: false,
				flag_smart: !this.state.flag_smart,
				flag_whitelist: false,
				flag_blacklist: false
			});
		}
	}

	toggleBlacklist = () => {
		if (this.props.mode === 'edit' || this.state.flag_current || this.state.flag_public) {
			displayMessage('warning', i18next.t('MODAL.PLAYLIST_MODAL.CANNOT_BLACKLIST'), 4500, 'top-center');
		} else {
			this.setState({
				flag_public: false,
				flag_current: false,
				flag_smart: true,
				flag_whitelist: false,
				flag_blacklist: !this.state.flag_blacklist
			});
		}
	}

	toggleWhitelist = () => {
		if (this.props.mode === 'edit' || this.state.flag_current || this.state.flag_public) {
			displayMessage('warning', i18next.t('MODAL.PLAYLIST_MODAL.CANNOT_WHITELIST'), 4500, 'top-center');
		} else {
			this.setState({
				flag_public: false,
				flag_current: false,
				flag_smart: true,
				flag_whitelist: !this.state.flag_whitelist,
				flag_blacklist: false
			});
		}
	}

	closeModal = () => {
		closeModal(this.context.globalDispatch);
	}

	render() {
		return (
			<div className="modal modalPage">
				<div className="modal-dialog">
					<div className="modal-content">
						<ul className="modal-header">
							<h4 className="modal-title">{this.props.mode === 'edit' ?
								i18next.t('MODAL.PLAYLIST_MODAL.EDIT_PLAYLIST', {
									playlist: this.props.playlistInfo?.name
								}) :
								i18next.t('MODAL.PLAYLIST_MODAL.CREATE_PLAYLIST')
							}</h4>
						</ul>
						<div className="modal-body flex-direction-btns">
							<div>{i18next.t('MODAL.PLAYLIST_MODAL.NAME')}</div>
							<div className="form">
								<input type="text" autoFocus className="modal-input" defaultValue={this.state.name}
									onChange={(event) => this.setState({ name: event.target.value })} />
							</div>
							<div>
								<button className="btn btn-default"
									type="button" onClick={this.toggleCurrent}>
									<input type="checkbox" checked={this.state.flag_current}
										disabled={(this.props.mode === 'edit' && this.props.playlistInfo?.flag_current) || this.state.flag_smart}
										onChange={this.toggleCurrent} />
									<div className="btn-large-container">
										<div className="title">
											{i18next.t('MODAL.PLAYLIST_MODAL.CURRENT')}
										</div>
										<div className="desc">
											{i18next.t('MODAL.PLAYLIST_MODAL.CURRENT_DESC')}
										</div>
									</div>
								</button>
							</div>
							<div>
								<button className="btn btn-default"
									type="button" onClick={this.togglePublic}>
									<input type="checkbox" checked={this.state.flag_public}
										disabled={(this.props.mode === 'edit' && this.props.playlistInfo?.flag_public) || this.state.flag_smart}
										onChange={this.togglePublic} />
									<div className="btn-large-container">
										<div className="title">{i18next.t('MODAL.PLAYLIST_MODAL.PUBLIC')}</div>
										<div className="desc">{i18next.t('MODAL.PLAYLIST_MODAL.PUBLIC_DESC')}</div>
									</div>
								</button>
							</div>
							<div>
								<button className="btn btn-default"
									type="button" onClick={this.toggleSmart}>
									<input type="checkbox" checked={this.state.flag_smart}
										disabled={this.props.mode === 'edit' || this.state.flag_current || this.state.flag_public}
										onChange={this.toggleSmart} />
									<div className="btn-large-container">
										<div className="title">{i18next.t('MODAL.PLAYLIST_MODAL.SMART')}</div>
										<div className="desc">{i18next.t('MODAL.PLAYLIST_MODAL.SMART_DESC')}</div>
									</div>
								</button>
							</div>
							<div>
								<button className="btn btn-default"
									type="button" onClick={this.toggleBlacklist}>
									<input type="checkbox" checked={this.state.flag_blacklist}
										disabled={this.props.mode === 'edit' || this.state.flag_current || this.state.flag_public}
										onChange={this.toggleBlacklist} />
									<div className="btn-large-container">
										<div className="title">{i18next.t('MODAL.PLAYLIST_MODAL.BLACKLIST')}</div>
										<div className="desc">{i18next.t('MODAL.PLAYLIST_MODAL.BLACKLIST_DESC')}</div>
									</div>
								</button>
							</div>
							<div>
								<button className="btn btn-default"
									type="button" onClick={this.toggleWhitelist}>
									<input type="checkbox" checked={this.state.flag_whitelist}
										disabled={this.props.mode === 'edit' || this.state.flag_current || this.state.flag_public}
										onChange={this.toggleWhitelist} />
									<div className="btn-large-container">
										<div className="title">{i18next.t('MODAL.PLAYLIST_MODAL.WHITELIST')}</div>
										<div className="desc">{i18next.t('MODAL.PLAYLIST_MODAL.WHITELIST_DESC')}</div>
									</div>
								</button>
							</div>
							<div>
								<button className="btn btn-default"
									type="button" onClick={() => this.setState({ flag_visible: !this.state.flag_visible })}>
									<input type="checkbox" checked={this.state.flag_visible}
										onChange={() => this.setState({ flag_visible: !this.state.flag_visible })} />
									<div className="btn-large-container">
										<div className="title">{i18next.t('MODAL.PLAYLIST_MODAL.VISIBLE')}</div>
										<div className="desc">{i18next.t('MODAL.PLAYLIST_MODAL.VISIBLE_DESC')}</div>
									</div>
								</button>
							</div>
						</div >
						<div className="modal-footer">
							<button type="button" className="btn btn-action btn-primary other" onClick={this.closeModal}>
								<i className="fas fa-times" /> {i18next.t('CANCEL')}
							</button>
							<button type="button" className="btn btn-action btn-default ok"
								onClick={this.props.mode === 'create' ? this.createPlaylist : this.editPlaylist}>
								<i className="fas fa-check" /> {this.props.mode === 'create' ?
									i18next.t('MODAL.PLAYLIST_MODAL.CREATE') : i18next.t('MODAL.PLAYLIST_MODAL.EDIT')
								}
							</button>
						</div>
					</div >
				</div >
			</div >
		);
	}
}

export default PlaylistModal;
