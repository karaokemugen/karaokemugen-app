import i18next from 'i18next';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { BLCSet } from '../../../../../src/types/blacklist';
import { DBPL } from '../../../../../src/types/database/playlist';
import { setSettings } from '../../../store/actions/settings';
import { GlobalContextInterface } from '../../../store/context';
import { commandBackend } from '../../../utils/socket';

interface IProps {
	idPlaylist?: number;
	changeIdPlaylist: (idPlaylist: number, idBLSet?: number) => void
	mode: 'create' | 'edit';
	playlistInfo?: DBPL;
	bLSet?: BLCSet;
	context: GlobalContextInterface;
}

interface IState {
	name: string;
	flag_current: boolean;
	flag_public: boolean;
	flag_visible: boolean;
	flag_autosortbylike: boolean;
}

class PlaylistModal extends Component<IProps, IState> {

	state = {
		name: this.props.mode === 'edit' && (this.props.idPlaylist === -4 ?
			this.props.bLSet?.name
			: this.props.playlistInfo?.name) || undefined,
		flag_current: this.props.mode === 'edit' && (this.props.playlistInfo?.flag_current
		|| (this.props.idPlaylist === -4 && this.props.bLSet.flag_current)) || false,
		flag_public: this.props.mode === 'edit' && this.props.playlistInfo?.flag_public || false,
		flag_visible: this.props.mode === 'edit' && this.props.playlistInfo?.flag_visible || true,
		flag_autosortbylike: this.props.mode === 'edit' && this.props.playlistInfo?.flag_autosortbylike || false
	}

	createPlaylist = async () => {
		const response = await commandBackend(
			this.props.idPlaylist === -4 ? 'createBLCSet' : 'createPlaylist',
			{
				name: this.state.name,
				flag_visible: this.state.flag_visible,
				flag_current: this.state.flag_current,
				flag_public: this.state.flag_public,
				flag_autosortbylike: this.state.flag_autosortbylike,
			}
		);
		this.props.idPlaylist === -4 ? this.props.changeIdPlaylist(-4, response.id) : this.props.changeIdPlaylist(response);
		this.closeModal();
	};

	editPlaylist = async () => {
		await commandBackend(this.props.idPlaylist === -4 ? 'editBLCSet' : 'editPlaylist', {
			name: this.state.name,
			set_id: this.props.bLSet?.blc_set_id,
			flag_visible: this.state.flag_visible,
			flag_current: this.state.flag_current,
			flag_public: this.state.flag_public,
			flag_autosortbylike: this.state.flag_autosortbylike,
			pl_id: this.props.idPlaylist
		});
		setSettings(this.props.context.globalDispatch);
		this.closeModal();
	};

	closeModal = () => {
		const element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
	}

	render() {
		return (
			<div className="modal modalPage">
				<div className="modal-dialog">
					<div className="modal-content">
						<ul className="modal-header">
							<h4 className="modal-title">{this.props.mode === 'edit' ?
								i18next.t('MODAL.PLAYLIST_MODAL.EDIT_PLAYLIST', { playlist:
									(this.props.idPlaylist === -4 ?
										this.props.bLSet.name
										: this.props.playlistInfo.name)
								}) :
								i18next.t('MODAL.PLAYLIST_MODAL.CREATE_PLAYLIST')
							}</h4>
							<button className="closeModal"
								onClick={this.closeModal}>
								<i className="fas fa-times"></i>
							</button>
						</ul>
						<div className="modal-body flex-direction-btns">
							<div>{i18next.t('MODAL.PLAYLIST_MODAL.NAME')}</div>
							<div className="form">
								<input type="text" autoFocus className="modal-input form-control" defaultValue={this.state.name}
									onChange={(event) => this.setState({ name: event.target.value })} />
							</div>
							<div>
								<button className="btn btn-default"
									type="button" onClick={() => this.setState({ flag_current: !this.state.flag_current })}>
									<input type="checkbox" checked={this.state.flag_current}
										onChange={() => this.setState({ flag_current: !this.state.flag_current })} />
									<div className="btn-large-container">
										<div className="title">{i18next.t('MODAL.PLAYLIST_MODAL.CURRENT')}</div>
										<div className="desc">{i18next.t('MODAL.PLAYLIST_MODAL.CURRENT_DESC')}</div>
									</div>
								</button>
							</div>
							{this.props.idPlaylist >= 0 ?
								<>
									<div>
										<button className="btn btn-default"
											type="button" onClick={() => this.setState({ flag_public: !this.state.flag_public })}>
											<input type="checkbox" checked={this.state.flag_public}
												onChange={() => this.setState({ flag_public: !this.state.flag_public })} />
											<div className="btn-large-container">
												<div className="title">{i18next.t('MODAL.PLAYLIST_MODAL.PUBLIC')}</div>
												<div className="desc">{i18next.t('MODAL.PLAYLIST_MODAL.PUBLIC_DESC')}</div>
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
									<div>
										<button className="btn btn-default"
											type="button" onClick={() => this.setState({ flag_visible: !this.state.flag_autosortbylike })}>
											<input type="checkbox" checked={this.state.flag_autosortbylike}
												onChange={() => this.setState({ flag_autosortbylike: !this.state.flag_autosortbylike })} />
											<div className="btn-large-container">
												<div className="title">{i18next.t('MODAL.PLAYLIST_MODAL.AUTOSORTBYLIKE')}</div>
												<div className="desc">{i18next.t('MODAL.PLAYLIST_MODAL.AUTOSORTBYLIKE_DESC')}</div>
											</div>
										</button>
									</div>
								</> : null
							}
						</div >
						<div className="modal-footer">
							<button type="button" className="btn btn-action btn-primary other" onClick={this.closeModal}>
								<i className="fas fa-times"></i>
							</button>
							<button type="button" className="btn btn-action btn-default ok"
								onClick={this.props.mode === 'create' ? this.createPlaylist : this.editPlaylist}>
								<i className="fas fa-check"></i>
							</button>
						</div>
					</div >
				</div >
			</div >
		);
	}
}

export default PlaylistModal;
