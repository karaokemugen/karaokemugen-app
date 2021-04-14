import i18next from 'i18next';
import React, { Component } from 'react';

import { BLCSet } from '../../../../../src/types/blacklist';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';

interface IProps {
	bLSetFrom: number;
	bLSetList: BLCSet[];
}

interface IState {
	blSetToCopy?: number
}

class BlcSetCopyModal extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	state = {
		blSetToCopy: this.props.bLSetList[0].blc_set_id
	}

	confirmModal = () => {
		if (this.state.blSetToCopy) {
			commandBackend('copyBLCs', { fromSet_id: this.props.bLSetFrom, toSet_id: this.state.blSetToCopy });
			closeModal(this.context.globalDispatch);
		}
	};

	abortModal = () => {
		closeModal(this.context.globalDispatch);
	};

	render() {
		const modalDialogClass = window.innerWidth <= 1023 ? 'modal-dialog modal-sm' : 'modal-dialog';
		return (
			<div className="modal" id="modalBox">
				<div className={modalDialogClass}>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">{i18next.t('BLC.COPY_TO')}</h4>
							<button className="closeModal"
								onClick={() => {
									closeModal(this.context.globalDispatch);
								}}>
								<i className="fas fa-times"></i>
							</button>
						</div>
						<div className="modal-body">
							<select
								value={this.state.blSetToCopy} onChange={(e) => this.setState({ blSetToCopy: Number(e.target.value) })}>
								{this.props.bLSetList.map(set => {
									return <option key={set.blc_set_id} value={set.blc_set_id}>{set.name}</option>;
								})}
							</select>
						</div>
						<div className="modal-footer">
							<button type="button" className="btn btn-action btn-primary other" onClick={this.abortModal}>
								<i className="fas fa-times" /> {i18next.t('CANCEL')}
							</button>
							<button type="button" className="btn btn-action btn-default ok" onClick={this.confirmModal}>
								<i className="fas fa-check" /> {i18next.t('BLC.COPY_SHORT')}
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

export default BlcSetCopyModal;
