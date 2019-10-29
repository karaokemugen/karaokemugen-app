import React, { Component } from 'react';

require('./KmAppBodyDecorator.scss');

class KmAppBodyDecorator extends Component {

	constructor(props) {
		super(props);
		this.state = {};
	}

	render() {
		return (
			<div className={'KmAppBodyDecorator ' + this.props.extraClass} data-mode={this.props.mode} >
				{this.props.children}
			</div>
		);
	}
}

export default KmAppBodyDecorator;