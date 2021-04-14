import React, { Component } from 'react';

interface IProps {
	extraClass: string;
	mode: number | string | undefined;
	onResize?(height: number): void;
}
class KmAppBodyDecorator extends Component<IProps, unknown> {
	render() {
		return (
			<div className={'KmAppBodyDecorator ' + this.props.extraClass} data-mode={this.props.mode}>
				{this.props.children}
			</div>
		);
	}
}

export default KmAppBodyDecorator;
