import i18next from 'i18next';
import { MouseEvent, useContext, useState } from 'react';

import { closeModal, showModal } from '../../../../store/actions/modal';
import GlobalContext from '../../../../store/context';
import type { KaraSortElement } from '../../../../../../src/types/config';
import { commandBackend } from '../../../../utils/socket';
import { WS_CMD } from '../../../../utils/ws';
import { Trans } from 'react-i18next';
import KaraLineSortModalDndList from './KaraLineSortModalDndList';
import KaraLineSortAddModal from './KaraLineSortAddModal';

interface IProps {
	karaLineSort?: KaraSortElement[];
}

function KaraLineSortModal(props: IProps) {
	const context = useContext(GlobalContext);

	const [karaLineSort, setKaraLineSort] = useState([
		...(props.karaLineSort || context.globalState.settings.data.config.Frontend.Library.KaraLineSort),
	]);

	const saveSettings = () => {
		commandBackend(WS_CMD.UPDATE_SETTINGS, {
			setting: {
				Frontend: {
					Library: {
						KaraLineSort: karaLineSort,
					},
				},
			},
		}).catch(() => {});
	};

	const onClick = async () => {
		saveSettings();
		closeModalWithContext();
	};

	const closeModalWithContext = () => closeModal(context.globalDispatch);

	const onClickOutsideModal = (e: MouseEvent) => {
		const el = document.getElementsByClassName('modal-dialog')[0];
		if (!el.contains(e.target as Node)) {
			closeModalWithContext();
		}
	};

	const toggleKaraLineSortAddModal = () => {
		showModal(context.globalDispatch, <KaraLineSortAddModal karaLineSort={karaLineSort} />);
	};

	return (
		<div className="modal modalPage" onClick={onClickOutsideModal}>
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="modal-header">
						<h4 className="modal-title">{i18next.t('MODAL.KARA_LINE_SORT.TITLE')}</h4>
						<button className="closeModal" onClick={closeModalWithContext}>
							<i className="fas fa-times" />
						</button>
					</ul>
					<div className="modal-body">
						<div className="text">
							<Trans
								i18nKey="MODAL.KARA_LINE_SORT.DESCRIPTION"
								components={{
									1: <b />,
								}}
							/>
							<div>{i18next.t('MODAL.KARA_LINE_SORT.DESCRIPTION_ADD_REMOVE')}</div>
						</div>
						<div className="text">
							<KaraLineSortModalDndList karaLineSort={karaLineSort} setKaraLineSort={setKaraLineSort} />
						</div>

						<div className="text">
							<i className="fas fa-fw fa-exclamation-circle" />{' '}
							{i18next.t('MODAL.KARA_LINE_SORT.WARNING_DESCRIPTION')}
						</div>
					</div>
					<div className="modal-footer flex-space-between">
						<button className="btn btn-action btn-primary" onClick={toggleKaraLineSortAddModal}>
							<i className="fas fa-plus" /> {i18next.t('ADD')}
						</button>
						<div className="flex-line">
							<button className="btn btn-action btn-primary other" onClick={closeModalWithContext}>
								<i className="fas fa-times" /> {i18next.t('CANCEL')}
							</button>
							<button className="btn btn-action btn-default ok" onClick={onClick}>
								<i className="fas fa-check" /> {i18next.t('SUBMIT')}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default KaraLineSortModal;
