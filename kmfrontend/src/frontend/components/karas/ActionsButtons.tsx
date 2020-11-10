import i18next from 'i18next';
import React, { Component } from 'react';

import GlobalContext from '../../../store/context';
import { KaraElement } from '../../types/kara';

require('./ActionsButtons.scss');

interface IProps {
	scope: string;
	side: number;
	isHeader?: boolean;
	idPlaylist: number;
	idPlaylistTo: number;
	kara?: KaraElement;
	checkedkaras?: number;
	addKara: (event?: any, pos?: number) => void;
	deleteKara: () => void;
	transferKara: (event: any, pos?: number) => void;
}

class ActionsButtons extends Component<IProps, unknown> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	getPosPlayingOpposite(side:number) {
		return side === 1 ? this.context.globalState.frontendContext.posPlaying2 : this.context.globalState.frontendContext.posPlaying1;
	}

	onRightClickAdd = (e: any) => {
		if (this.props.scope === 'admin') {
			e.preventDefault();
			e.stopPropagation();
			this.props.addKara(e, this.getPosPlayingOpposite(this.props.side));
		}
	};

	onRightClickTransfer = (e: any) => {
		e.preventDefault();
		e.stopPropagation();
		this.props.transferKara(e, this.getPosPlayingOpposite(this.props.side));
	};

	render() {
		const classValue = this.props.isHeader ? 'btn btn-default' : 'btn btn-sm btn-action';
		return (
			<React.Fragment>
				{this.props.scope === 'admin' && this.props.idPlaylist !== -1 ?
					<button title={i18next.t(this.props.isHeader ? 'TOOLTIP_DELETE_SELECT_KARA' : 'TOOLTIP_DELETEKARA')}
						disabled={this.props?.checkedkaras === 0}
						className={`${classValue} karaLineButton`} onClick={this.props.deleteKara}>
						<i className="fas fa-minus" />
					</button> : null}
				{((this.props.scope === 'admin' && this.props.idPlaylistTo !== -1) ||
					(this.props.scope === 'public' && this.props.idPlaylist !== this.context.globalState.settings.data.state.publicPlaylistID
						&& this.props.idPlaylist !== this.context.globalState.settings.data.state.currentPlaylistID && this.props.idPlaylist !== -2))
					&& this.props.idPlaylistTo !== -5 ?
					<button
						title={this.props.isHeader ? i18next.t('TOOLTIP_ADD_SELECT_KARA') : 
							`${this.props.kara?.flag_inplaylist && this.props.scope !== 'admin' ? 
								(
									this.props.kara?.my_public_plc_id && this.props.kara?.my_public_plc_id[0] ?
										i18next.t('TOOLTIP_DELETEKARA') :
										i18next.t('TOOLTIP_UPVOTE')
								) :
								i18next.t('TOOLTIP_ADDKARA')}${(this.props.scope === 'admin' ? ' - ' + i18next.t('TOOLTIP_ADDKARA_ADMIN') : '')}`}
						className={`${classValue} karaLineButton`} onContextMenu={this.onRightClickAdd}
						onClick={(this.props.scope !== 'admin' && this.props.kara?.my_public_plc_id && this.props.kara?.my_public_plc_id[0]) ?
							this.props.deleteKara : this.props.addKara}
						disabled={(this.props.scope !== 'admin' && this.props.kara?.flag_upvoted) || this.props?.checkedkaras === 0}>
						{(this.props.scope !== 'admin' && this.props.kara?.my_public_plc_id && this.props.kara?.my_public_plc_id[0]) ?
							<i className="fas fa-minus" /> :
							(this.props.kara?.flag_inplaylist && this.props.scope !== 'admin' ?
								<i className={`fas fa-thumbs-up ${this.props.kara?.flag_upvoted ? 'currentUpvote' : ''}`} /> :
								<i className="fas fa-plus" />)
						}
					</button> : null}
				{this.props.scope === 'admin' && this.props.isHeader && this.props.idPlaylistTo >= 0 && this.props.idPlaylist >= 0 ?
					<button title={i18next.t('TOOLTIP_TRANSFER_SELECT_KARA')} className={classValue} disabled={this.props?.checkedkaras === 0}
						onContextMenu={this.onRightClickTransfer} onClick={this.props.transferKara}><i className="fas fa-exchange-alt"></i></button> : null
				}
			</React.Fragment>
		);
	}
}

export default ActionsButtons;
