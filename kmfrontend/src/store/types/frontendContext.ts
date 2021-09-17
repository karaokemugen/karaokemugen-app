// Action name
export enum FrontendContextAction {
    FILTER_VALUE = 'filterValue',
    BG_IMAGE = 'bgImage'
}

// Dispatch action
export interface FilterValue {
    type: FrontendContextAction.FILTER_VALUE;
    payload: {
        filterValue: string,
        side: 'left' | 'right',
        idPlaylist: string
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
    filterValue1: string,
    filterValue2: string,
    backgroundImg: string
}
