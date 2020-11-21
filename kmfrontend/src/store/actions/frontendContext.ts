import {Dispatch} from 'react';

import {BackgroundImage, CurrentBlSet, FilterValue, FrontendContextAction, PosPlaying} from '../types/frontendContext';

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

export function setPosPlaying(dispatch: Dispatch<PosPlaying>, posPlaying, side) {
	dispatch({
		type: FrontendContextAction.POS_PLAYING,
		payload: { posPlaying, side }
	});
}

export function setBgImage(dispatch: Dispatch<BackgroundImage>, backgroundImg) {
	dispatch({
		type: FrontendContextAction.BG_IMAGE,
		payload: { backgroundImg }
	});
}
