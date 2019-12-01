import React, { Component } from 'react';

require('./KmAppHeaderDecorator.scss');

interface IProps {
	mode: string;
}

class KmAppHeaderDecorator extends Component<IProps, {}> {

	constructor(props:IProps) {
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