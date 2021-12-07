import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import { PollItem } from '../../../../../src/types/poll';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';

interface IProps {
	hasVoted: () => void;
}

function PollModal(props: IProps) {
	const context = useContext(GlobalContext);
	const [width, setWidth] = useState('100%');
	const [timeLeft, setTimeLeft] = useState<string>();
	const [poll, setPoll] = useState<PollItem[]>([]);

	const getSongPoll = async () => {
		const response = await commandBackend('getPoll');
		setPoll(response.poll);
		setTimeLeft(`${response.timeLeft / 1000}s`);
		setWidth('0%');
	};

	const postSong = (event: any) => {
		try {
			commandBackend('votePoll', { index: event.target.value });
			props.hasVoted();
			closeModal(context.globalDispatch);
		} catch (e) {
			//already display
		}
	};

	useEffect(() => {
		getSongPoll();
	}, []);

	return (
		<div className="modal modalPage" id="pollModal">
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="nav nav-tabs nav-justified modal-header">
						<li className="modal-title active">
							<a style={{ fontWeight: 'bold' }}>{i18next.t('POLLTITLE')}</a>
						</li>
						<button
							className="closeModal"
							onClick={() => {
								closeModal(context.globalDispatch);
							}}
						>
							<i className="fas fa-times"></i>
						</button>
						<span className="timer" style={{ transition: `width ${timeLeft}`, width: width }}></span>
					</ul>
					<div id="nav-poll" className="modal-body" style={{ height: 3 * poll.length + 'em' }}>
						<div className="modal-message">
							{poll.map((kara) => {
								return (
									<button
										className="btn btn-default tour poll"
										key={kara.plcid}
										value={kara.index}
										onClick={postSong}
										style={{
											backgroundColor: 'hsl(' + Math.floor(Math.random() * 256) + ',20%, 26%)',
										}}
									>
										{buildKaraTitle(context.globalState.settings.data, kara, true)}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default PollModal;
