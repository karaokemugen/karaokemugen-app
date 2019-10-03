import React, { Component } from "react";
import i18next from 'i18next';
import axios from 'axios';
import {buildKaraTitle} from '../tools';
import ReactDOM from 'react-dom';
class PollModal extends Component {
    constructor(props) {
        super(props)
        this.state = {
            poll: [],
            width: "100%"
        };
        this.getSongPoll = this.getSongPoll.bind(this);
        this.postSong = this.postSong.bind(this);
        this.getSongPoll();
    }

    async getSongPoll() {
        var response = await axios.get('/api/public/songpoll');
        this.setState({ poll: response.data.data.poll, timeLeft: `${response.data.data.timeLeft/1000}s`, width: "0%" });
    }

    postSong(event) {
        axios.post('/api/public/songpoll', { index: event.target.value });
        ReactDOM.unmountComponentAtNode(document.getElementById('modal'));
    }

    render() {
        return (
                <div className="modal modalPage" id="pollModal">
                    <div className="modal-dialog modal-md">
                        <div className="modal-content">
                            <ul className="nav nav-tabs nav-justified modal-header">
                                <li className="modal-title active">
                                    <a style={{ fontWeight: 'bold' }}>{i18next.t("POLLTITLE")}</a>
                                </li>
                                <button className="closeModal btn btn-action" 
                                    onClick={() => ReactDOM.unmountComponentAtNode(document.getElementById('modal'))}>
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
                                                {buildKaraTitle(kara)}
                                            </button>
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div >
                </div>
        )
    }
}

export default PollModal;
