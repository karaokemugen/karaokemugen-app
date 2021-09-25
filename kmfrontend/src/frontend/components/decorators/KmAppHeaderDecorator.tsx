import React, { ReactNode,ReactNodeArray } from 'react';

interface IProps {
	children?: ReactNodeArray | ReactNode;
	mode: string;
}

function KmAppHeaderDecorator(props: IProps) {

	return (
		<div className="KmAppHeaderDecorator" data-mode={props.mode} >
			{props.children}
		</div>
	);
}

export default KmAppHeaderDecorator;
