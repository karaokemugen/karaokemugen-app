import './RadioButton.scss';

import React, { Component } from 'react';

interface Button {
	activeColor: string,
	active: boolean,
	onClick: () => void,
	label: string,
	description: string
}

interface IProps {
	orientation?: string;
	buttons: Button[];
	title: string;
}

class RadioButton extends Component<IProps, unknown> {

	render() {
		return (
			<div className="radiobutton-ui" data-orientation={this.props.orientation || 'horizontal'}>
				{
					this.props.buttons.map((item:Button,i:number) => {
						const style:any = {};
						if(item.active && item.activeColor)
							style.backgroundColor = item.activeColor;
						return (
							<button
								title={item.description}
								key={i}
								type="button"
								className={item.active ? 'active':''}
								style={style}
								onClick={item.onClick}
							>
								{item.label}
							</button>
						);
					})
				}
			</div>
		);
	}
}

export default RadioButton;
