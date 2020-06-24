import React, { Component } from 'react';
import i18next from 'i18next';
import store from '../../store';

require('./ActionsButtons.scss');

interface IProps {
	scope: string;
	isHeader? : boolean;
	idPlaylist: number;
	idPlaylistTo: number;
	addKara: (event?:any, pos?:number) => void;
	deleteKara: () => void;
	transferKara: (event:any, pos?:number) => void;
}

class ActionsButtons extends Component<IProps, {}> {
    onRightClickAdd = (e: any) => {
    	if (this.props.scope == 'admin') {
    		e.preventDefault();
    		e.stopPropagation(); 
    		this.props.addKara(e, store.getPosPlaying());
    	}
	};
	
	onRightClickTransfer = (e:any) => {
		e.preventDefault();
		e.stopPropagation(); 
		this.props.transferKara(e, store.getPosPlaying());
    };

    render() {
    	let classValue = this.props.isHeader ? 'btn btn-default' : 'btn btn-sm btn-action';
    	return (
    		<React.Fragment>
    			{this.props.scope === 'admin' && this.props.idPlaylist !== -1 ?
    				<button title={i18next.t('TOOLTIP_DELETEKARA')}
    					className={`${classValue} karaLineButton`} onClick={this.props.deleteKara}><i className="fas fa-minus"></i></button> : null}
    			{(this.props.scope === 'admin' && this.props.idPlaylistTo !== -1) ||
                    (this.props.scope === 'public' && this.props.idPlaylist !== store.getPublicPlaylistID()) ?
    				<button title={i18next.t('TOOLTIP_ADDKARA') + (this.props.scope == 'admin' ? ' - ' + i18next.t('TOOLTIP_ADDKARA_ADMIN') : '')}
						className={`${classValue} karaLineButton`} onContextMenu={this.onRightClickAdd} onClick={this.props.addKara}>
						<i className="fas fa-plus"></i>
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
