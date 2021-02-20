import './ActionsButtons.scss';

import i18next from 'i18next';
import React, { Component } from 'react';

import GlobalContext from '../../../store/context';
import { KaraElement } from '../../types/kara';

interface IProps {
	scope: string;
	side: number;
	isHeader?: boolean;
	idPlaylist: number;
	idPlaylistTo: number;
	kara?: KaraElement;
	checkedKaras?: number;
	flag_public: boolean;
	addKara: (event?: any, pos?: number) => void;
	deleteKara: () => void;
	transferKara: (event: any, pos?: number) => void;
	deleteFavorite: () => void;
	upvoteKara?: () => void;
}

class ActionsButtons extends Component<IProps, unknown> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	onRightClickAdd = (e: any) => {
		if (this.props.scope === 'admin') {
			e.preventDefault();
			e.stopPropagation();
			this.props.addKara(e, -1);
		}
	};

	onRightClickTransfer = (e: any) => {
		e.preventDefault();
		e.stopPropagation();
		this.props.transferKara(e, -1);
	};

	render() {
		const classValue = this.props.isHeader ? 'btn btn-default karaLineButton' : 'btn btn-sm btn-action karaLineButton';
		return (
			<>
				{this.props.idPlaylist !== -5 && ((this.props.scope === 'admin' && this.props.idPlaylist !== -1)
					|| (this.props.scope !== 'admin' && !this.props.kara?.flag_dejavu && !this.props.kara?.flag_playing
						&& (this.props.kara?.my_public_plc_id && this.props.kara?.my_public_plc_id[0]
							|| (this.props.flag_public && this.props.kara.username === this.context.globalState.auth.data.username)))) ?
					<button title={i18next.t(this.props.isHeader ? 'TOOLTIP_DELETE_SELECT_KARA' : 'TOOLTIP_DELETEKARA')}
						disabled={this.props.kara?.flag_upvoted || this.props?.checkedKaras === 0}
						className={classValue} onClick={this.props.deleteKara}>
						<i className="fas fa-eraser" />
					</button> : null
				}

				{this.props.idPlaylist === -5 ?
					<button title={i18next.t(this.props.isHeader ? 'TOOLTIP_DELETE_SELECT_FAVS' : 'TOOLTIP_DELETE_FAVS')}
						className={classValue} onClick={this.props.deleteFavorite}>
						<i className="fas fa-star" />
					</button> : null
				}

				{(this.props.scope === 'admin' && this.props.idPlaylistTo !== -1 && this.props.idPlaylistTo !== -5)
					|| (this.props.scope === 'public' && this.props.idPlaylist !== this.context.globalState.settings.data.state.publicPlaylistID
						&& this.props.idPlaylist !== this.context.globalState.settings.data.state.currentPlaylistID
						&& (!this.props.kara?.public_plc_id || !this.props.kara?.public_plc_id[0])) ?
					<button
						title={this.props.isHeader ? i18next.t('TOOLTIP_ADD_SELECT_KARA') :
							`${i18next.t('TOOLTIP_ADDKARA')}${(this.props.scope === 'admin' ? ' - ' + i18next.t('TOOLTIP_ADDKARA_ADMIN') : '')}`}
						className={classValue} onContextMenu={this.onRightClickAdd}
						onClick={this.props.addKara}
						disabled={this.props?.checkedKaras === 0}>
						<i className="fas fa-plus" />
					</button> : null
				}

				{this.context.globalState.auth.data.role !== 'admin' && (this.props.kara?.upvotes > 0
					|| this.props.kara.username !== this.context.globalState.auth.data.username)
					&& (this.props.flag_public || (this.props.kara?.public_plc_id && this.props.kara?.public_plc_id[0]
						&& !(this.props.kara?.my_public_plc_id && this.props.kara?.my_public_plc_id[0]))) ?
					<button
						title={i18next.t('TOOLTIP_UPVOTE')}
						className={`${classValue} upvoteKara`}
						onClick={this.props.upvoteKara}
						disabled={this.props.kara.username === this.context.globalState.auth.data.username}>
						<i className={`fas fa-thumbs-up ${this.props.kara?.flag_upvoted ? 'currentUpvote' : ''}
						${this.props.kara?.upvotes > 0 ? ' upvotes' : ''}`} />
						{this.props.kara?.upvotes > 0 && this.props.kara?.upvotes}
					</button> : null
				}

				{this.props.scope === 'admin' && this.props.isHeader && this.props.idPlaylistTo >= 0 && this.props.idPlaylist >= 0 ?
					<button
						title={i18next.t('TOOLTIP_TRANSFER_SELECT_KARA')}
						className={classValue} disabled={this.props?.checkedKaras === 0}
						onContextMenu={this.onRightClickTransfer}
						onClick={this.props.transferKara}>
						<i className="fas fa-exchange-alt" />
					</button> : null
				}
			</>
		);
	}
}

export default ActionsButtons;
