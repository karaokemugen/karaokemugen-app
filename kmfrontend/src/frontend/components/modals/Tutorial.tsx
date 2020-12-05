import './Tutorial.scss';

import i18next from 'i18next';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import ReactJoyride, { ACTIONS, EVENTS, STATUS, Step } from 'react-joyride';

import { User } from '../../../../../src/lib/types/user';
import { commandBackend } from '../../../utils/socket';

export function i18nAsDiv(key: string, args?: any) {
	return (<div dangerouslySetInnerHTML={{ __html: i18next.t(key, args) }} />);
}

interface IState {
	scope: string;
	run: boolean;
	stepIndex: number;
	steps: Array<CustomStep>;
}

interface CustomStep extends Step {
	label?: string;
	tooltipClass?: string;
}

class Tutorial extends Component<unknown, IState> {
	constructor(props) {
		super(props);
		this.state = {
			scope: props.scope,
			run: true,
			stepIndex: 0,
			steps: [{
				target: 'body',
				placement: 'center',
				content: i18nAsDiv('INTRO_ADMIN_EMAIL_ONLINE'),
			},
			{
				target: 'body',
				placement: 'center',
				content: i18nAsDiv('INTRO_ADMIN_INTRO3'),
			},
			{
				placement: 'bottom',
				target: '.KmAppBodyDecorator',
				content: i18nAsDiv('INTRO_ADMIN_PLAYLISTS'),
			},
			{
				placement: 'auto',
				target: '.KmAppHeaderDecorator',
				content: i18nAsDiv('INTRO_ADMIN_LECTEUR'),
			},
			{
				placement: 'auto',
				target: '#switchValue',
				content: i18nAsDiv('INTRO_ADMIN_MYSTERY'),
			},
			{
				placement: 'auto',
				target: '#playlist',
				content: i18nAsDiv('INTRO_ADMIN_PLAYLISTS_2'),
			},
			{
				placement: 'auto',
				target: '#panel2 .panel-heading.plDashboard',
				content: i18nAsDiv('INTRO_ADMIN_PLAYLISTS_MANAGE'),
			},
			{
				placement: 'auto',
				target: '#panel2 .btn.btn-default.showPlaylistCommands',
				content: i18nAsDiv('INTRO_ADMIN_PLAYLISTS_MANAGE_BUTTON'),
				hideFooter: true,
			},
			{
				placement: 'left',
				target: '#panel2',
				content: i18nAsDiv('INTRO_ADMIN_PLAYLISTS_MANAGE_ADVANCED'),
			},
			{
				label: 'options_button',
				placement: 'auto',
				target: '#optionsButton',
				content: i18nAsDiv('INTRO_ADMIN_SETTINGS'),
				hideFooter: true,
			},
			{
				placement: 'auto',
				target: '#settingsNav',
				content: i18nAsDiv('INTRO_ADMIN_SETTINGS_SCREEN'),
				styles: {
					buttonBack: {
						display: 'none',
					}
				}
			},
			{
				placement: 'center',
				target: '.panel.col-lg-8.modalPage',
				content: i18nAsDiv('INTRO_ADMIN_INTRO_DOWNLOAD'),
			},
			{
				placement: 'center',
				target: '.panel.col-lg-8.modalPage',
				content: i18nAsDiv('INTRO_ADMIN_INTROFINAL'),
			}]
		};
	}

	static propTypes = {
		joyride: PropTypes.shape({
			callback: PropTypes.func
		})
	};

	static defaultProps = {
		joyride: {}
	};

	handleClickStart = (e: any) => {
		e.preventDefault();

		this.setState({
			run: true
		});

	};


	handleJoyrideCallback = async (data: { action: string, index: number, status: string, type: string }) => {
		const { joyride }: any = this.props;
		const { action, index, status, type } = data;
		if (type === EVENTS.TOUR_END && this.state.run) {
			// Need to set our running state to false, so we can restart if we click start again.
			this.setState({ run: false });
		}
		if (([STATUS.FINISHED, STATUS.SKIPPED] as Array<string>).includes(status)) {
			const user:User = await commandBackend('getMyAccount');
			user.flag_tutorial_done = true;
			await commandBackend('editMyAccount', user);
		}
		if (([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND] as Array<string>).includes(type)) {
			// Update state to advance the tour
			if (this.state.steps[index + 1]?.label === 'options_button') {
				document.getElementById('menuPC')?.click();
			}
			this.setState({ stepIndex: index + (action === ACTIONS.PREV ? -1 : 1) });
		}

		if (typeof joyride.callback === 'function') {
			joyride.callback(data);
		}
	};

	getStepLabel = () => {
		const { stepIndex, steps } = this.state;
		return steps[stepIndex]?.label || stepIndex;
	}

	move = (i: number) => {
		const { stepIndex } = this.state;

		this.setState({
			stepIndex: stepIndex + i
		});
	}

	render() {
		const { run, stepIndex, steps } = this.state;
		// more css details on https://github.com/gilbarbara/react-joyride/blob/3e08384415a831b20ce21c8423b6c271ad419fbf/src/styles.js
		return (<div>
			<ReactJoyride
				continuous
				scrollToFirstStep
				showProgress
				showSkipButton
				spotlightClicks
				run={run}
				steps={steps}
				stepIndex={stepIndex}
				locale={{
					back: i18next.t('INTRO_LABEL_PREV'),
					close: i18next.t('INTRO_LABEL_SKIP'),
					last: i18next.t('INTRO_LABEL_SKIP'),
					next: i18next.t('INTRO_LABEL_NEXT'),
					skip: i18next.t('INTRO_LABEL_SKIP'),
				}}
				styles={{
					options: {
						arrowColor: '#e3ffeb',
						backgroundColor: '#344638f7',
						overlayColor: '#000000b3',
						textColor: '#eee',
						zIndex: 20000
					},
					tooltip: {
						fontSize: 16,
					},
					tooltipContainer: {
						textAlign: 'left',
					},
					tooltipTitle: {
						textAlign: 'center',
						fontSize: 19,
						margin: '0 0 10px 0',
					},
					buttonNext: {
						borderRadius: 0,
						backgroundColor: '#000000c2'
					},
					buttonBack: {
						color: '#eee',
						backgroundColor: '#0000004d'
					},
					buttonSkip: {
						backgroundColor: '#0000004d'
					}

				}
				}
				callback={this.handleJoyrideCallback}
			/>
		</div>
		);
	}

}

export default Tutorial;
