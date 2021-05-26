import './Switch.scss';

import React, { Component } from 'react';

interface IProps {
	nameCommand?: string;
	isChecked: boolean | undefined;
	handleChange: (e:any) => void;
	idInput?: string;
	disabled?: boolean
}

class Switch extends Component<IProps, unknown> {

	private checkbox = React.createRef<HTMLInputElement>();

	onKeyPress = (e) => {
		e.preventDefault();
		this.checkbox.current.click();
	}

	render() {
		return (
			<label className="switch-ui" tabIndex={0} onKeyPress={this.onKeyPress}>
				<input
					checked={this.props.isChecked}
					onChange={this.props.handleChange}
					type="checkbox"
					data-namecommand={this.props.nameCommand}
					id={this.props.idInput}
					ref={this.checkbox}
					disabled={this.props.disabled}
				/>
				<span className="switch-ui--control"><span/></span>
			</label>
		);
	}
}

export default Switch;
