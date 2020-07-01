import i18next from 'i18next';
import React, { Component } from 'react';

import store from '../../store';
import { KaraElement } from '../../types/kara';

require('./ActionsButtons.scss');

interface IProps {
	scope: string;
	isHeader?: boolean;
	idPlaylist: number;
	idPlaylistTo: number;
	kara?: KaraElement;
	addKara: (event?: any, pos?: number) => void;
	deleteKara: () => void;
	transferKara: (event: any, pos?: number) => void;
}

class ActionsButtons extends Component<IProps, unknown> {
	onRightClickAdd = (e: any) => {
		if (this.props.scope === 'admin') {
			e.preventDefault();
			e.stopPropagation();
			this.props.addKara(e, store.getPosPlaying());
		}
	};

	onRightClickTransfer = (e: any) => {
		e.preventDefault();
		e.stopPropagation();
		this.props.transferKara(e, store.getPosPlaying());
	};

	render() {
		const classValue = this.props.isHeader ? 'btn btn-default' : 'btn btn-sm btn-action';
		return (
			<React.Fragment>
				{this.props.scope === 'admin' && this.props.idPlaylist !== -1 ?
					<button title={i18next.t('TOOLTIP_DELETEKARA')}
						className={`${classValue} karaLineButton`} onClick={this.props.deleteKara}><i className="fas fa-minus"></i></button> : null}
				{(this.props.scope === 'admin' && this.props.idPlaylistTo !== -1) ||
					(this.props.scope === 'public' && this.props.idPlaylist !== store.getState().publicPlaylistID) ?
					<button
						title={`${this.props.kara?.flag_inplaylist && this.props.scope !== 'admin' ? i18next.t('TOOLTIP_UPVOTE') :
							i18next.t('TOOLTIP_ADDKARA')}${(this.props.scope === 'admin' ? ' - ' + i18next.t('TOOLTIP_ADDKARA_ADMIN') : '')}`}
						className={`${classValue} karaLineButton`} onContextMenu={this.onRightClickAdd}
						onClick={(this.props.kara?.my_public_plc_id[0]) ?
							this.props.deleteKara : this.props.addKara}
						disabled={this.props.scope !== 'admin' && this.props.kara?.flag_upvoted}>
						{(this.props.kara?.my_public_plc_id[0]) ?
							<i className="fas fa-minus" /> :
							(this.props.kara?.flag_inplaylist && this.props.scope !== 'admin' ?
								<i className={`fas fa-thumbs-up ${this.props.kara?.flag_upvoted ? 'currentUpvote' : ''}`} /> :
								<i className="fas fa-plus" />)
						}
					</button> : null}
				{this.props.scope === 'admin' && this.props.idPlaylistTo >= 0 && this.props.idPlaylist >= 0 ?
					<button title={i18next.t('TOOLTIP_TRANSFERKARA')} className={classValue}
						onContextMenu={this.onRightClickTransfer} onClick={this.props.transferKara}><i className="fas fa-exchange-alt"></i></button> : null
				}
			</React.Fragment>
		);
	}
}

export default ActionsButtons;
