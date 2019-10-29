import React, { Component } from 'react';
import i18next from 'i18next';
import axios from 'axios';
import ReactDOM from 'react-dom';

class AdminMessageModal extends Component {
	constructor(props) {
		super(props);
		this.state = {
			duration: 5000,
			message: '',
			destination: 'screen'
		};
	}

    onClick = () => {
    	var defaultDuration = 5000;
    	var msgData = {
    		message: this.state.message,
    		destination: this.state.destination,
    		duration:
            !this.state.duration || isNaN(this.state.duration)
            	? defaultDuration
            	: this.state.duration
    	};
    	axios.post('/api/admin/player/message', msgData);
    	ReactDOM.unmountComponentAtNode(document.getElementById('modal'));
    };

    render() {
    	return (
    		<div className="modal modalPage">
    			<div className="modal-dialog modal-md">
    				<div className="modal-content">
    					<ul className="modal-header">
    						<label className="modal-title">{i18next.t('ESSENTIAL_MESSAGE')}</label>
    					</ul>
    					<div className="modal-body">
    						<select className="form-control" name="destination" onChange={(e => this.setState({destination: e.target.value}))}>
    							<option value="screen">{i18next.t('CL_SCREEN')}</option>
    							<option value="users">{i18next.t('CL_USERS')}</option>
    							<option value="all">{i18next.t('CL_ALL')}</option>
    						</select>
    						<input type="text" placeholder="5000 (ms)" onChange={e => this.setState({duration: e.target.value})}/>
    						<input type="text" placeholder="Message" className="form-control" onChange={e => this.setState({message: e.target.value})}/>
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

export default AdminMessageModal;
