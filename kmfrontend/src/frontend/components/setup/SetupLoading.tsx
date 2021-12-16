import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { TaskItem } from '../../../../../src/lib/types/taskItem';
import logoBig from '../../../assets/Logo-fond-transp.png';
import nanamiHeHe from '../../../assets/nanami-hehe2.png';
import nanamiSearching from '../../../assets/nanami-searching.gif';
import { commandBackend, getSocket } from '../../../utils/socket';

let timeout;

function SetupLoading() {
	const navigate = useNavigate();
	const [tasks, setTasks] = useState<TaskItem[]>([]);

	const endSetup = async () => {
		await commandBackend('updateSettings', {
			setting: {
				App: {
					FirstRun: false,
				},
			},
		}).catch(() => {});
		await commandBackend('startPlayer').catch(() => {});
		sessionStorage.setItem('dlQueueRestart', 'true');
		navigate('/welcome');
	};

	const isGitUpdateInProgress = (tasks: TaskItem[]) => {
		for (const task of tasks) {
			if (task.text === 'UPDATING_GIT_REPO') {
				setTasks(tasks);
				clearTimeout(timeout);
				timeout = setTimeout(async () => endSetup(), 5000);
			}
		}
	};

	useEffect(() => {
		timeout = setTimeout(async () => endSetup(), 5000);
		getSocket().on('tasksUpdated', isGitUpdateInProgress);
		return () => {
			getSocket().off('tasksUpdated', isGitUpdateInProgress);
		};
	}, []);

	const t = [];
	let tCount = 0;
	for (const i in tasks) {
		t.push(tasks[i]);
	}
	return (
		<section className="step step-choice loading">
			<div className="ip--top">
				<img className="ip--logo" src={logoBig} alt="Karaoke Mugen" />
			</div>
			{t.map((item: TaskItem) => {
				if (tCount >= 1)
					// no more than 3 tasks displayed
					return null;
				tCount++;

				return (
					<>
						<div className="ip--message">
							{i18next.t(`TASKS.${item.text}`) !== `TASKS.${item.text}`
								? i18next.t(`TASKS.${item.text}`, { data: item.data })
								: item.text}
						</div>
						{item.percentage < 100 ? (
							<>
								<div className="ip--progress-bar-container">
									<div className="ip--progress-bar" style={{ width: `${item.percentage}%` }}></div>
									<div className="ip--progress-text">
										{i18next.t(`TASKS.${item.subtext}`) !== `TASKS.${item.subtext}`
											? i18next.t(`TASKS.${item.subtext}`)
											: item.subtext}
									</div>
								</div>
							</>
						) : null}
						<div className="ip--nanami">
							{item.percentage < 100 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? (
								<img src={nanamiSearching} alt="Nanamin" />
							) : (
								<img src={nanamiHeHe} alt="Nanamin" />
							)}
						</div>
					</>
				);
			})}
		</section>
	);
}

export default SetupLoading;
