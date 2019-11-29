import React, { Component } from 'react';
import i18next from 'i18next';
import axios from 'axios';
import ReactDOM from 'react-dom';

class FavMixModal extends Component {
	constructor(props) {
		super(props);
		let userList = [];
		this.props.userList.forEach(element => {
			element.checked = element.flag_online;
			userList.push(element);
		});
		this.state = {
			duration: 5000,
			message: '',
			userList: userList 
		};
	}

    onClick = () => {
    	var userlistStr = this.state.userList.filter(value => value.checked).map(value => value.login).join();
    	var data = {duration: this.state.duration ? this.state.duration : 200, users: userlistStr};
    	axios.post('/api/admin/automix', data).then(response => {
    		this.props.changeIdPlaylist(response.data.data.playlist_id);
    	});
    	ReactDOM.unmountComponentAtNode(document.getElementById('modal'));
    };

    render() {
    	return (
    		<div className="modal modalPage">
    			<div className="modal-dialog modal-md">
    				<div className="modal-content">
    					<ul className="modal-header">
    						<label className="modal-title">{i18next.t('START_FAV_MIX')}</label>
    					</ul>
    					<div className="modal-body">
    						<div className="automixUserlist">
    							{this.state.userList.map(k =>
    								<div key={k.nickname} className="checkbox">
    									<label>
    										<input type="checkbox" name="users" defaultChecked={k.flag_online}
    											onChange={e => k.checked = e.target.checked}/>
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
