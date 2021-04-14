
export interface Tag {
	type: Array<number|string>;
	value: string;
	label: string;
	karacount: Array<{count:number, type:number}>;
}