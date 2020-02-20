import React, { Component } from 'react';
import { News } from '../types/news';
require ('../styles/welcome/WelcomePageArticle.scss');

interface IProps {
	article: News;
}

interface IState {
	open: boolean;
}
class WelcomePageArticle extends Component<IProps, IState> {
	constructor(props:IProps) {
		super(props);
		this.state = {
			open: false
		};
	}


  render() {
  	return (<li
		key={Math.random()}
		className={this.state.open ? 'new open' : 'new'}
		data-type={this.props.article.type}
		onClick={() =>
			this.setState({ open: !this.state.open })
		}
	>
		<div className="new-header">
			<b>{this.props.article.title}</b>
			<a href={this.props.article.link}>
				{this.props.article.dateStr}
			</a>
		</div>
		<div dangerouslySetInnerHTML={{ __html: this.props.article.html }} />
	</li>
  	);
  }
}

export default WelcomePageArticle;
