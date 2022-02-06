import { CloseModal, ModalAction, ModalStore, ShowModal } from '../types/modal';

export default function modalReducer(state: ModalStore, action: ShowModal | CloseModal) {
	switch (action.type) {
		case ModalAction.SHOW_MODAL:
		case ModalAction.CLOSE_MODAL:
			return {
				modal: action.payload?.modal || null,
			};
		default:
			return state;
	}
}
