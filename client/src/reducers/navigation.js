import {
	INFO_MSG, WARN_MSG, ERROR_MSG, DISMISS_INFO, DISMISS_WARN, DISMISS_ERROR,
	DISMISS_ALL
} from '../actions/navigation';


export default function(state = {}, action) {
	switch(action.type) {
		case INFO_MSG:
			return { ...state, infomsg: action.message };
		case WARN_MSG:
			return { ...state, warnmsg: action.message };
		case ERROR_MSG:
			return { ...state, errormsg: action.message };
		case DISMISS_INFO:
			return { ...state, infomsg: '' };
		case DISMISS_WARN:
			return { ...state, warnmsg: '' };
		case DISMISS_ERROR:
			return { ...state, errormsg: '' };
		case DISMISS_ALL:
			return { ...state, infomsg: '', warnmsg: '', errormsg: ''};
	}
	return state;
}