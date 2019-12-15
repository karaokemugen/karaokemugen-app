import React, { Component } from 'react';
import i18next from 'i18next';
import axios from 'axios';
import ReactDOM from 'react-dom';
import { User } from '../../../../src/lib/types/user';

interface IProps {
	userList: Array<User>;
	changeIdPlaylist: (idPlaylist:number) => void;
}

interface IState {
	userList: Array<User>;
	duration: number;
	message: string;
}

class FavMixModal extends Component<IProps,IState> {
	constructor(props:IProps) {
		super(props);
		this.state = {
			duration: 5000,
			message: '',
			userList: this.props.userList 
		};
	}

    onClick = () => {
    	var userlistStr = this.state.userList.filter(value => value.flag_online).map(value => value.login).join();
    	var data = {duration: this.state.duration ? this.state.duration : 200, users: userlistStr};
    	axios.post('/api/admin/automix', data).then(response => {
    		this.props.changeIdPlaylist(response.data.data.playlist_id);
    	});
		var element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
    };

    render() {
    	return (
    		<div className="modal modalPage">
    			<div className="modal-dialog modal-md">
    				<div className="modal-content">
    					<ul className="modal-header">
    						<h4 className="modal-title">{i18next.t('START_FAV_MIX')}</h4>
							<button className="closeModal btn btn-action" 
								onClick={() => ReactDOM.unmountComponentAtNode(document.getElementById('modal'))}>
								<i className="fas fa-times"></i>
							</button>
    					</ul>
    					<div className="modal-body">
    						<div className="automixUserlist">
    							{this.state.userList.map(k =>
    								<div key={k.nickname} className="checkbox">
    									<label>
    										<input type="checkbox" name="users" defaultChecked={k.flag_online}
    											onChange={e => k.flag_online = e.target.checked}/>
    										{k.nickname}
    									</label>
    								</div>
    							)}
    						</div>
    						<input type="text"name="duration" placeholder="200 (min)"/>
    						<button className="btn btn-default confirm" onClick={this.onClick}>
    							<i className="fas fa-check"></i>
    						</button>
    					</div >
    				</div >
    			</div >
    		</div >
    	);
    }
}

export default FavMixModal;
