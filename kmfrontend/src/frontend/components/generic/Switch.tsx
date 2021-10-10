import './Switch.scss';

import { useRef } from 'react';

interface IProps {
	nameCommand?: string;
	isChecked: boolean | undefined;
	handleChange: (e: any) => void;
	idInput?: string;
	disabled?: boolean;
	onLabel?: string;
	offLabel?: string;
}

function Switch(props: IProps) {
	const checkbox = useRef<HTMLInputElement>();

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
			<span
				data-text-on={props.onLabel ? props.onLabel : 'ON'}
				data-text-off={props.offLabel ? props.offLabel : 'OFF'}
				className="switch-ui--control">
				<span />
			</span>
		</label>
	);
}

export default Switch;
