import './PollModal.scss';

import i18next from 'i18next';
import { MouseEvent, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { PollItem, PollObject } from '../../../../../src/types/poll';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';

const colorPalette = [0, 63, 127, 191, 255];

function PollModal() {
	const context = useContext(GlobalContext);
	const [timeLeft, setTimeLeft] = useState<number>();
	const [voted, setVoted] = useState<number>(-1);
	const [totalVotes, setTotalVotes] = useState(0);
	const [poll, setPoll] = useState<PollItem[]>([]);
	const interval = useRef<NodeJS.Timeout>();

	const getSongPoll = async () => {
		const response: PollObject = await commandBackend('getPoll');
		setPoll(response.poll);
		setVoted(response.flag_uservoted ? 0 : -1);
		setTimeLeft(response.timeLeft);
	};

	const updatePoll = useCallback(newPoll => {
		setPoll(newPoll);
	}, []);

	const postSong = async (event: MouseEvent<HTMLButtonElement>) => {
		try {
			if (voted === -1) {
				const button: HTMLButtonElement = (event.target as HTMLButtonElement).closest('button');
				await commandBackend('votePoll', { index: button.value });
				setVoted(parseInt(button.value));
			}
		} catch (e) {
			// already display
		}
	};

	useEffect(() => {
		getSongPoll();
		interval.current = setInterval(() => {
			setTimeLeft(tLeft => tLeft - 1000);
		}, 1000);
		getSocket().on('songPollUpdated', updatePoll);
		return () => {
			getSocket().off('songPollUpdated', updatePoll);
			clearTimeout(interval.current);
		};
	}, []);

	useEffect(() => {
		setTotalVotes(poll.reduce((acc, x) => acc + x.votes, 0));
	}, [poll]);

	return (
		<div className="modal modalPage" id="pollModal">
			<div className="modal-dialog">
				<div className="modal-content">
					<div className="modal-header">
						<div className="modal-title">
							{i18next.t(voted > -1 ? 'MODAL.POLL.VOTED' : 'MODAL.POLL.VOTE')}
						</div>
						<button
							className="closeModal"
							onClick={() => {
								closeModal(context.globalDispatch);
							}}
						>
							<i className="fas fa-times" />
						</button>
					</div>
					<div className="modal-body">
						<div>{i18next.t('MODAL.POLL.REMAINING', { count: Math.floor(timeLeft / 1000) })}</div>
						{poll.map(kara => {
							return (
								<button
									className="btn btn-default fluid"
									key={kara.plcid}
									value={kara.index}
									onClick={postSong}
									style={{
										backgroundColor: `hsl(${colorPalette[kara.index % colorPalette.length]}, ${
											voted !== -1 && voted !== kara.index ? '0' : '25'
										}%, 20%)`,
									}}
								>
									<div className="karaTitle">
										{buildKaraTitle(context.globalState.settings.data, kara, false)}
									</div>
									<div>{i18next.t('MODAL.POLL.VOTES', { count: kara.votes })}</div>
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}

export default PollModal;
