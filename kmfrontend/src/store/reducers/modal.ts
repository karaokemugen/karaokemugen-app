import { CloseModal, ModalStore, ShowModal } from '../types/modal';

export default function (_state: ModalStore, action: ShowModal | CloseModal) {
	return {
		modal: action.payload?.modal || null,
	};
}
