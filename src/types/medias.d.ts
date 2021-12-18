export interface Media {
	series?: string;
	filename: string;
	type: MediaType;
}

export type MediaType = 'Sponsors' | 'Intros' | 'Outros' | 'Jingles' | 'Encores';
