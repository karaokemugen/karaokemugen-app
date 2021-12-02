import { ReactNode, useEffect, useState } from 'react';

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

	const [barOffset, setBarOffset] = useState('0');

	const listener = () => {
		const vhHeight = parseInt(window.getComputedStyle(document.getElementById('height-compute')).height);
		setBarOffset(`${vhHeight - Math.floor(visualViewport.height)}px`);
	};

	useEffect(() => {
		listener();
		visualViewport.addEventListener('resize', listener, { passive: true });
		return () => {
			visualViewport.removeEventListener('resize', listener);
		};
	}, []);

	return (
		<div
			className={`KmAppWrapperDecorator${props.single ? ' single' : ''}${
				props.hmagrin !== false ? ' hmargin' : ''
			}${props.chibi ? ' chibi' : ''}`}
			style={{ ['--top' as any]: props.top, ['--bar-offset' as any]: barOffset, ['--bottom' as any]: props.bottom }}
		>
			{props.children}
		</div>
	);
}

export default KmAppWrapperDecorator;
