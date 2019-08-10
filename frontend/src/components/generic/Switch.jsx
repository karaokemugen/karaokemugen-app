import React, { Component } from "react";
import './Switch.scss';

class Switch extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <label className="switch-ui">
        <input
          checked={this.props.isChecked}
          onChange={this.props.handleChange}
          type="checkbox"
          namecommand={this.props.nameCommand}
          id={this.props.idInput}
        />
        <span className="switch-ui--control"><span></span></span>
      </label>
    );
  }
}

export default Switch;