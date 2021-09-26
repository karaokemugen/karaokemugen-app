import './Switch.scss';

import React from 'react';

interface IProps {
	nameCommand?: string;
	isChecked: boolean | undefined;
	handleChange: (e:any) => void;
	idInput?: string;
	disabled?: boolean
}

function Switch(props:IProps) {

	const checkbox = React.createRef<HTMLInputElement>();

	const onKeyPress = (e) => {
		e.preventDefault();
		checkbox.current.click();
	};

	return (
		<label className="switch-ui" tabIndex={0} onKeyPress={onKeyPress}>
			<input
				checked={props.isChecked}
				onChange={props.handleChange}
				type="checkbox"
				data-namecommand={props.nameCommand}
				id={props.idInput}
				ref={checkbox}
				disabled={props.disabled}
			/>
			<span className="switch-ui--control"><span/></span>
		</label>
	);
}

export default Switch;
