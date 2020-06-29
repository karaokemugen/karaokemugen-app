import React, { Component } from 'react';

require('./KmAppBodyDecorator.scss');

interface IProps {
	extraClass: string;
	mode: number | string | undefined;
}

class KmAppBodyDecorator extends Component<IProps, unknown> {

	constructor(props:IProps) {
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