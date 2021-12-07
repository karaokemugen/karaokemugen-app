import './TasksEvent.scss';

import i18next from 'i18next';
import { useEffect, useState } from 'react';

import { TaskItem } from '../../src/lib/types/taskItem';
import { getSocket } from './utils/socket';

interface IProps {
	limit: number;
	isWelcomePage?: boolean;
}

function TasksEvent(props: IProps) {
	const [tasks, setTasks] = useState<TaskItem[]>([]);
	const [i, setI] = useState(0);

	const updateTasks = (tasks: TaskItem[]) => {
		const t = tasks;
		for (const i in tasks) {
			t[i] = tasks[i];
			t[i].time = new Date().getTime();
		}
		setTasks(t);
	};

	useEffect(() => {
		getSocket().on('tasksUpdated', updateTasks);
		setInterval(() => setI(i + 1), 1000);
		return () => {
			getSocket().off('tasksUpdated', updateTasks);
		};
	}, []);

	const t = [];
	let tCount = 0;
	for (const i in tasks) {
		t.push(tasks[i]);
	}

	return (
		<div className={props.isWelcomePage ? 'welcome-page-tasks-wrapper' : 'tasksEvent-wrapper'}>
			{t.map((item, index) => {
				if (tCount >= props.limit)
					// no more than 3 tasks displayed
					return null;

				if (new Date().getTime() - item.time > 5000) return null;

				tCount++;

				return (
					<blockquote key={index}>
						<p className="text">
							{i18next.t(`TASKS.${item.text}`) !== `TASKS.${item.text}`
								? i18next.t(`TASKS.${item.text}`, { data: item.data })
								: item.text}
							<span className="subtext">
								{i18next.t(`TASKS.${item.subtext}`) !== `TASKS.${item.subtext}`
									? i18next.t(`TASKS.${item.subtext}`)
									: item.subtext}
							</span>
						</p>
						<div className="progress">
							<div
								className={'progress-bar ' + (item.percentage === null ? 'unknown' : '')}
								style={{ width: item.percentage !== null ? item.percentage + '%' : '100%' }}
							></div>
						</div>
					</blockquote>
				);
			})}
		</div>
	);
}

export default TasksEvent;
