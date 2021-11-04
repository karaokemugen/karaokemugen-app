import { ReactNode, useEffect, useRef, useState } from 'react';

import { View } from '../../types/view';

interface IProps {
	children?: ReactNode;
	single?: boolean;
	chibi?: boolean;
	top?: string;
	bottom?: string;
	view?: View;
	hmagrin?: boolean;
}

function KmAppWrapperDecorator(props: IProps) {
	return (
		<div
			className={`KmAppWrapperDecorator${props.single ? ' single' : ''}${
				props.hmagrin !== false ? ' hmargin' : ''
			}${props.chibi ? ' chibi' : ''}`}
			style={{ ['--top' as any]: props.top, ['--bottom' as any]: props.bottom }}
		>
			{props.children}
		</div>
	);
}

export default KmAppWrapperDecorator;
