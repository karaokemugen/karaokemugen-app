import React, { Component } from 'react';
import i18next from 'i18next';
import axios from 'axios';
import ReactDOM from 'react-dom';

interface IState {
	duration: number;
	message: string;
	destination: string;
}

class AdminMessageModal extends Component<{},IState> {
	constructor(props:{}) {
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
    	axios.post('/player/message', msgData);
		var element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
    };

    render() {
    	return (
    		<div className="modal modalPage">
    			<div className="modal-dialog modal-md">
    				<div className="modal-content">
    					<ul className="modal-header">
    						<h4 className="modal-title">{i18next.t('ESSENTIAL_MESSAGE')}</h4>
    						<button className="closeModal btn btn-action" 
								onClick={() => {
									var element = document.getElementById('modal');
									if (element) ReactDOM.unmountComponentAtNode(element);
								}}>
								<i className="fas fa-times"></i>
    						</button>
    					</ul>
    					<div className="modal-body">
    						<select className="form-control" name="destination" onChange={(e => this.setState({destination: e.target.value}))}>
    							<option value="screen">{i18next.t('CL_SCREEN')}</option>
    							<option value="users">{i18next.t('CL_USERS')}</option>
    							<option value="all">{i18next.t('CL_ALL')}</option>
    						</select>
    						<input type="text" placeholder="5000 (ms)" onChange={e => this.setState({duration: Number(e.target.value)})}/>
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
