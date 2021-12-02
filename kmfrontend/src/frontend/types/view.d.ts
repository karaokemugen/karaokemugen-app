export type View = 'home' | 'favorites' | 'publicPlaylist' | 'currentPlaylist' | 'tag' | 'search' | 'history' | 'requested';
export type ChangeView = (view: View, tagType?: number, searchValue?: string, searchCriteria?: 'year' | 'tag') => void;
