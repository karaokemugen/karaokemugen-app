import { DBPLC } from '../../../src/types/database/playlist';

interface KaraElement extends DBPLC {
	checked: boolean;
	flag_inplaylist: boolean;
	my_public_plc_id: number[]
}
