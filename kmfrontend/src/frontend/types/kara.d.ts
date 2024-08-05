import { DBPLC } from '../../../../src/lib/types/database/playlist';
import { Criteria } from '../../../../src/lib/types/playlist';

interface KaraElement extends DBPLC {
	checked: boolean;
	criterias?: Criteria[];
	my_public_plc_id: number[];
	public_plc_id: number[];
}
