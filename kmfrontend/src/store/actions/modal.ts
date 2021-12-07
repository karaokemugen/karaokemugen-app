import { Dispatch, ReactElement } from 'react';

import { CloseModal, ModalAction, ShowModal } from '../types/modal';

export function showModal(dispatch: Dispatch<ShowModal>, modal: ReactElement) {
	dispatch({
		type: ModalAction.SHOW_MODAL,
		payload: { modal },
	});
}

export function closeModal(dispatch: Dispatch<CloseModal>) {
	dispatch({
		type: ModalAction.CLOSE_MODAL,
		payload: { modal: null },
	});
}
