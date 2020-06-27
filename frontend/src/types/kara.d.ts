import { DBPLC } from "../../../src/types/database/playlist";

interface KaraElement extends DBPLC {
	checked: boolean;
	flag_inplaylist: boolean;
	flag_added_by_me: boolean
}
