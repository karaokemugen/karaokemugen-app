import React, { Component } from 'react';
import store from '../../store';

require('./PlaylistMainDecorator.scss');

class PlaylistMainDecorator extends Component {
	constructor(props) {
		super(props);
		this.state = {
			currentSide: 1,
			startSwipeX: null,
		};
	}

  handleSwipe = e => {
  	if (this.state.currentSide==1 && e.changedTouches[0].clientX < this.state.startSwipeX - 100) {
  		this.setState({currentSide:2});
  		store.getTuto() && console.log(store.getTuto(), store.getTuto().getStepLabel());
  		if(store.getTuto() && store.getTuto().getStepLabel() === 'change_screen') {
  			store.getTuto().move(1);
  		}
  	} else if (this.state.currentSide==2 && e.changedTouches[0].clientX > this.state.startSwipeX + 100) {
  		this.setState({currentSide:1});
  		if(store.getTuto() && store.getTuto().getStepLabel() === 'change_screen2') {
  			store.getTuto().move(1);
  		}
  	}
  };

  handleStart = e => {
  	this.setState({ startSwipeX: e.changedTouches[0].clientX });
  };

  render() {
  	return (
  		<div className="PlaylistMainDecorator">
  			<div className="playlist-main" id="playlist" data-side={this.state.currentSide} onTouchEnd={this.handleSwipe} onTouchStart={this.handleStart}>
  				{this.props.children.map((node,index) => {
  					let i = index+1;
  					return <div key={index} className="panel" id={'panel'+i} side={i}>{node}</div>;
  				})}
  			</div>
  		</div>
  	);
  }
}

export default PlaylistMainDecorator;