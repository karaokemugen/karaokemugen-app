import React, { Component } from 'react';
import { News } from '../types/news';

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
		<p className="new-header">
			<b>{this.props.article.title}</b>
			<a href={this.props.article.link} target="_blank">
				{this.props.article.dateStr}
			</a>
		</p>
		<p dangerouslySetInnerHTML={{ __html: this.props.article.html }} />
	</li>
  	);
  }
}

export default WelcomePageArticle;
