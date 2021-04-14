import {Dispatch} from 'react';

import {BackgroundImage, CurrentBlSet, FilterValue, FrontendContextAction} from '../types/frontendContext';

export function setCurrentBlSet(dispatch: Dispatch<CurrentBlSet>, currentBlSet) {
	dispatch({
		type: FrontendContextAction.CURRENT_BL_SET,
		payload: { currentBlSet }
	});
}

export function setFilterValue(dispatch: Dispatch<FilterValue>, filterValue, side, idPlaylist) {
	dispatch({
		type: FrontendContextAction.FILTER_VALUE,
		payload: { filterValue, side, idPlaylist }
	});
}

export function setBgImage(dispatch: Dispatch<BackgroundImage>, backgroundImg) {
	dispatch({
		type: FrontendContextAction.BG_IMAGE,
		payload: { backgroundImg }
	});
}
