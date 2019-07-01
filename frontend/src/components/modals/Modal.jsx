import React, { Component } from "react";

class Modal extends Component {
	constructor(props) {
		super(props)
		this.confirmModal = this.confirmModal.bind(this);
		this.abortModal = this.abortModal.bind(this);
	}

	confirmModal() {
		if(typeof this.props.callback != 'undefined') {
			if(this.props.type === 'confirm') {
				this.props.callback(true);
			}else if (this.props.type === 'prompt') {
				this.props.callback(this.props.placeholder);
			} else if (this.props.type === 'custom') {
				var data = {};
				$('#modalBox').find('.modal-body').find('input[type="checkbox"]:checked, input[type!="checkbox"], select').map(function(k, v){
					if(!data[v.name]) {
						data[v.name] =  $(v).val();
					} else {
						data[v.name] += ',' + $(v).val();
					}
				});
				this.props.callback(data);
			}else {
				this.props.callback();
			}
		}
	}

	abortModal() {
		if(typeof this.props.callback != 'undefined' && this.props.type === 'confirm') {
			this.props.callback(false);
		}
	}
	
	render() {
		return (
			<div className="modal-dialog modal-sm">
				<div className="modal-content">
					<div className="modal-header">
						<h4 className="modal-title" dangerouslySetInnerHTML={{ __html: this.props.title}}></h4>
					</div>
					{this.props.type === 'prompt' || (this.props.message && this.props.message !== '') ?
						<div className="modal-body">
							<div className="modal-message" dangerouslySetInnerHTML={{ __html: this.props.message}}></div>
							{this.props.type === 'prompt' ?
								<div className="form">
									<input type="text" className="form-control" id="modalInput" name="modalInput" defaultValue={this.props.placeholder}/>
								</div> : null
							}
						</div> : null
					}
					<div className="modal-footer">
						{this.props.type === 'confirm' || this.props.type === 'prompt' ?
							<button type="button" className="btn btn-action btn-primary other" data-dismiss="modal" onClick={this.abortModal}>
								<i className="glyphicon glyphicon-remove"></i>
							</button> : null
						}
						<button type="button" className="btn btn-action btn-default ok" data-dismiss="modal" onClick={this.confirmModal}>
							<i className="glyphicon glyphicon-ok"></i>
						</button>
					</div>
				</div>
			</div>
		)
	}
}

export default Modal
