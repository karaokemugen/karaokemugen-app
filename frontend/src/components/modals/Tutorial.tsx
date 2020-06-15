import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import i18next from 'i18next';
import axios from 'axios';
import { is_touch_device } from '../tools';
import PropTypes from 'prop-types';
import ReactJoyride, { ACTIONS, EVENTS, STATUS, Step } from 'react-joyride';
import LoginModal from './LoginModal';
import store from '../../store';


export function i18nAsDiv(key:string, args?:any) {
	return (<div dangerouslySetInnerHTML={{__html: i18next.t(key, args)}}/>);
};

interface IProps {
	scope: string;
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

class Tutorial extends Component<IProps,IState> {
	constructor(props:IProps) {
		super(props);
		const isSmall =window.innerWidth <= 1023;

		this.state = {
			scope : props.scope,
			run: true,
			stepIndex: 0,
			steps: props.scope === 'admin' ? [
				{
					target: 'body',
					placement: 'center',
					content: i18nAsDiv('INTRO_ADMIN_INTRO1'), 
				}, 
				{
					target: '.modal-content',
					placement: 'right',
					content: i18nAsDiv('INTRO_ADMIN_INTRO2'),
					styles: {
						buttonNext: {
                            display: 'none'
						}
					},
				},
				{
					target: 'body',
					placement: 'center',
					content:i18nAsDiv('INTRO_ADMIN_EMAIL_ONLINE'), 
				},
				{
					target: 'body',
					placement: 'center',
					content:i18nAsDiv('INTRO_ADMIN_INTRO3'), 
				},
				{ 
					placement:'bottom',
					target:'.KmAppBodyDecorator',
					content: i18nAsDiv('INTRO_ADMIN_PLAYLISTS'),
				},
				{ 
					placement:'auto',
					target:'.KmAppHeaderDecorator',
					content: i18nAsDiv('INTRO_ADMIN_LECTEUR'),
				},
				{ 
					placement:'auto',
					target:'#KaraokePrivate',
					content: i18nAsDiv('INTRO_ADMIN_MODE'),
				},
				{ 
					placement:'auto',
					target:'#playlist',
					content: i18nAsDiv('INTRO_ADMIN_PLAYLISTS_2'),
				},
				{ 
					placement:'auto',
					target:'#panel2 .panel-heading.plDashboard',
					content: i18nAsDiv('INTRO_ADMIN_PLAYLISTS_MANAGE'),
				},
				{ 
					placement:'auto',
					target:'#panel2 .btn.btn-default.pull-left.showPlaylistCommands',
					content: i18nAsDiv('INTRO_ADMIN_PLAYLISTS_MANAGE_BUTTON'),
					hideFooter: true,
				},
				{ 
					placement:'left',
					target:'#panel2',
					content: i18nAsDiv('INTRO_ADMIN_PLAYLISTS_MANAGE_ADVANCED'),
				},
				{ 
					placement:'auto',
					target:'#optionsButton',
					content: i18nAsDiv('INTRO_ADMIN_SETTINGS'),
					hideFooter: true,
				},
				{ 
					placement:'auto',
					target:'#settingsNav',
					content: i18nAsDiv('INTRO_ADMIN_SETTINGS_SCREEN'),
					styles: {
						buttonBack: {
							display: 'none',
						}
					}
				},
				{ 
					placement:'center',
					target:'.panel.col-lg-8.modalPage',
					content: i18nAsDiv('INTRO_ADMIN_INTRO_DOWNLOAD'),
				},
				{ 
					placement:'center',
					target:'.panel.col-lg-8.modalPage',
					content: i18nAsDiv('INTRO_ADMIN_INTROFINAL'),
				}]
				:   // public tuto mobile
				is_touch_device() ? [{
					label: 'preLogin',
					placement: isSmall ? 'bottom' : 'right',
					target: '#nav-login > .modal-message:not(.tour)',
					content: i18nAsDiv('INTRO_PUBLIC_INTRO1'), 
					disableOverlay: true,
					disableBeacon: true,
					styles: {
						buttonNext: {
							display: 'none',
						},
					}
				},
				{ 
					placement: 'auto',
					target: '#panel1',
					content: i18nAsDiv('INTRO_PUBLIC_SEARCHRESULT')
				},
				{ 
					placement: 'auto',
					target: '.plFooter',
					content: i18nAsDiv('INTRO_PUBLIC_KARA'),
					disableOverlay: true,
					label: 'karadetails'
				},
				{
					target: '.plFooter',
					disableOverlay: true,
					placement: 'auto',
					content: i18nAsDiv('INTRO_PUBLIC_KARADETAILS')
				},
				{ 
					placement: 'auto',
					target: '.plFooter',
					label: "publicFooter",
					content: i18nAsDiv('INTRO_PUBLIC_FOOTER')
				},
				{ 
					label: 'public_menu',
					placement: 'auto',
					target: '.mobileActions > ul',
					content: i18nAsDiv('INTRO_PUBLIC_MENU'),
					styles: {
						tooltip: {
							width: 'calc(100vw - 128px)',
						},
					},
					disableOverlay: true,
				},
				{ 
					label: 'public_menu2',
					placement: 'auto',
					target: '.mobileActions > ul',
					content: i18nAsDiv('INTRO_PUBLIC_MENU_2'),
					styles: {
						tooltip: {
							width: 'calc(100vw - 128px)',
						},
					},
					disableOverlay: true,
				},
				{
					placement: 'auto',
					target: '#progressBar',
					content: i18nAsDiv('INTRO_PUBLIC_PROGRESSBAR')
				},
				{ 
					placement: 'auto',
					target: '.plSearch',
					content: i18nAsDiv('INTRO_PUBLIC_SEARCH')
				},
				{ 
					placement: 'right',
					target: '.searchMenuButton',
					content: i18nAsDiv('INTRO_PUBLIC_FAVORITES')
				},
				{
					target: '.side1Button',
					label: 'change_screen',
					placement: 'auto',
					content: i18nAsDiv('INTRO_PUBLIC_CHANGE_SCREEN'),
					disableOverlay: true,
					tooltipClass : 'hideNext',
					styles: {
						buttonNext: {
							display: 'none',
						}
					}
				},
				{
					target: '#playlist',
					label: 'playlists',
					placement: 'auto',
					content: store.getConfig().Karaoke.Private ? i18nAsDiv('INTRO_PUBLIC_PLAYLISTS') : i18nAsDiv('INTRO_PUBLIC_PLAYLISTS_LIKE'), 
				},
				{
					target: '.side2Button',
					label: 'change_screen2',
					placement: 'auto',
					content: i18nAsDiv('INTRO_PUBLIC_CHANGE_SCREEN2'),
					disableOverlay: true,
					tooltipClass : 'hideNext',
					styles: {
						buttonNext: {
							display: 'none',
						}
					}
				},
				{
					target: 'body',
					label: 'last',
					tooltipClass : 'hideNext',
					placement: 'center',
					content: i18nAsDiv('INTRO_PUBLIC_LAST'), 
				}
				] :
				// public non mobile
				[{
					label: 'preLogin',
					placement: isSmall ? 'bottom' : 'right',
					target: '#nav-login > .modal-message:not(.tour)',
					content: i18nAsDiv('INTRO_PUBLIC_INTRO1'), 
					disableOverlay: true,
					disableBeacon: true,
					styles: {
						buttonNext: {
							display: 'none',
						},
					}
				},
				{ 
					placement: 'auto',
					target: '#panel1',
					content: i18nAsDiv('INTRO_PUBLIC_SEARCHRESULT')
				},
				{ 
					placement: 'auto',
					target: '.plFooter',
					content: i18nAsDiv('INTRO_PUBLIC_KARA_WIDE'),
					disableOverlay: true,
					label: 'karadetails'
				},
				{
					target: '.plFooter',
					disableOverlay: true,
					placement: 'auto',
					content: i18nAsDiv('INTRO_PUBLIC_KARADETAILS')
				},
				{ 
					placement: 'auto',
					target: '.plFooter',
					label: "publicFooter",
					content: i18nAsDiv('INTRO_PUBLIC_FOOTER')
				},
				{
					placement: 'auto',
					target: '#progressBar',
					content: i18nAsDiv('INTRO_PUBLIC_PROGRESSBAR')
				},
				{ 
					label: 'public_menu_pc',
					placement: 'auto',
					target: '.buttonsNotMobile > ul',
					content: i18nAsDiv('INTRO_PUBLIC_MENU_PC'),
					disableOverlay: true,
				},
				{ 
					label: 'public_menu2',
					placement: 'auto',
					target: '.switchParent',
					content: i18nAsDiv('INTRO_PUBLIC_MENU_PC_2'),
					disableOverlay: true,
				},
				{ 
					placement: 'auto',
					target: '.plSearch',
					content: i18nAsDiv('INTRO_PUBLIC_SEARCH')
				},
				{ 
					placement: 'right',
					target: '.searchMenuButton',
					content: i18nAsDiv('INTRO_PUBLIC_FAVORITES')
				},
				{
					target: '#panel2',
					label: 'playlists',
					placement: 'auto',
					content: store.getConfig().Karaoke.Private ? i18nAsDiv('INTRO_PUBLIC_PLAYLISTS') : i18nAsDiv('INTRO_PUBLIC_PLAYLISTS_LIKE'), 
				},
				{
					target: 'body',
					label: 'last',
					tooltipClass : 'hideNext',
					placement: 'center',
					content: i18nAsDiv('INTRO_PUBLIC_LAST'), 
				}
				]
		};

	}
    
    
	componentDidMount() {
		if(this.state.scope === 'admin') {
			ReactDOM.render(<LoginModal 
				scope='admin'
				role='admin'
				activeView={2}
			/>, document.getElementById('modal'));
		}


	}
    static propTypes = {
    	joyride: PropTypes.shape({
    		callback: PropTypes.func
    	})
    };
    
    static defaultProps = {
    	joyride: {}
    };

    handleClickStart = (e:any) => {
    	e.preventDefault();
    
    	this.setState({
    		run: true
    	});

    };


	handleJoyrideCallback = (data:{ action:string, index:number, status: string, type:string }) => {
    	const { joyride }:any = this.props;
    	const { action, index, status, type } = data;
    	if(index===3 || this.state.steps[index].label === 'publicFooter') { 
			// if for some reasons the login modal is still open by now, we have to close it
			let element = document.getElementById('modal');
    		if(element) ReactDOM.unmountComponentAtNode(element);
    	}
    	if (type === EVENTS.TOUR_END && this.state.run) {
    		// Need to set our running state to false, so we can restart if we click start again.
    		this.setState({ run: false });
    	}
    	if (([STATUS.FINISHED, STATUS.SKIPPED] as Array<string>).includes(status)) {
    		if (this.state.scope  === 'admin') {
    			axios.put('/settings', { 'setting': JSON.stringify({ 'App': { 'FirstRun': false } } )});
    		} else {
    			localStorage.setItem('publicTuto', 'true');
    		}
    	}
    	if (([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND] as Array<string>).includes(type)) {
    		// Update state to advance the tour
    		if(this.state.steps[index + 1] && this.state.steps[index + 1].label === 'public_menu') {
    			(document.getElementById('menuMobile') as HTMLButtonElement).click();
    		} else if(this.state.steps[index + 1] && this.state.steps[index + 1].label === 'public_menu_pc') {
    			(document.getElementById('menuPC') as HTMLButtonElement).click();
    		}
    		if(this.state.steps[index].label === 'public_menu2') {
    			(document.getElementById('menuMobile') as HTMLButtonElement).click();
    		} else if(this.state.steps[index].label === 'public_menu_pc') {
    			(document.getElementById('menuPC') as HTMLButtonElement).click();
    		}
    		this.setState({ stepIndex: index + (action === ACTIONS.PREV ? -1 : 1) });
    	}
          
    	if (typeof joyride.callback === 'function') {
    		joyride.callback(data);
    	}
    };
    
    getStepLabel = () => {
    	const {stepIndex, steps} = this.state;
    	return steps[stepIndex].label || stepIndex;
	} 
	
    move = (i:number) => {
    	const {stepIndex} = this.state;

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
    					backgroundColor: 'hsla(133, 15%, 24%, .97)',
    					overlayColor: 'rgba(0, 0, 0, 0.7)',
    					textColor: '#eee',
    					zIndex: 20000
    				},
    				tooltip : {
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
    					backgroundColor: 'hsla(0, 0%, 0%, .76)'
    				},
    				buttonBack: {
    					color: '#eee',
    					backgroundColor: 'hsla(0, 0%, 0%, .3)'
    				},
    				buttonSkip: {
    					backgroundColor: 'hsla(0, 0%, 0%, .3)'
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
