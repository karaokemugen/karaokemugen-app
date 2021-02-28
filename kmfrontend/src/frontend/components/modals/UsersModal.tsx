import './UsersModal.scss';

import i18next from 'i18next';
import React, { Component } from 'react';

import { User } from '../../../../../src/lib/types/user';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import ProfilePicture from '../../../utils/components/ProfilePicture';
import { commandBackend } from '../../../utils/socket';

interface IProps {
	scope?: 'public' | 'admin';
	closeModal?: () => void;
}

interface IState {
	users: Array<User>;
	userDetails?: User;
}

class UsersModal extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			users: [],
		};
	}

	componentDidMount() {
		if (this.context?.globalState.auth.data.role === 'admin' || this.context?.globalState.settings.data.config?.Frontend?.Mode !== 0) this.getUserList();
	}

	async getUserList() {
		const response = await commandBackend('getUsers');
		this.setState({ users: response.filter((a: User) => a.flag_online) });
	}

	getUserDetails = async (user: User) => {
		if (this.state.userDetails?.login === user.login) {
			this.setState({ userDetails: undefined });
		} else {
			const response = await commandBackend('getUser', { username: user.login });
			this.setState({ userDetails: response });
		}
	};

	closeModal = () => {
		if (this.props.scope === 'public') {
			this.props.closeModal();
		} else {
			closeModal(this.context.globalDispatch);
		}
	}

	render() {
		const body = (<div className="modal-content">
			<div className="modal-header">
				<h4 className="modal-title">{i18next.t('USERLIST')}</h4>
				{this.props.scope === 'admin' ? // aka. it's a modal, otherwise it's a page and close button is not needed
					<button className="closeModal"
						onClick={this.closeModal}>
						<i className="fas fa-fw fa-times" />
					</button>:null
				}
			</div>
			<div id="nav-userlist" className="modal-body">
				<div className="userlist list-group">
					{this.state.users.map(user => {
						return <li key={user.login} className={user.flag_online ? 'list-group-item online' : 'list-group-item'}>
							<div className="userLine" onClick={() => this.getUserDetails(user)}>
								<ProfilePicture user={user} className="img-circle avatar" />
								<span className="nickname">{user.nickname}</span>
							</div>
							{this.state.userDetails?.login === user.login ?
								<div className="userDetails">
									<div><i className="fas fa-fw fa-link" />{this.state.userDetails?.url ?
										<a href={this.state.userDetails.url} target="_blank">{this.state.userDetails.url}</a>:null}</div>
									<div><i className="fas fa-fw fa-leaf" />{this.state.userDetails?.bio || ''}</div>
								</div> : null
							}
						</li>;
					})}
				</div>
			</div>
		</div>);
		return (
			this.props.scope === 'public' ?
				body
				: <div className="modal modalPage">
					<div className="modal-dialog">
						{body}
					</div>
				</div>
		);
	}
}

export default UsersModal;
