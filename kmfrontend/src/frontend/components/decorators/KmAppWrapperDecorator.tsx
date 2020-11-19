import React, { Component, createRef, RefObject } from 'react';

import { is_touch_device } from '../../../utils/tools';
import { View } from '../../types/view';

interface IProps {
	single?: boolean
	chibi?: boolean
	top?: string
	bottom?: string
	view?: View;
	hmagrin?: boolean
}

interface IState {
	height: string
	ref: RefObject<HTMLDivElement>
}

class KmAppWrapperDecorator extends Component<IProps, IState> {
	constructor(props) {
		super(props);
		this.state = {
			height: '0',
			ref: createRef()
		};
	}

	resizeCheck = () => {
		// Calculate empty space for fillSpace cheat.
		// Virtual lists doesn't expand automatically, or more than needed, so the height is forced by JS calculations
		// using getBoundingClientRect
		this.setState({height: '0px'}, () => {
			const wrapper = this.state.ref.current.getBoundingClientRect();
			console.log(window.innerHeight, wrapper);
			this.setState({ height: `${window.innerHeight - wrapper.bottom}px` });
		});
	}

	componentDidMount() {
		this.resizeCheck();
		window.addEventListener('resize', this.resizeCheck);
		if (this.props.single && !is_touch_device()) {
			document.getElementsByTagName('body')[0].setAttribute('class', 'forceScroll');
		}
	}

	componentDidUpdate(prevProps: Readonly<IProps>) {
		if (prevProps.bottom !== this.props.bottom || prevProps.top !== this.props.top) {
			this.resizeCheck();
		}
		if (prevProps.view !== this.props.view) {
			setTimeout(this.resizeCheck, 0);
		}
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.resizeCheck);
		document.getElementsByTagName('body')[0].setAttribute('class', '');
	}

	render() {
		return (
			<div className={`KmAppWrapperDecorator${this.props.single ? ' single':''}${this.props.hmagrin !== false ? ' hmargin':''}
			${this.props.chibi ? ' chibi':''}`}
				 style={{['--top' as any]: this.props.top, ['--bottom' as any]: this.props.bottom, ['--height' as any]: this.state.height}}
				 ref={this.state.ref}>
				{this.props.children}
			</div>
		);
	}
}

export default KmAppWrapperDecorator;
