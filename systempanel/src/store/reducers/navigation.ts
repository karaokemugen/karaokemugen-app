import { Navigation } from '../actions/navigation';

export default function (state, action) {
	switch (action.type) {
	case Navigation.INFO_MSG:
		return { ...state, infomsg: action.message };
	case Navigation.ERROR_MSG:
		return { ...state, errormsg: action.message };
	case Navigation.LOADING:
		return { ...state, loading: action.active };
	default:
		return state;
	}
}