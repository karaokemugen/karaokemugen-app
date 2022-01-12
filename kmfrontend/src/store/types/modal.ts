import { ReactElement } from 'react';

export enum ModalAction {
	SHOW_MODAL = 'show_modal',
	CLOSE_MODAL = 'close_modal',
}

export interface ShowModal {
	type: ModalAction.SHOW_MODAL;
	payload: ModalStore;
}

export interface CloseModal {
	type: ModalAction.CLOSE_MODAL;
	payload: { modal: null };
}

export interface ModalStore {
	modal: ReactElement | null;
}
