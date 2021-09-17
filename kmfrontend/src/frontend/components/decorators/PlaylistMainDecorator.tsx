import { ReactNodeArray } from 'prop-types';
import React from 'react';

interface IProps {
	children: ReactNodeArray;
}

export default function PlaylistMainDecorator(props: IProps) {
	return (
		<div className="PlaylistMainDecorator">
			<div className="playlist-main" id="playlist">
				{props.children.map ? props.children.map((node: any, index: number) => {
					const i = index + 1;
					return <div key={index} className="panel" id={'panel' + i}>{node}</div>;
				}) : <div key={1} className="panel" id='panel1'>{props.children}</div>
				}
			</div>
		</div>
	);
}
