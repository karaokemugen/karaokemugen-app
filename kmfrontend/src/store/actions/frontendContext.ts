import { Dispatch } from 'react';

import { BackgroundImage, FilterValue, FrontendContextAction } from '../types/frontendContext';

export function setFilterValue(dispatch: Dispatch<FilterValue>, filterValue: string, side: 'left' | 'right', idPlaylist: string) {
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
