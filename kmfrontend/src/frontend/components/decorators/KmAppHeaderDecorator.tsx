import React, { Component } from 'react';

interface IProps {
	mode: string;
}

class KmAppHeaderDecorator extends Component<IProps, unknown> {

	render() {
		return (
			<div className="KmAppHeaderDecorator" data-mode={this.props.mode} >
				{this.props.children}
			</div>
		);
	}
}

export default KmAppHeaderDecorator;
