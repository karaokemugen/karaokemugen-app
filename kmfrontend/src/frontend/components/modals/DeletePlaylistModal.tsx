import i18next from 'i18next';
import React, { Component } from 'react';

import { DBPL } from '../../../../../src/lib/types/database/playlist';
import { BLCSet } from '../../../../../src/types/blacklist';
import nanamiShockedPng from '../../../assets/nanami-shocked.png';
import nanamiShockedWebP from '../../../assets/nanami-shocked.webp';
import { closeModal } from '../../../store/actions/modal';
import { setSettings } from '../../../store/actions/settings';
import { GlobalContextInterface } from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { nonStandardPlaylists } from '../../../utils/tools';
import SelectWithIcon from '../generic/SelectWithIcon';

interface IProps {
	plaid?: string;
	plaidTo?: string;
	changeIdPlaylist: (idPlaylist: string, idBLSet?: number) => void
	playlistInfo?: DBPL;
	bLSet?: BLCSet;
	context: GlobalContextInterface;
	playlistList: { value: string, label: string, icons: string[] }[];
	bLSetList?: { value: string, label: string, icons: string[] }[];
}

interface IState {
	plaidChosen: string;
}

class DeletePlaylistModal extends Component<IProps, IState> {

	state = {
		plaidChosen: undefined
	}

	deletePlaylist = async () => {
		try {
			if (this.state.plaidChosen) {
				await commandBackend(this.props.plaid === nonStandardPlaylists.blc ? 'editBLCSet' : 'editPlaylist', {
					set_id: this.state.plaidChosen,
					flag_current: this.props.plaid === nonStandardPlaylists.blc ? true : (this.props.playlistInfo?.flag_current
						|| this.props.context.globalState.settings.data.state.currentPlaid === this.state.plaidChosen),
					flag_public: this.props.playlistInfo?.flag_public
						|| this.props.context.globalState.settings.data.state.publicPlaid === this.state.plaidChosen,
					plaid: this.state.plaidChosen
				});
				await setSettings(this.props.context.globalDispatch);
			} if (this.props.plaid === nonStandardPlaylists.blc) {
				commandBackend('deleteBLCSet', {
					set_id: this.props.bLSet?.blc_set_id
				});
				this.props.changeIdPlaylist(nonStandardPlaylists.blc);
			} else {
				this.props.changeIdPlaylist(this.state.plaidChosen ?
					this.state.plaidChosen :
					(this.props.plaidTo === this.props.context.globalState.settings.data.state.publicPlaid ?
						-1 :
						this.props.context.globalState.settings.data.state.publicPlaid));
				commandBackend('deletePlaylist', {
					plaid: this.props.plaid
				});
			}
			this.closeModal();
		} catch (e) {
			// already display
		}
	};

	closeModal = () => {
		closeModal(this.props.context.globalDispatch);
	}

	render() {
		const message = (this.props.plaid === nonStandardPlaylists.blc && this.props.bLSet?.flag_current) ?
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
								<picture>
									<source type="image/webp" srcSet={nanamiShockedWebP} />
									<source type="image/png" srcSet={nanamiShockedPng} />
									<img src={nanamiShockedPng} alt="Nanami is shocked oO" />
								</picture>
								{i18next.t('MODAL.DELETE_PLAYLIST_MODAL.TITLE', {
									playlist: this.props.plaid === nonStandardPlaylists.blc ?
										this.props.bLSet?.name :
										(this.props.playlistInfo as DBPL).name
								})}
							</h4>
						</ul>
						{message ?
							<div className="modal-body">
								<div className="modal-message text">
									<p>{i18next.t(message)}</p>
									<SelectWithIcon
										list={this.props.plaid === nonStandardPlaylists.blc ?
											this.props.bLSetList :
											this.props.playlistList}
										value={this.state.plaidChosen}
										onChange={(value: any) => this.setState({ plaidChosen: value })} />
								</div>
							</div> : null
						}
						<div className="modal-footer">
							<button type="button" className="btn btn-action btn-primary other" onClick={this.closeModal}>
								<i className="fas fa-times" /> {i18next.t('CANCEL')}
							</button>
							<button type="button" className="btn btn-action btn-default ok"
								onClick={this.deletePlaylist}>
								<i className="fas fa-check" /> {i18next.t('YES')}
							</button>
						</div>
					</div >
				</div >
			</div >
		);
	}
}

export default DeletePlaylistModal;
