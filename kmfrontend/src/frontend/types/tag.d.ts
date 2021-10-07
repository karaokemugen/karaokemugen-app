
export interface Tag {
	type: Array<number | string>;
	value: string;
	label: string;
	karacount: { count: number, type: number }[];
}