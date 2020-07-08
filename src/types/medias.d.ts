import { DBMedia } from './database/medias';


export interface Media extends DBMedia {
	series?: string
}

export type MediaType = 'Sponsors' | 'Intros' | 'Outros' | 'Jingles' | 'Encores'