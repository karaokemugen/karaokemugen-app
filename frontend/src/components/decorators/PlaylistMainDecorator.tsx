import { ReactNodeArray } from 'prop-types';
import React, { Component } from 'react';

require('./PlaylistMainDecorator.scss');

interface IProps {
	currentSide: number;
}

class PlaylistMainDecorator extends Component<IProps, unknown> {

	render() {
		return (
			<div className="PlaylistMainDecorator">
				<div className="playlist-main" id="playlist" data-side={this.props.currentSide}>
					{(this.props.children as ReactNodeArray).map((node: any, index: number) => {
						const i = index + 1;
						return <div key={index} className="panel" id={'panel' + i}>{node}</div>;
					})}
				</div>
			</div>
		);
	}
}

export default PlaylistMainDecorator;