import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import axios from "axios";
import { is_touch_device, buildKaraTitle, getSocket } from "../tools";

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
            karaInfoText: this.props.t("KARA_PAUSED_WAITING"),
            length: -1
        };
        this.mouseDown = this.mouseDown.bind(this);
        this.mouseMove = this.mouseMove.bind(this);
        this.mouseOut = this.mouseOut.bind(this);
        this.karaInfoClick = this.karaInfoClick.bind(this);
        this.refreshPlayerInfos = this.refreshPlayerInfos.bind(this);
    }

    mouseDown(e) {
        if (this.state.status != undefined && this.state.status != '' && this.state.status != 'stop' && $(this).attr('length') != -1) {
            this.setState({mouseDown: true});
            $('#progressBarColor').removeClass('cssTransform')
                .css('transform', 'translateX(' + e.pageX + 'px)')
                .addClass('');
        }
    }

    mouseMove(e) {
        if (this.state.mouseDown) {
            $('#progressBarColor').removeClass('cssTransform')
                .css('transform', 'translateX(' + e.pageX + 'px)')
                .addClass('');
        }
    }

    mouseOut() {
        if (this.state.mouseDown) {
            $('#progressBarColor').addClass('cssTransform');
            this.setState({mouseDown: false});
        }
    }

    componentDidMount() {
        getSocket().on('playerStatus', this.refreshPlayerInfos);
    }

    async goToPosition(e) {
        var karaInfo = $('#karaInfo');
        var barInnerwidth = karaInfo.innerWidth();
        var futurTimeX = e.pageX - karaInfo.offset().left;
        var futurTimeSec = this.state.length * futurTimeX / barInnerwidth;

        if (!isNaN(futurTimeSec) && futurTimeSec >= 0) {
            $('#progressBarColor').removeClass('cssTransform')
                .css('transform', 'translateX(' + e.pageX + 'px)')
                .addClass('');
            axios.put('/api/admin/player', { command: 'goTo', options: futurTimeSec });
            $('#progressBarColor').addClass('cssTransform');
        }
    }

    karaInfoClick(e) {
        if (this.state.status != undefined && this.state.status != '' && this.state.status != 'stop' && this.state.length != -1) {
            this.goToPosition(e);
        }
    }

    /**
    * refresh the player infos
    */
    async refreshPlayerInfos(data) {
        if (this.state.oldState != data) {
            if (data.currentlyPlaying === null) {
                this.setState({karaInfoText: this.props.t('KARA_PAUSED_WAITING'), length: -1})
            } else if (data.currentlyPlaying === -1) {
                this.setState({karaInfoText: this.props.t('JINGLE_TIME'), length: -1})
            } else {
                var response = await axios.get('/api/public/karas/' + data.currentlyPlaying);
                var kara = response.data.data;
                var karaInfoText;
                if (this.props.lyrics || this.props.webappMode == 1) {
                    var text = data.subText;
                    if (text) text = text.indexOf('\n') == -1 ? text : text.substring(0, text.indexOf('\n'));
                    karaInfoText = text;
                } else {
                    karaInfoText = buildKaraTitle(kara);
                }
                console.log(karaInfoText)
                this.setState({karaInfoText: karaInfoText, length: kara.duration})
            }

            var newWidth = $('#karaInfo').width() * 
                parseInt(10000 * (data.timePosition + this.state.refreshTime / 1000) / this.state.length) / 10000 + 'px';

            if (data.timePosition != this.state.oldState.timePosition && this.state.length != 0) {
                var elm = document.getElementById('progressBarColor');
                elm.style.transform = 'translateX(' + newWidth + ')';
            }
            if (this.state.oldState.status != data.status || this.state.oldState.playerStatus != data.playerStatus) {
                status = data.status === 'stop' ? 'stop' : data.playerStatus;
                this.setState({status: status});
                switch (status) {
                    case 'play':
                        $('#progressBarColor').addClass('cssTransform');
                        break;
                    case 'pause':
                        $('#progressBarColor').removeClass('cssTransform');
                        break;
                    case 'stop':
                        $('#progressBarColor').removeClass('cssTransform');
                        break;
                    default:
                }
            }

            if (data.currentlyPlaying !== this.state.oldState.currentlyPlaying) {
                var barCss = $('#progressBarColor.cssTransform');
                barCss.removeClass('cssTransform');
                $('#progressBarColor').stop().css({ transform: 'translateX(0)' });
                barCss.addClass('cssTransform');
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
                <div id="progressBarColor" className="cssTransform"></div>
            </div>
        )
    }
}

export default withTranslation()(ProgressBar);
