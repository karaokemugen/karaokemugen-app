import React, { Component } from 'react';

require('./KmAppWrapperDecorator.scss');

class KmAppWrapperDecorator extends Component<unknown, unknown> {

	constructor(props:any) {
		super(props);
		this.state = {};
	}

	render() {
		return (
			<div className="KmAppWrapperDecorator">
				{this.props.children}
			</div>
		);
	}
}

export default KmAppWrapperDecorator;