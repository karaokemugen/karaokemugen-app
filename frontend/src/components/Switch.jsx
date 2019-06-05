import React, { Component } from "react";

class Switch extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <label>
        <input
          checked={this.props.isChecked}
          onChange={this.props.handleChange}
          className="switch"
          type="checkbox"
          namecommand={this.props.nameCommand}
          id={this.props.idInput}
        />
        <div><div/>
        </div>
      </label>
    );
  }
}

export default Switch;