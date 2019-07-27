import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import axios from 'axios';
import {buildKaraTitle} from '../toolsReact';

class PollModal extends Component {
    constructor(props) {
        super(props)
        this.state = {
            poll: []
        };
        this.getSongPoll = this.getSongPoll.bind(this);
        this.postSong = this.postSong.bind(this);
        this.getSongPoll();
    }

    async getSongPoll() {
        var response = await axios.get('/api/public/songpoll');
        this.setState({ poll: response.data.data.poll });
        $('#pollModal .timer').finish().width('100%').animate({ width: '0%' }, response.data.data.timeLeft, 'linear');
    }

    postSong(event) {
        axios.post('/api/public/songpoll', { playlistcontent_id: event.target.value });
        this.props.closePollModal();
    }

    render() {
        const t = this.props.t;
        return (
            this.props.pollModal ?
                <div className="modal modalPage fade" id="pollModal" tabIndex="30">
                    <div className="modal-dialog modal-md">
                        <div className="modal-content">
                            <ul className="nav nav-tabs nav-justified modal-header">
                                <li className="modal-title active">
                                    <a data-toggle="tab" href="#nav-poll" role="tab" aria-controls="nav-poll" aria-selected="true" style={{ fontWeight: 'bold' }}>
                                        {t("POLLTITLE")}</a>
                                </li>
                                <button className="closeModal btn btn-action" data-dismiss="modal" aria-label="Close" onClick={this.props.closePollModal}></button>
                                <span className="timer"></span>

                            </ul>
                            <div className="tab-content" id="nav-tabContent">
                                <div id="nav-poll" role="tabpanel" aria-labelledby="nav-poll-tab"
                                    className="modal-body tab-pane fade in active" style={{ height: 3 * this.state.poll.length + 'em' }}>
                                    <div className="modal-message">
                                        {this.state.poll.map(kara => {
                                            return <button className="btn btn-default tour poll" key={kara.playlistcontent_id} value={kara.playlistcontent_id}
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
                </div> : null
        )
    }
}

export default withTranslation()(PollModal);
