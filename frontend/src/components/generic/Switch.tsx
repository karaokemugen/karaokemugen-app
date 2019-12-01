import React, { Component } from 'react';
import './Switch.scss';

interface IProps {
	nameCommand?: string;
	isChecked: boolean | undefined;
	handleChange: (e:any) => void;
	idInput?: string;
}

class Switch extends Component<IProps, {}> {
	constructor(props:IProps) {
		super(props);
	}

	render() {
		return (
			<label className="switch-ui">
				<input
					checked={this.props.isChecked}
					onChange={this.props.handleChange}
					type="checkbox"
					data-namecommand={this.props.nameCommand}
					id={this.props.idInput}
				/>
				<span className="switch-ui--control"><span></span></span>
			</label>
		);
	}
}

export default Switch;