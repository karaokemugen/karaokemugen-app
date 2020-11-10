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
		const defaultDuration = 5000;
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
							<button className="closeModal btn btn-action"
								onClick={() => {
									const element = document.getElementById('modal');
									if (element) ReactDOM.unmountComponentAtNode(element);
								}}>
								<i className="fas fa-times"></i>
							</button>
						</ul>
						<div className="modal-body">
							<select name="destination" onChange={(e => this.setState({ destination: e.target.value }))}>
								<option value="screen">{i18next.t('CL_SCREEN')}</option>
								<option value="users">{i18next.t('CL_USERS')}</option>
								<option value="all">{i18next.t('CL_ALL')}</option>
							</select>
							<input type="text" placeholder="5000 (ms)" onChange={e => this.setState({ duration: Number(e.target.value) })} />
							<input type="text" placeholder="Message" className="form-control" onChange={e => this.setState({ message: e.target.value })} />
							<button className="btn btn-default confirm" onClick={this.onClick}>
								<i className="fas fa-check"></i>
							</button>
						</div >
					</div >
				</div >
			</div >
		);
	}
}

export default AdminMessageModal;
