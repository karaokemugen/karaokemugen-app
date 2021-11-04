import { ReactNode, ReactNodeArray, useEffect, useRef, useState } from 'react';

import { View } from '../../types/view';

interface IProps {
	children?: ReactNodeArray | ReactNode;
	single?: boolean;
	chibi?: boolean;
	top?: string;
	bottom?: string;
	view?: View;
	hmagrin?: boolean;
}

function KmAppWrapperDecorator(props: IProps) {
	const [height, setHeight] = useState('0');
	const ref = useRef<HTMLDivElement>();

	const resizeCheck = () => {
		// Calculate empty space for fillSpace cheat.
		// Virtual lists doesn't expand automatically, or more than needed, so the height is forced by JS calculations
		// using getBoundingClientRect
		if (ref?.current) {
			setHeight('0px');
			const wrapper = ref?.current?.getBoundingClientRect();
			setHeight(`${window.innerHeight - wrapper.bottom}px`);
		}
	};

	useEffect(() => {
		setTimeout(resizeCheck, 0);
	}, [props.bottom, props.top]);

	useEffect(() => {
		setTimeout(resizeCheck, 0);
	}, [props.view]);

	useEffect(() => {
		resizeCheck();
		window.addEventListener('resize', resizeCheck);
		return () => {
			window.removeEventListener('resize', resizeCheck);
			document.getElementsByTagName('body')[0].setAttribute('class', '');
		};
	}, []);

	return (
		<div
			className={`KmAppWrapperDecorator${props.single ? ' single' : ''}${
				props.hmagrin !== false ? ' hmargin' : ''
			}${props.chibi ? ' chibi' : ''}`}
			style={{ ['--top' as any]: props.top, ['--bottom' as any]: props.bottom, ['--height' as any]: height }}
			ref={ref}
		>
			{props.children}
		</div>
	);
}

export default KmAppWrapperDecorator;
