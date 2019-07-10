import React, { Component } from "react";

class NewsArticle extends Component {
    constructor(props) {
        super(props)
        this.state = {
          open: false
        }
    }

    render() {
        return (
            <li className={this.state.open ? "new open" : "new"} 
              type={this.props.new.type} onClick={() => this.setState({open:!this.state.open})}>
            <p className="new-header">
              <b>{this.props.new.title}</b>
              <a href={this.props.new.link} target="_blank">
                {this.props.new.dateStr}
              </a>
            </p>
            <p dangerouslySetInnerHTML={{__html: this.props.new.html}}></p>
          </li>
        )
    }
}

export default NewsArticle;
