import './Modal.scss';

import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import { closeModal } from '../../store/actions/modal';
import GlobalContext from '../../store/context';

interface IProps {
	placeholder?: string;
	type: string;
	title: string;
	message: any;
	forceSmall: boolean | undefined;
	callback: (param?: boolean | string) => void;
	abortCallback?: boolean;
}

function Modal(props: IProps) {
	const context = useContext(GlobalContext);
	const [promptText, setPromptText] = useState(props.placeholder);

	const confirmModal = () => {
		if (props.callback) {
			if (props.type === 'confirm') {
				props.callback(true);
			} else if (props.type === 'prompt') {
				props.callback(promptText);
			} else {
				props.callback();
			}
		}
		closeModal(context.globalDispatch);
	};

	const abortModal = () => {
		if (props.abortCallback) {
			props.callback(false);
		}
		closeModal(context.globalDispatch);
	};

	const keyObserverHandler = (e: KeyboardEvent) => {
		if (e.code === 'Enter') {
			confirmModal();
		}
		if (e.code === 'Escape') {
			abortModal();
		}
	};

	useEffect(() => {
		document.addEventListener('keyup', keyObserverHandler);
		return () => {
			document.removeEventListener('keyup', keyObserverHandler);
		};
	}, []);

	const modalDialogClass = window.innerWidth <= 1023 || props.forceSmall ? 'modal-dialog modal-sm' : 'modal-dialog';
	return (
		<div className="modal modalPage" id="modalBox">
			<div className={modalDialogClass}>
				<div className="modal-content">
					<div className="modal-header">
						<h4 className="modal-title">{props.title}</h4>
					</div>
					{props.type === 'prompt' || (props.message && props.message !== '') ? (
						<div className="modal-body">
							<div className="modal-message">{props.message}</div>
							{props.type === 'prompt' ? (
								<div className="form">
									<input
										type="text"
										autoFocus
										className="modal-input"
										defaultValue={promptText}
										onChange={(event) => setPromptText(event.target.value)}
									/>
								</div>
							) : null}
						</div>
					) : null}
					<div className="modal-footer">
						{props.type === 'confirm' || props.type === 'prompt' ? (
							<button type="button" className="btn btn-action btn-primary other" onClick={abortModal}>
								<i className="fas fa-times" /> {i18next.t('NO')}
							</button>
						) : null}
						<button type="button" className="btn btn-action btn-default ok" onClick={confirmModal}>
							<i className="fas fa-check" /> {i18next.t('YES')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Modal;
