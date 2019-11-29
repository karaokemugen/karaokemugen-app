import React, { Component } from 'react';

require('./KmAppHeaderDecorator.scss');

class KmAppHeaderDecorator extends Component {

	constructor(props) {
		super(props);
		this.state = {};
	}

	render() {
		return (
			<div className="KmAppHeaderDecorator" data-mode={this.props.mode} >
				{this.props.children}
			</div>
		);
	}
}

export default KmAppHeaderDecorator;