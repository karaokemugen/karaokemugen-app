import React, { Component } from 'react';

require('./PlaylistMainDecorator.scss');

class PlaylistMainDecorator extends Component {

  render() {
  	return (
  		<div className="PlaylistMainDecorator">
  			<div className="playlist-main" id="playlist" data-side={this.props.currentSide}>
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
