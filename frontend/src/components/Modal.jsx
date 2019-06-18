import React, { Component } from "react";

class Modal extends Component {
	constructor(props) {
		super(props)
		this.state = {
		}
	}

	render() {
		return (
			<div className="modal-dialog modal-sm">
				<div className="modal-content">
					<div className="modal-header">
						<h4 className="modal-title"></h4>
					</div>
					<div className="modal-body">
						<div className="modal-message">

						</div>
						<div className="form">
							<input type="text" className="form-control" id="modalInput" name="modalInput" />
						</div>
					</div>
					<div className="modal-footer">
						<button type="button" className="btn btn-action btn-primary other" data-dismiss="modal">
							<i className="glyphicon glyphicon-remove"></i>
						</button>
						<button type="button" className="btn btn-action btn-default ok" data-dismiss="modal">
							<i className="glyphicon glyphicon-ok"></i>
						</button>
					</div>
				</div>
			</div>
		)
	}
}

export default Modal
