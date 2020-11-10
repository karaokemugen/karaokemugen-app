import React, { Component, createRef, RefObject } from 'react';

import { View } from '../../types/view';

interface IProps {
	single?: boolean
	top?: string
	bottom?: string
	view?: View;
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

	componentWillReceiveProps(nextProps: IProps) {
		if (nextProps.view !== this.props.view) {
			this.resizeCheck();
		}
	}

	resizeCheck = () => {
		// Calculate empty space for fillSpace cheat.
		// See KMAppBodyDecorator
		this.setState({height: '0px'}, () => {
			const wrapper = this.state.ref.current.getBoundingClientRect();
			this.setState({ height: `${window.innerHeight - wrapper.bottom}px` });
		});
	}

	interval: NodeJS.Timeout

	componentDidMount() {
		this.resizeCheck();
		window.addEventListener('resize', this.resizeCheck);
	}

	componentDidUpdate(prevProps: Readonly<IProps>) {
		if (prevProps.bottom !== this.props.bottom || prevProps.top !== this.props.top) {
			this.resizeCheck();
		}
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.resizeCheck);
	}

	render() {
		return (
			<div className={`KmAppWrapperDecorator${this.props.single ? ' single':''}`}
				 style={{['--top' as any]: this.props.top, ['--bottom' as any]: this.props.bottom, ['--height' as any]: this.state.height}}
				 ref={this.state.ref}>
				{this.props.children}
			</div>
		);
	}
}

export default KmAppWrapperDecorator;
