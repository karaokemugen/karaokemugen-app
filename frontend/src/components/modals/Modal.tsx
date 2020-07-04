import React, { Component } from 'react';
import ReactDOM from 'react-dom';

interface IProps {
	placeholder?: string;
	type: string;
	title: string;
	message: any;
	forceSmall: boolean | undefined;
	callback: (param?: boolean | string) => void;
}

interface IState {
	promptText: string | undefined;
}

class Modal extends Component<IProps, IState> {
	constructor(props: IProps) {
		super(props);
		this.state = {
			promptText: this.props.placeholder
		};
	}

	confirmModal = () => {
		if (typeof this.props.callback != 'undefined') {
			if (this.props.type === 'confirm') {
				this.props.callback(true);
			} else if (this.props.type === 'prompt') {
				this.props.callback(this.state.promptText);
			} else {
				this.props.callback();
			}
		}
		const element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
	};

	abortModal = () => {
		const element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
	};


	keyObserverHandler = (e: KeyboardEvent) => {
		if (e.code === 'Enter') {
			this.confirmModal();
		}
		if (e.code === 'Escape') {
			this.abortModal();
		}
	}

	componentDidMount() {
		document.addEventListener('keyup', this.keyObserverHandler);
	}

	componentWillUnmount() {
		document.removeEventListener('keyup', this.keyObserverHandler);
	}

	render() {
		const modalDialogClass = window.innerWidth <= 1023 || this.props.forceSmall ? 'modal-dialog modal-sm' : 'modal-dialog modal-md';
		return (
			<div className="modal" id="modalBox">
				<div className={modalDialogClass}>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">{this.props.title}</h4>
						</div>
						{this.props.type === 'prompt' || (this.props.message && this.props.message !== '') ?
							<div className="modal-body">
								<div className="modal-message">{this.props.message}</div>
								{this.props.type === 'prompt' ?
									<div className="form">
										<input type="text" autoFocus className="modal-input form-control" defaultValue={this.state.promptText}
											onChange={(event) => this.setState({ promptText: event.target.value })} />
									</div> : null
								}
							</div> : null
						}
						<div className="modal-footer">
							{this.props.type === 'confirm' || this.props.type === 'prompt' ?
								<button type="button" className="btn btn-action btn-primary other" onClick={this.abortModal}>
									<i className="fas fa-times"></i>
								</button> : null
							}
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

export default Modal;
