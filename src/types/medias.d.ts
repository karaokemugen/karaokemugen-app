export interface Media {
	file: string,
	gain: number,
	series?: string
}

export type MediaType = 'Sponsors' | 'Intros' | 'Outros' | 'Jingles' | 'Encores'