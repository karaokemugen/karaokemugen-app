import axios from 'axios';
import i18next from 'i18next';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { DBKaraTag } from '../../../../src/lib/types/database/kara';
import store from '../../store';
import { displayMessage, getTagInLanguage } from '../tools';
require('./SuggestionModal.scss');

interface IState {
	name: string;
	serie: string;
	link: string;
	songtype: string;
	songtypes: Array<string>;
	disabledButton: boolean;
}

class SuggestionModal extends Component<unknown, IState> {

	constructor(props: unknown) {
		super(props);
		this.state = {
			name: '',
			serie: '',
			link: '',
			songtype: '',
			songtypes: [],
			disabledButton: false
		};
	}

	async componentDidMount() {
		const response = await axios.get('/tags', { params: { type: 3 } });
		const songtypes = response.data.content.map((tag: DBKaraTag) => getTagInLanguage(tag, store.getNavigatorLanguage() as string, 'eng'));
		this.setState({ songtypes: songtypes, songtype: songtypes[0] });
	}

	confirmModal = async () => {
		if (this.state.name && this.state.serie && this.state.songtype) {
			this.setState({ disabledButton: true });
			const response = await axios.post('/karas/suggest',
				{ title: this.state.name, serie: this.state.serie, type: this.state.songtype, link: this.state.link });
			displayMessage('info', <div><label>{i18next.t('KARA_SUGGESTION_INFO')}</label> <br />
				{i18next.t('KARA_SUGGESTION_LINK')} <a href={response.data.url}>{i18next.t('KARA_SUGGESTION_LINK_LIST')}</a>
			</div>, 30000);
			const element = document.getElementById('modal');
			if (element) ReactDOM.unmountComponentAtNode(element);
		}
	};

	abortModal = () => {
		const element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
	};

	render() {
		const modalDialogClass = window.innerWidth <= 1023 ? 'modal-dialog modal-sm' : 'modal-dialog modal-md';
		return (
			<div className="modal" id="modalBox">
				<div className={modalDialogClass}>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">{i18next.t('MODAL.SUGGESTION_MODAL.TITLE')}</h4>
							<button className="closeModal btn btn-action"
								onClick={() => {
									const element = document.getElementById('modal');
									if (element) ReactDOM.unmountComponentAtNode(element);
								}}>
								<i className="fas fa-times"></i>
							</button>
						</div>
						<div className="modal-body"
							style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
							<div className="lignForm">
								<div>{i18next.t('MODAL.SUGGESTION_MODAL.SERIE')}</div>
								<input type="text" data-exclude={true}
									onChange={(event) => this.setState({ serie: event.target.value })} />
							</div>
							<div className="lignForm">
								<div>{i18next.t('MODAL.SUGGESTION_MODAL.SONGTYPE')}</div>
								<select onChange={(event) => this.setState({ songtype: event.target.value })}>
									{this.state.songtypes.map(type => {
										return <option key={type} value={type}>{type}</option>;
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
							<button disabled={this.state.disabledButton} type="button" className="btn btn-action btn-default ok" onClick={this.confirmModal}>
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
