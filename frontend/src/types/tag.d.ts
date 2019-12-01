import { DBKaraTag } from "../../../src/lib/types/database/kara";

interface Tag extends DBKaraTag {
	type: Array<number|string>;
}