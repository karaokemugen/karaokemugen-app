import './RadioButton.scss';

import React, { Component } from 'react';


interface IProps {
	orientation?: string;
	buttons: any;
	title: string;
}


class RadioButton extends Component<IProps, unknown> {
	constructor(props:IProps) {
		super(props);
	}

	render() {
		return (
			<div className="radiobutton-ui" data-orientation={this.props.orientation || 'horizontal'}>
				{
					this.props.buttons.map((item:any,i:number) => {
						const style:any = {};
						if(item.active && item.activeColor)
							style.backgroundColor = item.activeColor;
						return (
							<button
								title={this.props.title}
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