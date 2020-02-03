import React, { Component } from 'react';
import i18next from 'i18next';
import axios from 'axios';
import ReactDOM from 'react-dom';
import { displayMessage } from '../tools';
require('./SuggestionModal.scss');

interface IProps {
	songtypes: Array<string>
}

interface IState {
	name: string;
	serie: string;
	link: string;
	songtype: string;
}

class SuggestionModal extends Component<IProps, IState> {

	constructor(props:IProps) {
		super(props);
		this.state = {
			name: "",
			serie: "",
			link: "",
			songtype: this.props.songtypes[0]
		};
	}

	confirmModal = async () => {
		if (this.state.name && this.state.serie && this.state.songtype) {
			let response = await axios.post('/api/karas/suggest', 
				{ title: this.state.name, serie: this.state.serie, type: this.state.songtype, link: this.state.link });
			displayMessage('info', <div><label>{i18next.t('KARA_SUGGESTION_INFO')}</label> <br/> 
				{i18next.t('KARA_SUGGESTION_LINK')} <a href={response.data}>{i18next.t('KARA_SUGGESTION_LINK_LIST')}</a>
			</div>, 30000);
			var element = document.getElementById('modal');
			if (element) ReactDOM.unmountComponentAtNode(element);
		}
    };

    abortModal = () => {
		var element = document.getElementById('modal');
    	if (element) ReactDOM.unmountComponentAtNode(element);
    };

	render() {
		var modalDialogClass = window.innerWidth <= 1023 ? 'modal-dialog modal-sm' : 'modal-dialog modal-md';
		return (
			<div className="modal" id="modalBox">
				<div className={modalDialogClass}>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">{i18next.t('MODAL.SUGGESTION_MODAL.TITLE')}</h4>
							<button className="closeModal btn btn-action" 
								onClick={() => {
										var element = document.getElementById('modal');
										if (element) ReactDOM.unmountComponentAtNode(element);
									}}>
								<i className="fas fa-times"></i>
							</button>
						</div>
						<div className="modal-body"
							style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
							<div className="lignForm">
								<div>{i18next.t('MODAL.SUGGESTION_MODAL.SERIE')}</div>
								<input type="text" data-exclude={true}
									onChange={(event) => this.setState({ serie: event.target.value })} />
    						</div>
							<div className="lignForm">
								<div>{i18next.t('MODAL.SUGGESTION_MODAL.SONGTYPE')}</div>
								<select onChange={(event) => this.setState({ songtype: event.target.value })}>
									{this.props.songtypes.map(type => {
										return <option key={type} value={type}>{type}</option>
									})}
								</select>
    						</div>
							<div className="lignForm">
								<div>{i18next.t('MODAL.SUGGESTION_MODAL.NAME')}</div>
								<input type="text" data-exclude={true}
									onChange={(event) => this.setState({ name: event.target.value })} />
    						</div>
							<div className="lignForm">
								<div>{i18next.t('MODAL.SUGGESTION_MODAL.LINK')}</div>
								<input type="text" data-exclude={true}
									onChange={(event) => this.setState({ link: event.target.value })} />
    						</div>
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

export default SuggestionModal;
