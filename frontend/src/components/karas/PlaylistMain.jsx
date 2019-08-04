import React, { Component } from "react";

require('./PlaylistMain.scss');

class PlaylistMain extends Component {

  constructor(props) {
    super(props);
    this.state = {
      currentSide: 1,
      startSwipeX: null,
    };
    this.handleSwipe = this.handleSwipe.bind(this);
    this.handleStart = this.handleStart.bind(this);
  }

  handleSwipe(e) {
    if (this.state.currentSide==1 && e.changedTouches[0].clientX < this.state.startSwipeX - 50) {
      this.setState({currentSide:2});
    } else if (this.state.currentSide==2 && e.changedTouches[0].clientX > this.state.startSwipeX + 50) {
      this.setState({currentSide:1});
    }
  }

  handleStart(e) {
    this.setState({ startSwipeX: e.changedTouches[0].clientX });
  }

  render() {
    return (
      <div className="playlist-main--wrapper">
        <div className="playlist-main" id="playlist" data-side={this.state.currentSide} onTouchEnd={this.handleSwipe} onTouchStart={this.handleStart}>
          {this.props.children.map((node,index) => {
            let i = index+1
            return <div key={index} className="panel" id={"panel"+i} side={i}>{node}</div>
          })}
        </div>
      </div>
    );
  }
}

export default PlaylistMain;