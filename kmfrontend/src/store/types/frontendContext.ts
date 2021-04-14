// Action name
export enum FrontendContextAction {
    CURRENT_BL_SET = 'currentBlSet',
    FILTER_VALUE = 'filterValue',
	BG_IMAGE = 'bgImage'
}

// Dispatch action
export interface CurrentBlSet {
    type: FrontendContextAction.CURRENT_BL_SET;
    payload: {
        currentBlSet: number
    };
}

export interface FilterValue {
    type: FrontendContextAction.FILTER_VALUE;
    payload: {
        filterValue: number,
        side: number,
        idPlaylist: number
    };
}

export interface BackgroundImage {
	type: FrontendContextAction.BG_IMAGE,
	payload: {
		backgroundImg: string
	}
}

// store
export interface FrontendContextStore {
	loading: boolean,
	currentBlSet: number,
	filterValue1: string,
    filterValue2: string,
	backgroundImg: string
}
