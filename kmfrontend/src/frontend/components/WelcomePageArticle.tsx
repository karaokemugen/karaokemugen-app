import '../styles/start/WelcomePageArticle.scss';

import DOMPurify from 'dompurify';
import { useCallback, useState } from 'react';

import { News } from '../types/news';

interface IProps {
	article: News;
}

function WelcomePageArticle(props: IProps) {
	const [open, setOpen] = useState(false);
	const [containerHeight, setContainerHeight] = useState(0);
	const [bodyHeight, setBodyHeight] = useState(0);

	// useRef doen't work, see https://stackoverflow.com/a/67906087
	const containerRef = useCallback((node: HTMLDivElement | null) => {
		if (node !== null) {
			setContainerHeight(node.getBoundingClientRect().height);
		}
	}, []);
	const bodyRef = useCallback((node: HTMLDivElement | null) => {
		if (node !== null) {
			setBodyHeight(node.getBoundingClientRect().height);
		}
	}, []);

	const canBeExpanded = () => bodyHeight > containerHeight;

	return (
		<article
			className="article-wrapper"
			data-open={open ? 1 : 0}
			data-type={props.article.type}
			onClick={() => setOpen(!open)}
		>
			<div className="article-header">
				<b>{props.article.title}</b>
				<a href={props.article.link}>{props.article.dateStr}</a>
			</div>
			<div className="article-body" ref={containerRef}>
				<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(props.article.html) }} ref={bodyRef} />
				{!open && canBeExpanded() ? <div className="expandShadow"></div> : ''}
			</div>
		</article>
	);
}

export default WelcomePageArticle;
