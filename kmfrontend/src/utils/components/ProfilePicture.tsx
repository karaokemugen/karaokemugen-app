import React, { Component } from 'react';

import { User } from '../../../../src/lib/types/user';
import blankAvatar from '../../assets/blank.png';
import { generateProfilePicLink } from '../profilePics';

interface IProps extends React.ImgHTMLAttributes<HTMLImageElement> {
	user: User
}

interface IState {
	url: string
}

class ProfilePicture extends Component<IProps, IState> {
	constructor(props) {
		super(props);
		this.state = {
			url: blankAvatar
		};
	}

	componentDidMount() {
		if (this.props.user?.login) generateProfilePicLink(this.props.user).then(url => this.setState({ url }));
	}

	componentDidUpdate(prevProps: Readonly<IProps>) {
		if (prevProps.user.avatar_file !== this.props.user.avatar_file) {
			generateProfilePicLink(this.props.user).then(url => this.setState({ url }));
		}
	}

	render() {
		return (<img src={this.state.url} alt={this.props.user?.nickname} title={this.props.user?.nickname} {...this.props} />);
	}
}

export default ProfilePicture;
