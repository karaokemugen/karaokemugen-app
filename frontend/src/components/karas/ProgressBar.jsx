import React, { Component } from "react";
import i18next from 'i18next';
import axios from "axios";
import { buildKaraTitle, getSocket } from "../tools";

require('./ProgressBar.scss');

class ProgressBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            mouseDown: false,
            // Object : last player state saved
            oldState: {},
            // Int (ms) : time unit between every call
            refreshTime: 1000,
            // String : status of the player
            status: undefined,
            karaInfoText: i18next.t("KARA_PAUSED_WAITING"),
            length: -1,
            width: 0
        };
        this.mouseDown = this.mouseDown.bind(this);
        this.mouseMove = this.mouseMove.bind(this);
        this.mouseOut = this.mouseOut.bind(this);
        this.karaInfoClick = this.karaInfoClick.bind(this);
        this.refreshPlayerInfos = this.refreshPlayerInfos.bind(this);
    }

    mouseDown(e) {
        if (this.state.status != undefined && this.state.status != '' && this.state.status != 'stop' && this.state.length != -1) {
            this.setState({mouseDown: true, width: e.pageX});
        }
    }

    mouseMove(e) {
        if (this.state.mouseDown) {
            this.setState({width: e.pageX});
        }
    }

    mouseOut() {
        if (this.state.mouseDown) {
            this.setState({mouseDown: false});
        }
    }

    componentDidMount() {
        getSocket().on('playerStatus', this.refreshPlayerInfos);
    }

    async goToPosition(e) {
        var karaInfo = document.getElementById('karaInfo');
        var barInnerwidth = karaInfo.offsetWidth;
        var futurTimeX = e.pageX - karaInfo.offsetLeft;
        var futurTimeSec = this.state.length * futurTimeX / barInnerwidth;
        if (!isNaN(futurTimeSec) && futurTimeSec >= 0) {
            this.setState({width: e.pageX});
            axios.put('/api/admin/player', { command: 'goTo', options: futurTimeSec });
        }
    }

    karaInfoClick(e) {
        if (this.props.scope === 'admin' && this.state.status != undefined 
            && this.state.status != '' && this.state.status != 'stop' && this.state.length != -1) {
            this.goToPosition(e);
        }
    }

    /**
    * refresh the player infos
    */
    async refreshPlayerInfos(data) {
        if (this.state.oldState != data) {


            var newWidth = document.getElementById('karaInfo').offsetWidth * 
                parseInt(10000 * (data.timePosition + this.state.refreshTime / 1000) / this.state.length) / 10000 + 'px';

            if (data.timePosition != this.state.oldState.timePosition && this.state.length != 0) {
                this.setState({width: newWidth});
            }
            if (this.state.oldState.status != data.status || this.state.oldState.playerStatus != data.playerStatus) {
                status = data.status === 'stop' ? 'stop' : data.playerStatus;
                if( status === 'stop') {
                    this.setState({width: 0});
                }
                this.setState({status: status});
            }

            if (data.currentlyPlaying !== this.state.oldState.currentlyPlaying) {
                this.setState({width: 0});
            }

            if (data.currentlyPlaying !== this.state.oldState.currentlyPlaying) {
                if (data.currentlyPlaying === null) {
                    this.setState({karaInfoText: i18next.t('KARA_PAUSED_WAITING'), length: -1})
                } else if (data.currentlyPlaying === -1) {
                    this.setState({karaInfoText: i18next.t('JINGLE_TIME'), length: -1})
                } else if (data.currentlyPlaying === -2) {
                    this.setState({karaInfoText: i18next.t('INTRO_TIME'), length: -1})
                } else if (data.currentlyPlaying === -3) {
                    this.setState({karaInfoText: i18next.t('SPONSOR_TIME'), length: -1})
                } else {
                    var response = await axios.get('/api/public/karas/' + data.currentlyPlaying);
                    var kara = response.data.data;
                    var karaInfoText;
                    if (this.props.lyrics || (this.props.scope === 'public' && this.props.webappMode == 1)) {
                        var text = data.subText;
                        if (text) text = text.indexOf('\n') == -1 ? text : text.substring(0, text.indexOf('\n'));
                        karaInfoText = text;
                    } else {
                        karaInfoText = buildKaraTitle(kara);
                    }
                    this.setState({karaInfoText: karaInfoText, length: kara.duration})
                }
            }
            this.setState({oldState: data});
        }
    }

    render() {
        return (
            <div id="progressBar">
                <div id="karaInfo" onDragStart={() => { return false }} draggable="false"
                    onClick={this.karaInfoClick}
                    onMouseDown={this.mouseDown} onMouseUp={() => this.setState({mouseDown: false})}
                    onMouseMove={this.mouseMove} onMouseOut={this.mouseOut}
                ><span>{this.state.karaInfoText}</span></div>
                <div id="progressBarColor" style={{width: this.state.width}}></div>
            </div>
        )
    }
}

export default ProgressBar;
