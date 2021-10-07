import i18next from 'i18next';
import React, { Component } from 'react';

import { PollItem } from '../../../../../src/types/poll';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';

interface IProps {
	hasVoted: () => void;
}

interface IState {
	width: string;
	timeLeft?: string;
	poll: PollItem[];
}
class PollModal extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>;

	constructor(props: IProps) {
		super(props);
		this.state = {
			poll: [],
			width: '100%',
		};
		this.getSongPoll();
	}

	getSongPoll = async () => {
		const response = await commandBackend('getPoll');
		this.setState({ poll: response.poll, timeLeft: `${response.timeLeft / 1000}s`, width: '0%' });
	};

	postSong = (event: any) => {
		try {
			commandBackend('votePoll', { index: event.target.value });
			this.props.hasVoted();
			closeModal(this.context.globalDispatch);
		} catch (e) {
			//already display
		}
	};

	render() {
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
									closeModal(this.context.globalDispatch);
								}}
							>
								<i className="fas fa-times"></i>
							</button>
							<span
								className="timer"
								style={{ transition: `width ${this.state.timeLeft}`, width: this.state.width }}
							></span>
						</ul>
						<div id="nav-poll" className="modal-body" style={{ height: 3 * this.state.poll.length + 'em' }}>
							<div className="modal-message">
								{this.state.poll.map((kara) => {
									return (
										<button
											className="btn btn-default tour poll"
											key={kara.plcid}
											value={kara.index}
											onClick={this.postSong}
											style={{
												backgroundColor:
													'hsl(' + Math.floor(Math.random() * 256) + ',20%, 26%)',
											}}
										>
											{buildKaraTitle(this.context.globalState.settings.data, kara, true)}
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
}

export default PollModal;
