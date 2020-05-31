import { DBKaraTag } from "../../lib/types/database/kara";

export interface DBKaraHistory {
	title: string,
	songorder: number,
	serie: string,
	singers: DBKaraTag[],
	songtypes: DBKaraTag[],
	languages: DBKaraTag[],
	played: number,
	played_at: Date
}


