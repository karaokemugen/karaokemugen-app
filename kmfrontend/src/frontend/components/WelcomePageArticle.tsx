import '../styles/start/WelcomePageArticle.scss';

import DOMPurify from 'dompurify';
import { useState } from 'react';

import { News } from '../types/news';

interface IProps {
	article: News;
}

function WelcomePageArticle(props: IProps) {
	const [open, setOpen] = useState(false);

	return (
		<article
			className="article-wrapper"
			key={Math.random()}
			data-open={open ? 1 : 0}
			data-type={props.article.type}
			onClick={() => setOpen(!open)}
		>
			<div className="article-header">
				<b>{props.article.title}</b>
				<a href={props.article.link}>{props.article.dateStr}</a>
			</div>
			<div className="article-body">
				<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(props.article.html) }} />
			</div>
		</article>
	);
}

export default WelcomePageArticle;
