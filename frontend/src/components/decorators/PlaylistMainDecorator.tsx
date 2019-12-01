import React, { Component } from 'react';
import store from '../../store';
import { ReactNodeArray } from 'prop-types';

require('./PlaylistMainDecorator.scss');

interface IState {
	startSwipeX: number;
	currentSide: number;
}

class PlaylistMainDecorator extends Component<{},IState> {
	constructor(props:any) {
		super(props);
		this.state = {
			currentSide: 1,
			startSwipeX: 0,
		};
	}

  handleSwipe = (e: any) => {
  	if (this.state.currentSide==1 && e.changedTouches[0].clientX < this.state.startSwipeX - 100) {
  		this.setState({currentSide:2});
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

  handleStart = (e: any) => {
  	this.setState({ startSwipeX: e.changedTouches[0].clientX });
  };

  render() {
  	return (
  		<div className="PlaylistMainDecorator">
  			<div className="playlist-main" id="playlist" data-side={this.state.currentSide} onTouchEnd={this.handleSwipe} onTouchStart={this.handleStart}>
  				{(this.props.children as ReactNodeArray).map((node:any,index:number) => {
  					let i = index+1;
  					return <div key={index} className="panel" id={'panel'+i}>{node}</div>;
  				})}
  			</div>
  		</div>
  	);
  }
}

export default PlaylistMainDecorator;