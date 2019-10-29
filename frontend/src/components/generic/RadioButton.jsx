import React, { Component } from 'react';
import './RadioButton.scss';

class RadioButton extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div className="radiobutton-ui" data-orientation={this.props.orientation || 'horizontal'}>
				{
					this.props.buttons.map((item,i) => {
						var style = {};
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