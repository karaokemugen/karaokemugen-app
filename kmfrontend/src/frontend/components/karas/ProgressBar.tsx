import './ProgressBar.scss';

import i18next from 'i18next';
import { ReactFragment, useContext, useEffect, useRef, useState } from 'react';

import { PublicPlayerState } from '../../../../../src/types/state';
import GlobalContext from '../../../store/context';
import { useResizeListener } from '../../../utils/hooks';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { secondsTimeSpanToHMS } from '../../../utils/tools';

function ProgressBar() {
	const context = useContext(GlobalContext);
	const [mouseDown, setMouseDown] = useState(false);
	const [playerStatus, setPlayerStatus] = useState<string>();
	const [karaInfoText, setKaraInfoText] = useState<string | ReactFragment>(i18next.t('KARA_PAUSED_WAITING'));
	const [length, setLength] = useState(-1);
	const [width, setWidth] = useState('0');
	const [timePosition, setTimePosition] = useState(0);
	const [animate, setAnimate] = useState(0);
	const [duration, setDuration] = useState(0);
	const [animationPause, setAnimationPause] = useState(false);

	// Int (ms) : time unit between every call
	const refreshTime = 1000;
	const refBar = useRef<HTMLDivElement>();
	const refCont = useRef<HTMLDivElement>();
	const refP = useRef<HTMLParagraphElement>();
	let timeout: NodeJS.Timeout;

	const mouseDownAction = (e: any) => {
		if (playerStatus && playerStatus !== 'stop' && length !== -1) {
			setMouseDown(true);
			setWidth(e.pageX);
		}
	};

	const mouseMove = (e: any) => {
		if (mouseDown) {
			setWidth(e.pageX);
		}
	};

	const mouseOut = () => {
		if (mouseDown) {
			setMouseDown(false);
		}
	};

	const suspendAnimation = () => {
		if (!animationPause) {
			setAnimationPause(true);
			timeout = setTimeout(() => {
				setAnimationPause(false);
			}, 3000);
		}
	};

	const goToPosition = (e: any) => {
		const karaInfo = document.getElementById('karaInfo');
		if (karaInfo) {
			const barInnerwidth = karaInfo.offsetWidth;
			const futurTimeX = e.pageX - karaInfo.offsetLeft;
			const futurTimeSec = (length * futurTimeX) / barInnerwidth;
			if (!isNaN(futurTimeSec) && futurTimeSec >= 0) {
				setWidth(e.pageX);
				commandBackend('sendPlayerCommand', { command: 'goTo', options: futurTimeSec }).catch(() => {});
			}
		}
	};

	const karaInfoClick = (e: any) => {
		goToPosition(e);
	};

	const resizeCheck = () => {
		if (refP?.current) {
			const offset = refP.current.getBoundingClientRect().width - refCont.current.getBoundingClientRect().width;
			if (offset > 0) {
				setAnimate(-offset - 5);
				setDuration(Math.round(offset * 0.05));
			} else {
				setAnimate(0);
			}
		}
	};

	/**
	 * refresh the player infos
	 */
	const refreshPlayerInfos = async (data: PublicPlayerState) => {
		const element = refBar.current;
		if (element && data.timeposition !== undefined) {
			const newWidth =
				(element.offsetWidth * 10000 * (data.timeposition + refreshTime / 1000)) / length / 10000 + 'px';

			if (length !== 0) {
				setWidth(newWidth);
				setTimePosition(data.timeposition);
			}
		}
		if (data.playerStatus) {
			if (data.playerStatus === 'stop') {
				setWidth('0');
			}
			setPlayerStatus(data.playerStatus);
		}

		if (data.mediaType || data.currentSong) {
			setWidth('0');
			if (data.mediaType === 'stop') {
				setKaraInfoText(i18next.t('KARA_PAUSED_WAITING'));
				setLength(-1);
				setAnimate(0);
			} else if (data.mediaType === 'Jingles') {
				setKaraInfoText(i18next.t('JINGLE_TIME'));
				setLength(-1);
				setAnimate(0);
			} else if (data.mediaType === 'Intros') {
				setKaraInfoText(i18next.t('INTRO_TIME'));
				setLength(-1);
				setAnimate(0);
			} else if (data.mediaType === 'Outros') {
				setKaraInfoText(i18next.t('OUTRO_TIME'));
				setLength(-1);
				setAnimate(0);
			} else if (data.mediaType === 'Encores') {
				setKaraInfoText(i18next.t('ENCORES_TIME'));
				setLength(-1);
				setAnimate(0);
			} else if (data.mediaType === 'Sponsors') {
				setKaraInfoText(i18next.t('SPONSOR_TIME'));
				setLength(-1);
				setAnimate(0);
			} else if (data.mediaType === 'pause') {
				setKaraInfoText(i18next.t('PAUSE_TIME'));
				setLength(-1);
				setAnimate(0);
			} else if (data.mediaType === 'poll') {
				setKaraInfoText(i18next.t('VOTE_TIME'));
				setLength(-1);
				setAnimate(0);
			} else if (data.currentSong) {
				const kara = data.currentSong;
				const karaInfo = buildKaraTitle(context.globalState.settings.data, kara);
				setKaraInfoText(karaInfo);
				setLength(kara.duration);
			}
		}
	};

	const displayProgressBar = async () => {
		if (context.globalState.auth.isAuthenticated) {
			try {
				const result = await commandBackend('getPlayerStatus');
				refreshPlayerInfos(result);
			} catch (e) {
				// already display
			}
		}
	};

	useEffect(() => {
		if (length > 0) {
			resizeCheck();
		}
		getSocket().on('playerStatus', refreshPlayerInfos);
		return () => {
			getSocket().off('playerStatus', refreshPlayerInfos);
		};
	}, [length]);

	useEffect(() => {
		displayProgressBar();
		getSocket().on('connect', displayProgressBar);
		if (refP.current) {
			refP.current.addEventListener('animationiteration', suspendAnimation, { passive: true });
		}
		return () => {
			getSocket().off('connect', displayProgressBar);
			if (timeout) {
				clearTimeout(timeout);
			}
		};
	}, []);

	useResizeListener(resizeCheck);

	return (
		<div id="progressBar">
			<div
				id="karaInfo"
				onDragStart={() => {
					return false;
				}}
				draggable={false}
				onClick={karaInfoClick}
				onMouseDown={mouseDownAction}
				onMouseUp={() => setMouseDown(false)}
				onMouseMove={mouseMove}
				onMouseOut={mouseOut}
				ref={refBar}
			>
				<div className="actualTime">
					{timePosition !== undefined &&
						length > 0 &&
						secondsTimeSpanToHMS(Math.round(timePosition), 'mm:ss')}
				</div>
				<div
					className={`karaTitle${animate !== 0 ? ' animate' : ''}${animationPause ? ' pause' : ''}`}
					style={{
						['--offset' as any]: `${animate}px`,
						['--duration' as any]: `${duration}s`,
					}}
					ref={refCont}
				>
					<p ref={refP}>{karaInfoText}</p>
				</div>

				<div className="remainTime">
					{length > 0 && `-${secondsTimeSpanToHMS(Math.round(length - timePosition), 'mm:ss')}`}
				</div>
			</div>
			<div id="progressBarColor" style={{ width: width }} />
		</div>
	);
}

export default ProgressBar;
