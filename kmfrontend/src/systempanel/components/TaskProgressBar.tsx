import '../../TasksEvent.scss';

import i18next from 'i18next';
import { useEffect, useState } from 'react';

import { Progress } from 'antd';
import { ProgressType } from 'antd/lib/progress/progress';
import { TaskItem } from '../../../../src/lib/types/taskItem';
import { getSocket } from '../../utils/socket';

interface IProps {
	taskUuid?: string;
	taskTextTypes?: string[];
	styleType?: ProgressType;
	showText?: boolean;
}

function TaskProgress(props: IProps) {
	const [task, setTask] = useState<TaskItem>();
	const [i, setI] = useState(0);

	const updateTasks = (tasks: TaskItem[]) => {
		const foundTask = tasks.find(t => t.uuid === props.taskUuid || props.taskTextTypes?.includes(t.text));
		if (foundTask) {
			foundTask.time = new Date().getTime();
			setTask(foundTask);
		} else if (!task) setTask({ text: '', percentage: 0, data: '', subtext: '' });
	};

	useEffect(() => {
		getSocket().on('tasksUpdated', updateTasks);
		setInterval(() => setI(i + 1), 1000);
		return () => {
			getSocket().off('tasksUpdated', updateTasks);
		};
	}, []);

	return (
		task && (
			<>
				<blockquote>
					{props.showText && (
						<>
							<p className="text">
								{task.text && i18next.t(`TASKS.${task.text}`) !== `TASKS.${task.text}`
									? i18next.t(`TASKS.${task.text}`, { data: task.data })
									: task.text}
							</p>
							<p className="subtext" style={{ fontSize: '0.8em', opacity: '0.8' }}>
								{task.subtext && i18next.t(`TASKS.${task.subtext}`) !== `TASKS.${task.subtext}`
									? i18next.t(`TASKS.${task.subtext}`)
									: task.subtext}
							</p>
						</>
					)}
					<Progress percent={task.percentage} type={props.styleType || 'line'} />
				</blockquote>
			</>
		)
	);
}

export default TaskProgress;
