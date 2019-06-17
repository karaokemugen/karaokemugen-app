import React, { Component } from "react";

class Switch extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <label className="switch-ui" htmlFor={this.props.idInput}>
        <input
          checked={this.props.isChecked}
          onChange={this.props.handleChange}
          type="checkbox"
          namecommand={this.props.nameCommand}
          id={this.props.idInput}
        />
        <span class="switch-ui--control"><span></span></span>
        <span class="switch-ui--label">Input label</span>
      </label>
    );
  }
}

export default Switch;