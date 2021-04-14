export interface BLC {
	blcriteria_id?: number,
	type: number,
	value: any,
	value_i18n?: string,
	blc_set_id: number,
}

export interface BLCSet {
	blc_set_id?: number,
	name?: string,
	created_at?: Date,
	modified_at?: Date,
	flag_current?: boolean
}

export interface BLCSetFile {
	header: {
		description: string,
		version: number
	},
	blcSetInfo: BLCSet,
	blcSet: BLC[]
}