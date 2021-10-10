import './TasksEvent.scss';

import i18next from 'i18next';
import { Component } from 'react';

import { TaskItem } from '../../src/lib/types/taskItem';
import { getSocket } from './utils/socket';

interface IProps {
  limit: number;
  isWelcomePage?: boolean;
}

interface IState {
  tasks: TaskItem[];
  i: number;
}

class TasksEvent extends Component<IProps, IState> {
	constructor(props: IProps) {
		super(props);
		this.state = {
			tasks: [],
			i: 0
		};
	}

	componentDidMount() {
		getSocket().on('tasksUpdated', this.updateTasks);
		setInterval(() => this.setState({ i: this.state.i + 1 }), 1000);
	}

	componentWillUnmount() {
		getSocket().off('tasksUpdated', this.updateTasks);
	}

	updateTasks = (tasks: TaskItem[]) => {
		const t = this.state.tasks;
		for (const i in tasks) {
			t[i] = tasks[i];
			t[i].time = (new Date()).getTime();
		}
		this.setState({ tasks: t });
	}

	render() {
		const t = [];
		let tCount = 0;
		for (const i in this.state.tasks) {
			t.push(this.state.tasks[i]);
		}

		return (
			<div className={this.props.isWelcomePage ? 'welcome-page-tasks-wrapper' : 'tasksEvent-wrapper'}>
				{
					t.map((item, index) => {
						if (tCount >= this.props.limit) // no more than 3 tasks displayed
							return null;

						if ((new Date()).getTime() - item.time > 5000)
							return null;

						tCount++;

						return (<blockquote key={index}>
							<p className="text">
								{i18next.t(`TASKS.${item.text}`) !== `TASKS.${item.text}` ? i18next.t(`TASKS.${item.text}`, {data: item.data}) : item.text}
								<span className="subtext">{i18next.t(`TASKS.${item.subtext}`) !== `TASKS.${item.subtext}` ? i18next.t(`TASKS.${item.subtext}`) : item.subtext}</span>
							</p>
							<div className="progress"><div className={'progress-bar ' + (item.percentage === null ? 'unknown' : '')} style={{ width: (item.percentage !== null ? item.percentage + '%' : '100%') }}></div></div>
						</blockquote>);
					})
				}
			</div>
		);
	}
}

export default TasksEvent;
