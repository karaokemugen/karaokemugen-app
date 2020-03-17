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
		return (
			<article
				className="article-wrapper"
				key={Math.random()}
				data-open={this.state.open ? 1:0}
				data-type={this.props.article.type}
				onClick={() =>
					this.setState({ open: !this.state.open })
				}
				>
				<div className="article-header">
					<b>{this.props.article.title}</b>
					<a href={this.props.article.link}>
						{this.props.article.dateStr}
					</a>
				</div>
				<div className="article-body">
					<div dangerouslySetInnerHTML={{ __html: this.props.article.html }} />
				</div>
			</article>
		);
	}

}

export default WelcomePageArticle;
