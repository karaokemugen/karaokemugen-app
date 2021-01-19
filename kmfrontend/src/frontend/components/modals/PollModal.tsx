import i18next from 'i18next';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { PollItem } from '../../../../../src/types/poll';
import { GlobalContextInterface } from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';

interface IProps {
	hasVoted: () => void;
	context: GlobalContextInterface;
}

interface IState {
	width: string;
	timeLeft?: string;
	poll: Array<PollItem>
}
class PollModal extends Component<IProps, IState> {

	constructor(props: IProps) {
		super(props);
		this.state = {
			poll: [],
			width: '100%'
		};
		this.getSongPoll();
	}

	getSongPoll = async () => {
		const response = await commandBackend('getPoll');
		this.setState({ poll: response.poll, timeLeft: `${response.timeLeft / 1000}s`, width: '0%' });
	};

	postSong = (event: any) => {
		commandBackend('votePoll', { index: event.target.value });
		this.props.hasVoted();
		const element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
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
							<button className="closeModal"
								onClick={() => {
									const element = document.getElementById('modal');
									if (element) ReactDOM.unmountComponentAtNode(element);
								}}>
								<i className="fas fa-times"></i>
							</button>
							<span className="timer" style={{ transition: `width ${this.state.timeLeft}`, width: this.state.width }}></span>

						</ul>
						<div id="nav-poll" className="modal-body" style={{ height: 3 * this.state.poll.length + 'em' }}>
							<div className="modal-message">
								{this.state.poll.map(kara => {
									return <button className="btn btn-default tour poll" key={kara.playlistcontent_id} value={kara.index}
										onClick={this.postSong}
										style={{
											backgroundColor: 'hsl('
												+ Math.floor(Math.random() * 256)
												+ ',20%, 26%)'
										}}>
										{buildKaraTitle(this.props.context.globalState.settings.data, kara, true)}
									</button>;
								})}
							</div>
						</div>
					</div>
				</div >
			</div>
		);
	}
}

export default PollModal;
