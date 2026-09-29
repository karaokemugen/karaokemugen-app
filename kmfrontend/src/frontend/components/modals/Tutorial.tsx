import './Tutorial.scss';

import { faSquare as farSquare } from '@fortawesome/free-regular-svg-icons';
import {
	faArrowLeft,
	faArrowRight,
	faBan,
	faBook,
	faCheck,
	faCog,
	faComment,
	faGlobe,
	faHistory,
	faInfoCircle,
	faListOl,
	faPencilAlt,
	faPlay,
	faPlayCircle,
	faPlus,
	faStop,
	faUndoAlt,
	faWrench,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import i18next from 'i18next';
import { useState } from 'react';
import { Trans } from 'react-i18next';

import KLogo from '../../../assets/Klogo.png';
import TutoKaraLine from '../../../assets/tuto_karaline.png';
import { useResizeListener } from '../../../utils/hooks';
import { commandBackend } from '../../../utils/socket';
import { is_large_device } from '../../../utils/tools';
import { WS_CMD } from '../../../utils/ws.mjs';

interface IProps {
	unmount: () => void;
}

function Tutorial(props: IProps) {
	const [stepIndex, setStepIndex] = useState(0);
	const [isLargeDevice, setLargeDevice] = useState(is_large_device());

	const resize = () => {
		setLargeDevice(is_large_device());
	};

	const nextStep = () => {
		try {
			if (stepIndex === 2) {
				commandBackend(WS_CMD.EDIT_MY_ACCOUNT, { flag_tutorial_done: true });
				props.unmount();
			}
			setStepIndex(stepIndex + 1);
		} catch (_) {
			// already display
		}
	};

	const previousStep = () => {
		if (stepIndex !== 0) {
			setStepIndex(stepIndex - 1);
		}
	};

	useResizeListener(resize);

	let slide = <></>;
	switch (stepIndex) {
		case 0:
			slide = (
				<>
					<p className="title">{i18next.t('MODAL.TUTORIAL.WELCOME')}</p>
					<div className="playlists">
						<Trans
							i18nKey="MODAL.TUTORIAL.PLAYLIST"
							components={{ 2: <FontAwesomeIcon icon={faPlus} /> }}
						/>
						<br />
						<br />
						<div className="kara-line-image">
							<img src={TutoKaraLine} alt="KaraLine" />
							<p className="caption-left">
								<Trans
									i18nKey="MODAL.TUTORIAL.TITLE_CLICK"
									components={{ 1: !isLargeDevice ? <span /> : <span style={{ display: 'none' }} /> }}
								/>
								<br />
								<Trans
									i18nKey="MODAL.TUTORIAL.PLAY_BUTTONS"
									components={{
										1: <FontAwesomeIcon icon={faPlay} />,
										3: !isLargeDevice ? <span /> : <span style={{ display: 'none' }} />,
										5: <FontAwesomeIcon icon={faPlayCircle} />,
									}}
								/>
							</p>
							<p className="caption-right">
								<Trans
									i18nKey="MODAL.TUTORIAL.CHECK_CASE"
									components={{
										1: <FontAwesomeIcon icon={farSquare} />,
										3: <em />,
									}}
								/>
								<br />
								<Trans
									i18nKey="MODAL.TUTORIAL.ADD_TO_OTHER_PLAYLIST"
									components={{
										1: <FontAwesomeIcon icon={faPlus} />,
									}}
								/>
								<br />
								<Trans
									i18nKey="MODAL.TUTORIAL.WRENCH_BUTTON"
									components={{
										1: <FontAwesomeIcon icon={faWrench} />,
									}}
								/>
							</p>
						</div>
						<Trans
							i18nKey="MODAL.TUTORIAL.KARAOKE_PLAYED"
							components={{
								1: <span className="orange" />,
								2: <FontAwesomeIcon icon={faHistory} />,
							}}
						/>
						<br />
						<Trans
							i18nKey="MODAL.TUTORIAL.KARAOKE_PLAYING"
							components={{
								1: <span className="blue" />,
							}}
						/>
					</div>
				</>
			);
			break;
		case 1:
			slide = (
				<div className="header-presentation">
					<ul>
						<li>
							<FontAwesomeIcon icon={faCog} /> {i18next.t('MODAL.TUTORIAL.CREATE_PLAYLIST_BUTTON')}
						</li>
						<li>
							<FontAwesomeIcon icon={faListOl} /> {i18next.t('MODAL.TUTORIAL.SELECT_PLAYLIST_BUTTON')}
							<ul className="ul-l1">
								<li>
									<FontAwesomeIcon icon={faBook} /> {i18next.t('MODAL.TUTORIAL.LIBRARY')}
								</li>
								<li>
									<FontAwesomeIcon icon={faPencilAlt} />{' '}
									<Trans
										i18nKey="MODAL.TUTORIAL.PLAYLIST_ATTRIBUTES"
										components={{
											1: <strong />,
											3: <strong />,
										}}
									/>
								</li>
								<li>
									<FontAwesomeIcon icon={faPlayCircle} />{' '}
									<Trans i18nKey="MODAL.TUTORIAL.CURRENT_DESC" components={{ 1: <strong /> }} />
								</li>
								<li>
									<FontAwesomeIcon icon={faGlobe} />{' '}
									<Trans i18nKey="MODAL.TUTORIAL.PUBLIC_DESC" components={{ 1: <strong /> }} />
								</li>
								<li>
									<FontAwesomeIcon icon={faInfoCircle} />{' '}
									<Trans
										i18nKey="MODAL.TUTORIAL.CURRENT_PUBLIC_DESC"
										components={{
											1: <strong />,
											3: <strong />,
										}}
									/>
								</li>
								<li>
									<FontAwesomeIcon icon={faBan} /> {i18next.t('MODAL.TUTORIAL.BLACKLIST_DESC')}
								</li>
							</ul>
						</li>
					</ul>
				</div>
			);
			break;
		case 2:
			slide = (
				<div className="player-presentation">
					<p>{i18next.t('MODAL.TUTORIAL.PLAYER_BAR')}</p>
					<ul>
						<li>
							<FontAwesomeIcon icon={faPlayCircle} />
							<Trans i18nKey="MODAL.TUTORIAL.PLAYER_CURRENT_HINT" components={{ 1: <strong /> }} />
						</li>
						<li>
							<FontAwesomeIcon icon={faUndoAlt} />
							<Trans i18nKey="MODAL.TUTORIAL.PLAYER_GO_BACK" components={{ 1: <strong /> }} />
						</li>
						<li>
							<FontAwesomeIcon icon={faStop} />
							<Trans i18nKey="MODAL.TUTORIAL.PLAYER_STOP" components={{ 1: <strong /> }} />
						</li>
						<li>
							<FontAwesomeIcon icon={faComment} />
							{i18next.t('MODAL.TUTORIAL.MESSAGE')}
						</li>
						<li>
							<span className="klogo">
								<img src={KLogo} alt="Karaoke Mugen logo" />
							</span>
							{i18next.t('MODAL.TUTORIAL.K_MENU')}
						</li>
					</ul>
					<div className="center">
						<button onClick={nextStep} className="step inline">
							<FontAwesomeIcon icon={faCheck} /> {i18next.t('MODAL.TUTORIAL.END')}
						</button>
					</div>
				</div>
			);
			break;
		default:
			break;
	}
	return (
		<div className="tutorial">
			<div className={`dimmer${stepIndex > 0 ? ' transparent' : ''}${stepIndex === 2 ? ' player-bar' : ''}`} />
			{slide}
			<div className="steps">
				{stepIndex > 0 ? (
					<button onClick={previousStep} className="step back">
						<FontAwesomeIcon icon={faArrowLeft} /> {i18next.t('MODAL.TUTORIAL.BACK')}
					</button>
				) : null}
				{stepIndex < 2 ? (
					<button onClick={nextStep} className="step next">
						{i18next.t('MODAL.TUTORIAL.NEXT')} <FontAwesomeIcon icon={faArrowRight} />
					</button>
				) : null}
			</div>
		</div>
	);
}

export default Tutorial;
