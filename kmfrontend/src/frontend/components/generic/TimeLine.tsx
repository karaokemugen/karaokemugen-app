import './TimeLine.scss';

interface IProps {
	nodes?: { title: string; dataIndex: string }[];
	status?: string;
}

function Timeline(props: IProps) {
	const actualNode = props.nodes.find(x => x.dataIndex === props.status);
	const actualNodeIndex = actualNode && props.nodes.indexOf(actualNode);
	return (
		<div className="container">
			{props.nodes.map((node, i) => (
				<div className="wrapper-timeline" key={node.dataIndex}>
					{i !== 0 && <div className={`line ${i <= actualNodeIndex ? `line-solid` : `line-dotted`}`} />}
					<div className="node-timeline-container">
						<div className="title-timeline">{node.title}</div>
						<div className="node-timeline">
							{i <= actualNodeIndex && (
								<div className={i === actualNodeIndex ? 'circle animate' : 'circle'} />
							)}
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

export default Timeline;
