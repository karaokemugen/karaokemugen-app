import { KMFileType } from "../types/files";

export function detectKMFileTypes(data: any): KMFileType {
	return data?.header?.description || data?.Header?.description;
}