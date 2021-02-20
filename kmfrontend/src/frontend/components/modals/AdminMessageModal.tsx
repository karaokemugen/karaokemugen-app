import './AdminMessageModal.scss';

import i18next from 'i18next';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { commandBackend } from '../../../utils/socket';

interface IState {
	duration: number;
	message: string;
	destination: string;
}

class AdminMessageModal extends Component<unknown, IState> {
	constructor(props: unknown) {
		super(props);
		this.state = {
			duration: 5000,
			message: '',
			destination: 'screen'
		};
	}

	onClick = () => {
		if (this.state.message.length === 0) {
			return;
		}
		const defaultDuration = 5000; // 5 seconds
		const msgData = {
			message: this.state.message,
			destination: this.state.destination,
			duration:
				!this.state.duration || isNaN(this.state.duration)
					? defaultDuration
					: this.state.duration
		};
		commandBackend('displayPlayerMessage', msgData);
		const element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
	};

	keyObserverHandler = (e: KeyboardEvent) => {
		if (e.code === 'Enter') {
			this.onClick();
		}
		if (e.code === 'Escape') {
			const element = document.getElementById('modal');
			if (element) ReactDOM.unmountComponentAtNode(element);
		}
	}

	componentDidMount() {
		document.addEventListener('keyup', this.keyObserverHandler);
	}

	componentWillUnmount() {
		document.removeEventListener('keyup', this.keyObserverHandler);
	}

	render() {
		return (
			<div className="modal modalPage">
				<div className="modal-dialog">
					<div className="modal-content">
						<ul className="modal-header">
							<h4 className="modal-title">{i18next.t('ESSENTIAL_MESSAGE')}</h4>
							<button className="closeModal"
								onClick={() => {
									const element = document.getElementById('modal');
									if (element) ReactDOM.unmountComponentAtNode(element);
								}}>
								<i className="fas fa-times" />
							</button>
						</ul>
						<div className="modal-body admin-message">
							<div className="dest-duration">
								<select name="destination" onChange={(e => this.setState({ destination: e.target.value }))}>
									<option value="screen">{i18next.t('ADMIN_MESSAGE.CL_SCREEN')}</option>
									<option value="users">{i18next.t('ADMIN_MESSAGE.CL_USERS')}</option>
									<option value="all">{i18next.t('ADMIN_MESSAGE.CL_ALL')}</option>
								</select>
								<input type="number" data-exclude="true" min="0" className="duration" placeholder={i18next.t('ADMIN_MESSAGE.DURATION')} onChange={e => this.setState({ duration: Number(e.target.value) * 1000 })} />
							</div>
							<input type="text" className="message" placeholder={i18next.t('ADMIN_MESSAGE.MESSAGE')} onChange={e => this.setState({ message: e.target.value })} />
							<button className="btn btn-default confirm" onClick={this.onClick}>
								{this.state.message.length === 0 ? <i className="fas fa-fw fa-exclamation-triangle" />
									:<i className="fas fa-check" />}
								&nbsp;{this.state.message.length === 0 ? i18next.t('ADMIN_MESSAGE.EMPTY'):i18next.t('ADMIN_MESSAGE.CONFIRM')}
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

export default AdminMessageModal;
