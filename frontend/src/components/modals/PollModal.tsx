import React, { Component } from 'react';
import i18next from 'i18next';
import axios from 'axios';
import {buildKaraTitle} from '../tools';
import ReactDOM from 'react-dom';
import { PollItem } from '../../../../src/types/poll';

interface IState {
	width: string;
	timeLeft?: string;
	poll: Array<PollItem>
}
class PollModal extends Component<{},IState> {
	constructor(props:{}) {
		super(props);
		this.state = {
			poll: [],
			width: '100%'
		};
		this.getSongPoll();
	}

    getSongPoll = async () => {
    	var response = await axios.get('/api/songpoll');
    	this.setState({ poll: response.data.poll, timeLeft: `${response.data.timeLeft/1000}s`, width: '0%' });
    };

    postSong = (event:any) => {
		axios.post('/api/songpoll', { index: event.target.value });
		var element = document.getElementById('modal');
    	if(element) ReactDOM.unmountComponentAtNode(element);
    };

    render() {
    	return (
    		<div className="modal modalPage" id="pollModal">
    			<div className="modal-dialog modal-md">
    				<div className="modal-content">
    					<ul className="nav nav-tabs nav-justified modal-header">
    						<li className="modal-title active">
    							<a style={{ fontWeight: 'bold' }}>{i18next.t('POLLTITLE')}</a>
    						</li>
    						<button className="closeModal btn btn-action" 
    							onClick={() => {
									var element = document.getElementById('modal');
									if(element) ReactDOM.unmountComponentAtNode(element)
									}}>
    							<i className="fas fa-times"></i>
    						</button>
    						<span className="timer" style={{transition: `width ${this.state.timeLeft}`, width: this.state.width}}></span>

    					</ul>
    					<div className="tab-content" id="nav-tabContent">
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
    										{buildKaraTitle(kara, true)}
    									</button>;
    								})}
    							</div>
    						</div>
    					</div>
    				</div>
    			</div >
    		</div>
    	);
    }
}

export default PollModal;
