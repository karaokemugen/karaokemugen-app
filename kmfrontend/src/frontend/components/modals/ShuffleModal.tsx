import i18next from 'i18next';
import { useContext, useState } from 'react';
import { DBPL } from '../../../../../src/lib/types/database/playlist';

import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';

interface IProps {
	playlist: DBPL;
}

function ShuffleModal(props: IProps) {
	const context = useContext(GlobalContext);
	const [fullShuffle, setFullShuffle] = useState(false);

	const shuffle = async (method: string) => {
		await commandBackend('shufflePlaylist', {
			plaid: props.playlist.plaid,
			method: method,
			fullShuffle: fullShuffle,
		});
		closeModalWithContext();
	};

	const closeModalWithContext = () => closeModal(context.globalDispatch);

	return (
		<div className="modal modalPage">
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="modal-header">
						<h4 className="modal-title">{i18next.t('MODAL.SHUFFLE_MODAL.TITLE')}</h4>
						<button className="closeModal" onClick={closeModalWithContext}>
							<i className="fas fa-times"></i>
						</button>
					</ul>
					<div className="modal-body flex-direction-btns">
						{props.playlist.flag_current ? (
							<div onClick={() => setFullShuffle(!fullShuffle)}>
								<input
									className="modal-checkbox"
									type="checkbox"
									checked={fullShuffle}
									onChange={() => setFullShuffle(!fullShuffle)}
								/>
								{i18next.t('MODAL.SHUFFLE_MODAL.MIX_ALREADY_PASSED_SONGS')}
							</div>
						) : null}
						<div>{i18next.t('MODAL.SHUFFLE_MODAL.LABEL')}</div>
						<div>
							<button className="btn btn-default" type="button" onClick={() => shuffle('normal')}>
								<i className="fas fa-fw fa-random fa-2x" />
								<div className="btn-large-container">
									<div className="title">{i18next.t('MODAL.SHUFFLE_MODAL.SHUFFLE')}</div>
									<div className="desc">{i18next.t('MODAL.SHUFFLE_MODAL.SHUFFLE_DESC')}</div>
								</div>
							</button>
						</div>
						<div>
							<button className="btn btn-default" type="button" onClick={() => shuffle('smart')}>
								<i className="fas fa-fw fa-lightbulb fa-2x" />
								<div className="btn-large-container">
									<div className="title">{i18next.t('MODAL.SHUFFLE_MODAL.SMART_SHUFFLE')}</div>
									<div className="desc">{i18next.t('MODAL.SHUFFLE_MODAL.SMART_SHUFFLE_DESC')}</div>
								</div>
							</button>
						</div>
						<div>
							<button className="btn btn-default" type="button" onClick={() => shuffle('balance')}>
								<i className="fas fa-fw fa-balance-scale fa-2x" />
								<div className="btn-large-container">
									<div className="title">{i18next.t('MODAL.SHUFFLE_MODAL.BALANCE')}</div>
									<div className="desc">{i18next.t('MODAL.SHUFFLE_MODAL.BALANCE_DESC')}</div>
								</div>
							</button>
						</div>
						<div>
							<button className="btn btn-default" type="button" onClick={() => shuffle('upvotes')}>
								<i className="fas fa-fw fa-thumbs-up fa-2x" />
								<div className="btn-large-container">
									<div className="title">{i18next.t('MODAL.SHUFFLE_MODAL.SORTUPVOTES')}</div>
									<div className="desc">{i18next.t('MODAL.SHUFFLE_MODAL.SORTUPVOTES_DESC')}</div>
								</div>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default ShuffleModal;
