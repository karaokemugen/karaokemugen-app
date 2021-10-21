import './RadioButton.scss';

interface Button {
	activeColor: string;
	active: boolean;
	onClick: () => void;
	label: string;
	description?: string;
}

interface IProps {
	orientation?: string;
	buttons: Button[];
}

function RadioButton(props: IProps) {
	return (
		<div className="radiobutton-ui" data-orientation={props.orientation || 'horizontal'}>
			{props.buttons.map((item: Button, i: number) => {
				const style: any = {};
				if (item.active && item.activeColor) style.backgroundColor = item.activeColor;
				return (
					<button
						title={item.description}
						key={i}
						type="button"
						className={item.active ? 'active' : ''}
						style={style}
						onClick={item.onClick}
					>
						{item.label}
					</button>
				);
			})}
		</div>
	);
}

export default RadioButton;
