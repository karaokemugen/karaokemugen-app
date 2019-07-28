import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import axios from "axios";
import { is_touch_device } from "../toolsReact";
import { buildKaraTitle } from '../toolsReact';

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
            status: undefined
        };
        /* prevent the virtual keyboard popup when on touchscreen by not focusing the search input */
        if (is_touch_device()) {
            $('#progressBarColor').addClass('cssTransition');
        }
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

            $('#progressBar').attr('title', oldState.timeposition);
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
        window.socket.on('playerStatus', this.refreshPlayerInfos);
    }

    goToPosition(e) {
        var karaInfo = $('#karaInfo');
        var songLength = karaInfo.attr('length');
        var barInnerwidth = karaInfo.innerWidth();
        var futurTimeX = e.pageX - karaInfo.offset().left;
        var futurTimeSec = songLength * futurTimeX / barInnerwidth;

        if (!isNaN(futurTimeSec) && futurTimeSec >= 0) {
            $('#progressBarColor').removeClass('cssTransform')
                .css('transform', 'translateX(' + e.pageX + 'px)')
                .addClass('');
            axios.put('/api/admin/player', { command: 'goTo', options: futurTimeSec }).then(() => {
                $('#progressBarColor').addClass('cssTransform');
            });
        }
    }

    karaInfoClick(e) {
        if (this.state.status != undefined && this.state.status != '' && this.state.status != 'stop' && $(this).attr('length') != -1) {
            this.goToPosition(e);
        }
    }

    /**
    * refresh the player infos
    */
    refreshPlayerInfos(data) {
        if (this.state.oldState != data) {
            var newWidth = $('#karaInfo').width() * 
                parseInt(10000 * (data.timePosition + this.state.refreshTime / 1000) / $('#karaInfo').attr('length')) / 10000 + 'px';

            if (data.timePosition != this.state.oldState.timePosition && $('#karaInfo').attr('length') != 0) {
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

            if ($('input[name="lyrics"]').is(':checked')
                || (is_touch_device() || this.props.webappMode == 1)) {
                var text = data['subText'];
                if (text) text = text.indexOf('\n') == -1 ? text : text.substring(0, text.indexOf('\n'));
                $('#karaInfo > span').html(text);
            }
            if (data.currentlyPlaying !== this.state.oldState.currentlyPlaying) {
                var barCss = $('#progressBarColor.cssTransform');
                barCss.removeClass('cssTransform');
                $('#progressBarColor').stop().css({ transform: 'translateX(0)' });
                barCss.addClass('cssTransform');

                if (data.currentlyPlaying === null) {
                    $('#karaInfo').attr('idKara', data.currentlyPlaying);
                    $('#karaInfo').attr('length', -1);
                    $('#karaInfo > span').text(this.props.t('KARA_PAUSED_WAITING'));
                    $('#karaInfo > span').data('text', this.props.t('KARA_PAUSED_WAITING'));
                } else if (data.currentlyPlaying === -1) {
                    $('#karaInfo').attr('idKara', data.currentlyPlaying);
                    $('#karaInfo').attr('length', -1);
                    $('#karaInfo > span').text(this.props.t('JINGLE_TIME'));
                    $('#karaInfo > span').data('text', this.props.t('JINGLE_TIME'));

                } else {
                    axios.get('/api/public/karas/' + data.currentlyPlaying).then(response => {
                        var kara = response.data.data;
                        $('#karaInfo').attr('idKara', kara.kid);
                        $('#karaInfo').attr('length', kara.duration);
                        $('#karaInfo > span').text(buildKaraTitle(kara));
                        $('#karaInfo > span').data('text', buildKaraTitle(kara));
                    });
                }
            }
            this.setState({oldState: data});
        }
    }

    render() {
        const t = this.props.t;
        return (
            <div id="progressBar" className="underHeader">
                <div id="karaInfo" idkara="-1" onDragStart={() => { return false }} draggable="false"
                    onClick={this.karaInfoClick}
                    onMouseDown={this.mouseDown} onMouseUp={() => this.setState({mouseDown: false})}
                    onMouseMove={this.mouseMove} onMouseOut={this.mouseOut}
                ><span>{t("KARA_PAUSED_WAITING")}</span></div>
                <div id="progressBarColor" className="cssTransform"></div>
            </div>
        )
    }
}

export default withTranslation()(ProgressBar);
