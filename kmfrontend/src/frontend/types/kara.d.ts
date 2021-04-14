import { DBPLC } from '../../../../src/types/database/playlist';

interface KaraElement extends DBPLC {
	checked: boolean;
	my_public_plc_id: number[];
	public_plc_id: number[];
}
