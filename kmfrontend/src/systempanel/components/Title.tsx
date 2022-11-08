import { Layout } from 'antd';
import TasksEvent from '../../TasksEvent';

interface Props {
	title: string;
	description: string;
}

export default function Title(props: Props) {
	return (
		<Layout.Header>
			<div style={{ display: 'flex', justifyContent: 'space-between' }}>
				<div>
					<div className="title">{props.title}</div>
					<div className="description">{props.description}</div>
				</div>
				<TasksEvent limit={3} styleTask="system-tasks-wrapper" />
			</div>
		</Layout.Header>
	);
}
