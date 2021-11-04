import { ReactNode, useEffect, useRef, useState } from 'react';

interface IProps {
	children?: ReactNode;
	extraClass?: string;
	mode: number | string | undefined;
}

function KmAppBodyDecorator(props: IProps) {
	return (
		<div className={`KmAppBodyDecorator${props.extraClass ? ` ${props.extraClass}`:''}`} data-mode={props.mode}>
			{props.children}
		</div>
	);
}

export default KmAppBodyDecorator;
