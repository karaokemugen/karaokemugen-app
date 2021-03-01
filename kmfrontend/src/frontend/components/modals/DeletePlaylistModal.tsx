import i18next from 'i18next';
import React, { Component } from 'react';

import { BLCSet } from '../../../../../src/types/blacklist';
import { DBPL } from '../../../../../src/types/database/playlist';
import { closeModal } from '../../../store/actions/modal';
import { setSettings } from '../../../store/actions/settings';
import { GlobalContextInterface } from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import SelectWithIcon from '../generic/SelectWithIcon';

interface IProps {
	idPlaylist?: number;
	changeIdPlaylist: (idPlaylist: number, idBLSet?: number) => void
	playlistInfo?: DBPL;
	bLSet?: BLCSet;
	context: GlobalContextInterface;
	playlistList: { value: string, label: string, icons: string[] }[];
	bLSetList?: { value: string, label: string, icons: string[] }[];
}

interface IState {
	idPlaylistChosen: number;
}

class DeletePlaylistModal extends Component<IProps, IState> {

	state = {
		idPlaylistChosen: undefined
	}

	deletePlaylist = async () => {
		if (this.state.idPlaylistChosen) {
			await commandBackend(this.props.idPlaylist === -4 ? 'editBLCSet' : 'editPlaylist', {
				set_id: this.state.idPlaylistChosen,
				flag_current: this.props.idPlaylist === -4 ? true : this.props.playlistInfo?.flag_current,
				flag_public: this.props.playlistInfo?.flag_public,
				pl_id: this.state.idPlaylistChosen
			});
			await setSettings(this.props.context.globalDispatch);
		} if (this.props.idPlaylist === -4) {
			commandBackend('deleteBLCSet', {
				set_id: this.props.bLSet?.blc_set_id
			});
			this.props.changeIdPlaylist(-4);
		} else {
			this.props.changeIdPlaylist(this.state.idPlaylistChosen ?
				this.state.idPlaylistChosen :
				this.props.context.globalState.settings.data.state.publicPlaylistID);
			commandBackend('deletePlaylist', {
				pl_id: this.props.idPlaylist
			});
		}
		this.closeModal();
	};

	closeModal = () => {
		closeModal(this.props.context.globalDispatch);
	}

	render() {
		const message = (this.props.idPlaylist === -4 && this.props.bLSet?.flag_current) ?
			'MODAL.DELETE_PLAYLIST_MODAL.DELETE_CURRENT_BLC' :
			(this.props.playlistInfo?.flag_current && this.props.playlistInfo?.flag_public ?
				'MODAL.DELETE_PLAYLIST_MODAL.DELETE_CURRENT_PUBLIC' :
				(this.props.playlistInfo?.flag_public ?
					'MODAL.DELETE_PLAYLIST_MODAL.DELETE_PUBLIC' :
					(this.props.playlistInfo?.flag_current ?
						'MODAL.DELETE_PLAYLIST_MODAL.DELETE_CURRENT' :
						null
					)
				)
			);
		return (
			<div className="modal modalPage">
				<div className="modal-dialog">
					<div className="modal-content">
						<ul className="modal-header">
							<h4 className="modal-title">
								{i18next.t('MODAL.DELETE_PLAYLIST_MODAL.TITLE', {
									playlist: this.props.idPlaylist === -4 ?
										this.props.bLSet?.name :
										(this.props.playlistInfo as DBPL).name
								})}
							</h4>
							<button className="closeModal"
								onClick={this.closeModal}>
								<i className="fas fa-times"></i>
							</button>
						</ul>
						{message ?
							<div className="modal-body">
								<div className="modal-message text">
									<p>{i18next.t(message)}</p>
								</div>
								<SelectWithIcon
									list={this.props.idPlaylist === -4 ?
										this.props.bLSetList :
										this.props.playlistList}
									value={this.state.idPlaylistChosen?.toString()}
									onChange={(value: any) => this.setState({ idPlaylistChosen: Number(value) })} />
							</div> : null
						}
						<div className="modal-footer">
							<button type="button" className="btn btn-action btn-primary other" onClick={this.closeModal}>
								<i className="fas fa-times"></i>
							</button>
							<button type="button" className="btn btn-action btn-default ok"
								onClick={this.deletePlaylist}>
								<i className="fas fa-check"></i>
							</button>
						</div>
					</div >
				</div >
			</div >
		);
	}
}

export default DeletePlaylistModal;
