import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import axios from "axios";
import { is_touch_device } from "../toolsReact";
import {buildKaraTitle} from '../toolsReact';

class ProgressBar extends Component {
    constructor(props) {
        super(props);

        var mouseDown = false;
        // Object : last player state saved
        var oldState = {};
        // Int (ms) : time unit between every call
        var refreshTime = 1000;
        // String : status of the player
        var status;            

        /* prevent the virtual keyboard popup when on touchscreen by not focusing the search input */
		if(is_touch_device()) {
			$('#progressBarColor').addClass('cssTransition');
		}

        $('#karaInfo').on('mousedown touchstart', function (e) {
            if (status != undefined && status != '' && status != 'stop' && $(this).attr('length') != -1) {
                mouseDown = true;
                $('#progressBarColor').removeClass('cssTransform')
                    .css('transform', 'translateX(' + e.pageX + 'px)')
                    .addClass('');

                $('#progressBar').attr('title', oldState.timeposition);
            }
        });
        $('#karaInfo').mouseup(function () {
            mouseDown = false;
        });
        $('#karaInfo').mousemove(function (e) {
            if (mouseDown) {
                $('#progressBarColor').removeClass('cssTransform')
                    .css('transform', 'translateX(' + e.pageX + 'px)')
                    .addClass('');
            }
        });
        $('#karaInfo').mouseout(function () {
            if (mouseDown) {
                $('#progressBarColor').addClass('cssTransform');
                mouseDown = false;
            }
        });
        
    }

    componentDidMount() {
        window.socket.on('playerStatus', data => this.refreshPlayerInfos(data));
    }
    
    goToPosition (e) {
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
        if (status != undefined && status != '' && status != 'stop' && $(this).attr('length') != -1) {
            goToPosition(e);
        }
    }

	/**
    * refresh the player infos
    */
	refreshPlayerInfos (data) {
		if (oldState != data && logInfos.username) {
			var newWidth = $('#karaInfo').width() * parseInt(10000 * ( data.timePosition + refreshTime/1000) / $('#karaInfo').attr('length')) / 10000 + 'px';

			if (data.timePosition != oldState.timePosition && $('#karaInfo').attr('length') != 0) {
				var elm = document.getElementById('progressBarColor');
				elm.style.transform =  'translateX(' + newWidth + ')';
			}
			if (oldState.status != data.status || oldState.playerStatus != data.playerStatus) {
				status = data.status === 'stop' ? 'stop' : data.playerStatus;
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
            
            if($('input[name="lyrics"]').is(':checked')
                || (mode == 'mobile' || webappMode == 1)) {
				var text = data['subText'];
				if (text) text = text.indexOf('\n') == -1 ? text:  text.substring(0, text.indexOf('\n') );
				$('#karaInfo > span').html(text);
			}
			if (data.currentlyPlaying !== oldState.currentlyPlaying) {
				var barCss = $('#progressBarColor.cssTransform');
				barCss.removeClass('cssTransform');
				$('#progressBarColor').stop().css({transform : 'translateX(0)'});
				barCss.addClass('cssTransform');


				if ( data.currentlyPlaying === null) {

					$('#karaInfo').attr('idKara', data.currentlyPlaying);
					$('#karaInfo').attr('length', -1);
					$('#karaInfo > span').text( this.props.t('KARA_PAUSED_WAITING') );
					$('#karaInfo > span').data('text',this.props.t('KARA_PAUSED_WAITING') );
				} else if ( data.currentlyPlaying === -1) {
					$('#karaInfo').attr('idKara', data.currentlyPlaying);
					$('#karaInfo').attr('length', -1);
					$('#karaInfo > span').text( this.props.t('JINGLE_TIME') );
					$('#karaInfo > span').data('text',this.props.t('JINGLE_TIME') );

				} else {
                    axios.get('/api/public/karas/' + data.currentlyPlaying).then(dataKara => {
						var kara = dataKara;
						$('#karaInfo').attr('idKara', kara.kid);
						$('#karaInfo').attr('length', kara.duration);
						$('#karaInfo > span').text( buildKaraTitle(kara) );
						$('#karaInfo > span').data('text', buildKaraTitle(kara) );
					});
				}
			}

			oldState = data;
		}
	}

    render() {
        const t = this.props.t;
        return (
            <div id="progressBar" className="underHeader">
                <div id="karaInfo" idkara="-1" onDragStart={() => { return false }} draggable="false"
                    onClick={this.karaInfoClick}><span>{t("KARA_PAUSED_WAITING")}</span></div>
                <div id="progressBarColor" className="cssTransform"></div>
            </div>
        )
    }
}

export default withTranslation()(ProgressBar);
