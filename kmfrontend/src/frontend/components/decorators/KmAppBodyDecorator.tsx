import React, { ReactNode,ReactNodeArray } from 'react';

interface IProps {
	children?: ReactNodeArray | ReactNode;
	extraClass: string;
	mode: number | string | undefined;
	onResize?(height: number): void;
}

function KmAppBodyDecorator(props: IProps) {
	return (
		<div className={'KmAppBodyDecorator ' + props.extraClass} data-mode={props.mode}>
			{props.children}
		</div>
	);
}

export default KmAppBodyDecorator;
