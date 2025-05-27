import './Tutorial.scss';

import i18next from 'i18next';
import { useState } from 'react';
import { Trans } from 'react-i18next';

import KLogo from '../../../assets/Klogo.png';
import TutoKaraLine from '../../../assets/tuto_karaline.png';
import { useResizeListener } from '../../../utils/hooks';
import { commandBackend } from '../../../utils/socket';
import { is_large_device } from '../../../utils/tools';
import { WS_CMD } from '../../../utils/ws';

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
							components={{ 2: <i className="fas fa-fw fa-plus" /> }}
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
										1: <i className="fas fa-fw fa-play" />,
										3: !isLargeDevice ? <span /> : <span style={{ display: 'none' }} />,
										5: <i className="fas fa-fw fa-play-circle" />,
									}}
								/>
							</p>
							<p className="caption-right">
								<Trans
									i18nKey="MODAL.TUTORIAL.CHECK_CASE"
									components={{
										1: <i className="far fa-fw fa-square" />,
										3: <em />,
									}}
								/>
								<br />
								<Trans
									i18nKey="MODAL.TUTORIAL.ADD_TO_OTHER_PLAYLIST"
									components={{
										1: <i className="fas fa-fw fa-plus" />,
									}}
								/>
								<br />
								<Trans
									i18nKey="MODAL.TUTORIAL.WRENCH_BUTTON"
									components={{
										1: <i className="fas fa-fw fa-wrench" />,
									}}
								/>
							</p>
						</div>
						<Trans
							i18nKey="MODAL.TUTORIAL.KARAOKE_PLAYED"
							components={{
								1: <span className="orange" />,
								2: <i className="fas fa-fw fa-history" />,
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
							<i className="fas fa-fw fa-cog" /> {i18next.t('MODAL.TUTORIAL.CREATE_PLAYLIST_BUTTON')}
						</li>
						<li>
							<i className="fas fa-fw fa-list-ol" /> {i18next.t('MODAL.TUTORIAL.SELECT_PLAYLIST_BUTTON')}
							<ul className="ul-l1">
								<li>
									<i className="fas fa-fw fa-book" /> {i18next.t('MODAL.TUTORIAL.LIBRARY')}
								</li>
								<li>
									<i className="fas fa-fw fa-pencil-alt" />{' '}
									<Trans
										i18nKey="MODAL.TUTORIAL.PLAYLIST_ATTRIBUTES"
										components={{
											1: <strong />,
											3: <strong />,
										}}
									/>
								</li>
								<li>
									<i className="fas fa-fw fa-play-circle" />{' '}
									<Trans i18nKey="MODAL.TUTORIAL.CURRENT_DESC" components={{ 1: <strong /> }} />
								</li>
								<li>
									<i className="fas fa-fw fa-globe" />{' '}
									<Trans i18nKey="MODAL.TUTORIAL.PUBLIC_DESC" components={{ 1: <strong /> }} />
								</li>
								<li>
									<i className="fas fa-fw fa-info-circle" />{' '}
									<Trans
										i18nKey="MODAL.TUTORIAL.CURRENT_PUBLIC_DESC"
										components={{
											1: <strong />,
											3: <strong />,
										}}
									/>
								</li>
								<li>
									<i className="fas fa-fw fa-ban" /> {i18next.t('MODAL.TUTORIAL.BLACKLIST_DESC')}
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
							<i className="fas fa-fw fa-play-circle" />
							<Trans i18nKey="MODAL.TUTORIAL.PLAYER_CURRENT_HINT" components={{ 1: <strong /> }} />
						</li>
						<li>
							<i className="fas fa-fw fa-undo-alt" />
							<Trans i18nKey="MODAL.TUTORIAL.PLAYER_GO_BACK" components={{ 1: <strong /> }} />
						</li>
						<li>
							<i className="fas fa-fw fa-stop" />
							<Trans i18nKey="MODAL.TUTORIAL.PLAYER_STOP" components={{ 1: <strong /> }} />
						</li>
						<li>
							<i className="fas fa-fw fa-comment" />
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
							<i className="fas fa-check" /> {i18next.t('MODAL.TUTORIAL.END')}
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
						<i className="fas fa-arrow-left" /> {i18next.t('MODAL.TUTORIAL.BACK')}
					</button>
				) : null}
				{stepIndex < 2 ? (
					<button onClick={nextStep} className="step next">
						{i18next.t('MODAL.TUTORIAL.NEXT')} <i className="fas fa-arrow-right" />
					</button>
				) : null}
			</div>
		</div>
	);
}

export default Tutorial;
