import React, { Component } from "react";

class Switch extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <label className="cmp-switch" htmlFor={this.props.idInput}>
        <input
          checked={this.props.isChecked}
          onChange={this.props.handleChange}
          className="switch"
          type="checkbox"
          namecommand={this.props.nameCommand}
          id={this.props.idInput}
        />
        <div arial-label={this.props.nameCommand}><span>{this.props.nameCommand}</span></div>
      </label>
    );
  }
}

export default Switch;