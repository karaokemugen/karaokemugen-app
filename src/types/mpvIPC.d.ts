export interface MpvCommand {
	command: any[];
	request_id?: number;
}

export type MpvHardwareDecodingOptions = 'auto-safe' | 'no' | 'yes';
