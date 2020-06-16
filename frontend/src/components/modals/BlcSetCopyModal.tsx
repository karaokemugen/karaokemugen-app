import React, { Component } from 'react';
import i18next from 'i18next';
import axios from 'axios';
import ReactDOM from 'react-dom';
import { BLCSet } from '../../../../src/types/blacklist';

interface IProps {
	bLSetFrom: number;
	bLSetList: BLCSet[];
}

interface IState {
	blSetToCopy?: number
}

class BlcSetCopyModal extends Component<IProps,IState> {
	
	state = {
		blSetToCopy: this.props.bLSetList[0].blc_set_id
	}

    confirmModal = () => {
		if (this.state.blSetToCopy) {
			axios.post('/blacklist/set/criterias/copy', {fromSet_id: this.props.bLSetFrom, toSet_id: this.state.blSetToCopy});
			let element = document.getElementById('modal');
			if (element) ReactDOM.unmountComponentAtNode(element);
		}
    };

    abortModal = () => {
		let element = document.getElementById('modal');
    	if (element) ReactDOM.unmountComponentAtNode(element);
    };

	render() {
		let modalDialogClass = window.innerWidth <= 1023 ? 'modal-dialog modal-sm' : 'modal-dialog modal-md';
		return (
			<div className="modal" id="modalBox">
				<div className={modalDialogClass}>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">{i18next.t('BLC.COPY_TO')}</h4>
							<button className="closeModal btn btn-action" 
								onClick={() => {
										let element = document.getElementById('modal');
										if (element) ReactDOM.unmountComponentAtNode(element);
									}}>
								<i className="fas fa-times"></i>
							</button>
						</div>
						<div className="modal-body">
							<select className="selectPlaylist"
								value={this.state.blSetToCopy} onChange={(e) => this.setState({blSetToCopy: Number(e.target.value)})}>
								{this.props.bLSetList.map(set => {
									return <option className="selectPlaylist" key={set.blc_set_id} value={set.blc_set_id}>{set.name}</option>;
								})}
							</select>
						</div>
						<div className="modal-footer">
							<button type="button" className="btn btn-action btn-primary other" onClick={this.abortModal}>
								<i className="fas fa-times"></i>
							</button>
    						<button type="button" className="btn btn-action btn-default ok" onClick={this.confirmModal}>
    							<i className="fas fa-check"></i>
    						</button>
    					</div>
					</div>
				</div>
			</div>
		);
	}
}

export default BlcSetCopyModal;
