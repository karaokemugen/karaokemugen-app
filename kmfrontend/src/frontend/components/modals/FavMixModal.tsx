import './FavMixModal.scss';

import i18next from 'i18next';
import React, {Component, MouseEvent} from 'react';
import ReactDOM from 'react-dom';

import { User } from '../../../../../src/lib/types/user';
import { commandBackend } from '../../../utils/socket';

interface IProps {
	userList: Array<User>;
	changeIdPlaylist: (idPlaylist: number) => void;
}

interface IState {
	userList: Array<User>;
	duration: number;
}

class FavMixModal extends Component<IProps, IState> {
	constructor(props: IProps) {
		super(props);
		this.state = {
			duration: 0,
			userList: this.props.userList
		};
	}

	onClick = async () => {
		if (this.state.duration === 0 || this.state.userList.filter(value => value.flag_online).length === 0) return;
		const userlistStr = this.state.userList.filter(value => value.flag_online).map(value => value.login);
		const data = { duration: this.state.duration !== 0 ? this.state.duration : 200, users: userlistStr };
		const res = await commandBackend('createAutomix', data);
		this.props.changeIdPlaylist(res.playlist_id);
		this.closeModal();
	};

	closeModal = () => {
		const element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
	};

	onClickOutsideModal = (e: MouseEvent) => {
		const el = document.getElementsByClassName('modal-dialog')[0];
		if (!el.contains((e.target as Node))) {
			this.closeModal();
		}
	}

	render() {
		return (
			<div className="modal modalPage" onClick={this.onClickOutsideModal}>
				<div className="modal-dialog">
					<div className="modal-content">
						<ul className="modal-header">
							<h4 className="modal-title">{i18next.t('AUTOMIX_MODAL.TITLE')}</h4>
							<button className="closeModal"
								onClick={this.closeModal}>
								<i className="fas fa-times" />
							</button>
						</ul>
						<div className="modal-body">
							<p className="autoMixExplanation">{i18next.t('AUTOMIX_MODAL.DESCRIPTION')}</p>
							<div className="autoMixUserlist">
								{this.state.userList.map(k =>
									<div key={k.nickname} className="checkbox">
										<label>
											<input type="checkbox" defaultChecked={k.flag_online}
												   onChange={e => k.flag_online = e.target.checked} />
											{k.nickname}
										</label>
									</div>
								)}
							</div>
							<input type="number" min="0" name="duration" onChange={e => this.setState({ duration: Number(e.target.value) })}
								   placeholder={i18next.t('AUTOMIX_MODAL.DURATION')} />
							<button className="btn btn-default confirm" onClick={this.onClick}>
								{this.state.duration === 0 || this.state.userList.filter(value => value.flag_online).length === 0 ? <>
									<i className="fas fa-fw fa-exclamation-triangle" /> {i18next.t('AUTOMIX_MODAL.EMPTY')}
								</>:<>
									<i className="fas fa-fw fa-check" /> {i18next.t('AUTOMIX_MODAL.MIX')}
								</>}
							</button>
						</div >
					</div >
				</div >
			</div >
		);
	}
}

export default FavMixModal;
