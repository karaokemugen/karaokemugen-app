import React, { Component } from "react";
import ReactDOM from "react-dom";

class Modal extends Component {
	constructor(props) {
		super(props)
		this.confirmModal = this.confirmModal.bind(this);
		this.abortModal = this.abortModal.bind(this);
		this.state = {
			promptText: this.props.placeholder
		}
	}

	confirmModal() {
		if (typeof this.props.callback != 'undefined') {
			if (this.props.type === 'confirm') {
				this.props.callback(true);
			} else if (this.props.type === 'prompt') {
				this.props.callback(this.state.promptText);
			} else if (this.props.type === 'custom') {
				var data = {};
				$('#modalBox').find('.modal-body').find('input[type="checkbox"]:checked, input[type!="checkbox"], select').map(function (k, v) {
					if (!data[v.name]) {
						data[v.name] = $(v).val();
					} else {
						data[v.name] += ',' + $(v).val();
					}
				});
				this.props.callback(data);
			} else {
				this.props.callback();
			}
		}
		ReactDOM.unmountComponentAtNode(document.getElementById('modal'));
	}

	abortModal() {
		ReactDOM.unmountComponentAtNode(document.getElementById('modal'));
	}


	keyObserverHandler(e) {
		var keyCode = e.keyCode || e.which;
			if (keyCode == '13') {
				this.confirmModal();
			}
			if (keyCode == '27') {
				this.abortModal();
			}
	}

	componentDidMount() {
		document.addEventListener('keyup', this.keyObserverHandler.bind(this));
	}

	componentWillUnmount() {
		document.removeEventListener('keyup', this.keyObserverHandler.bind(this));
	}

	render() {
		var modalDialogClass = window.innerWidth < 1025 ? "modal-dialog modal-sm" : "modal-dialog modal-md";
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
										<input type="text" className="form-control" id="modalInput" name="modalInput" 
											defaultValue={this.state.promptText} onChange={(event) => this.setState({ promptText: event.target.value })} />
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
		)
	}
}

export default Modal
