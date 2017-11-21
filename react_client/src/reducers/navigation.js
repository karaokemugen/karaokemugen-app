import {
	INFO_MSG, WARN_MSG, ERROR_MSG, DISMISS_ALL, LOADING
} from '../actions/navigation';


export default function(state = {}, action) {
	switch(action.type) {
	case INFO_MSG:
		return { ...state, infomsg: action.message };
	case WARN_MSG:
		return { ...state, warnmsg: action.message };
	case ERROR_MSG:
		return { ...state, errormsg: action.message };
	case DISMISS_ALL:
		return { ...state, infomsg: '', warnmsg: '', errormsg: ''};
	case LOADING:
		return { ...state, loading: action.active};
	default:
		return state;
	}	
}