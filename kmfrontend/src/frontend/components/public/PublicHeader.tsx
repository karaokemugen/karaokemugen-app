import './PublicHeader.scss';

import i18next from 'i18next';
import React, {Component, createRef, Ref} from 'react';

import blankAvatar from '../../../assets/blank.png';
import nanamiPNG from '../../../assets/nanami.png';
import nanamiWebP from '../../../assets/nanami.webp';
import { logout } from '../../../store/actions/auth';
import GlobalContext from '../../../store/context';
import { getSocket } from '../../../utils/socket';
import { displayMessage, secondsTimeSpanToHMS } from '../../../utils/tools';
import { View } from '../../types/view';

interface IProps {
	openProfileModal: () => void;
	onResize: (top: string) => void;
	changeView: (view: View) => void;
}

interface IState {
	dropDownMenu: boolean;
	quotaType: number;
	quotaLeft: number;
	ref: Ref<HTMLElement>
	observer?: MutationObserver
}

class PublicHeader extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>
	observer: MutationObserver

	state = {
		dropDownMenu: false,
		quotaType: undefined,
		quotaLeft: undefined,
		ref: createRef<HTMLElement>()
	}

	componentDidMount() {
		getSocket().on('quotaAvailableUpdated', this.updateQuotaAvailable);
		window.addEventListener('resize', this.resizeCheck);
		this.props.onResize(`${this.state.ref.current.scrollHeight}px`);
		this.observer = new MutationObserver(this.resizeCheck);
		this.observer.observe(document.getElementById('menu-supp-root'), { attributes: true, childList: true, subtree: true });
	}

	componentWillUnmount() {
		getSocket().off('quotaAvailableUpdated', this.updateQuotaAvailable);
		window.removeEventListener('resize', this.resizeCheck);
		this.observer.disconnect();
	}

	toggleProfileModal = () => {
		this.setState({dropDownMenu: false});
		this.props.openProfileModal();
	};

	goToFavorites = () => {
		this.setState({dropDownMenu: false});
		this.props.changeView('favorites');
	}

	updateQuotaAvailable = (data: { username: string, quotaType: number, quotaLeft: number }) => {
		if (this.context.globalState.auth.data.username === data.username) {
			if (data.quotaLeft > 0 && this.state.quotaLeft === 0) {
				displayMessage('info', i18next.t('QUOTA_AVAILABLE'));
			}
			this.setState({ quotaType: data.quotaType, quotaLeft: data.quotaLeft });
		}
	};

	resizeCheck = () => {
		this.props.onResize(`${this.state.ref.current.scrollHeight}px`);
	};

	render() {
		return (
			<header className="menu-container" style={{['--img' as any]: this.context.globalState.frontendContext.backgroundImg}} ref={this.state.ref}>
				<div className="menu">
					<a href="#" className="nanamin-logo" onClick={() => this.props.changeView('home')}>
						<picture>
							<source srcSet={nanamiWebP} type='image/webp'/>
							<source srcSet={nanamiPNG} type='image/png'/>
							<img src={nanamiPNG} alt="Nanamin logo" />
						</picture>
					</a>
					<div className="profile-btn">
						<div className="dropdown-container">
							<div className={`closeHandler${this.state.dropDownMenu ? ' active':''}`} onClick={() => this.setState({ dropDownMenu: false })} />
							<a href="#" onClick={() => this.setState({dropDownMenu: !this.state.dropDownMenu})}>
								<img src={this.context.globalState.settings.data.user?.avatar_file ?
									`/avatars/${this.context.globalState.settings.data.user?.avatar_file}`
									: blankAvatar as string} alt={this.context.globalState.settings.data.user?.nickname} />
							</a>
							<div className={`dropdown ${this.state.dropDownMenu ? 'active' : ''}`}>
								<div className="header">{this.context.globalState.settings.data.user.nickname}</div>
								{this.state.quotaType === 1 ?
									<div className="info">
										<div className="title">{i18next.t('QUOTA_KARA')}&nbsp;:&nbsp;</div>
										<div className="data">{this.state.quotaLeft}</div>
									</div> : null
								}
								{this.state.quotaType === 2 ?
									<div className="info">
										<div className="title">{i18next.t('QUOTA_TIME')}&nbsp;:&nbsp;</div>
										<div className="data">{secondsTimeSpanToHMS(this.state.quotaLeft, 'ms')}</div>
									</div> : null
								}
								{this.context?.globalState.auth.data.role !== 'guest' ?
									<div className="link"><a href="#" onClick={this.goToFavorites}>
										<i className='fas fa-star'/> {i18next.t('VIEW_FAVORITES')}
									</a></div> : null
								}
								<div className="link"><a href="#" onClick={this.toggleProfileModal}>
									<i className="fas fa-user" /> {i18next.t('PROFILE')}
								</a></div>
								<div className="link"><a href="#" onClick={() => logout(this.context.globalDispatch)}>
									<i className="fas fa-sign-out-alt" /> {i18next.t('LOGOUT')}
								</a></div>
							</div>
						</div>
					</div>
				</div>
				<div id="menu-supp-root" />
			</header>
		);
	}
}

export default PublicHeader;
