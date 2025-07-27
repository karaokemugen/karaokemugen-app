import i18next from 'i18next';
import { MouseEvent, useContext, useState } from 'react';

import { closeModal, showModal } from '../../../../store/actions/modal';
import GlobalContext from '../../../../store/context';
import type { KaraLineDisplayElement } from '../../../../../../src/types/config';
import { buildKaraTitle } from '../../../../utils/kara';
import { karaokeExample } from '../../../../utils/karaexample';
import KaraLineDisplayAddModal from './KaraLineDisplayAddModal';
import KaraLineDisplayModalDndList from './KaraLineDisplayModalDndList';
import { commandBackend } from '../../../../utils/socket';
import { WS_CMD } from '../../../../utils/ws';
import { Trans } from 'react-i18next';

interface IProps {
	karaLineDisplay?: KaraLineDisplayElement[];
}

function KaraLineDisplayModal(props: IProps) {
	const context = useContext(GlobalContext);

	const [karaLineDisplay, setKaraLineDisplay] = useState([
		...(props.karaLineDisplay || context.globalState.settings.data.config.Frontend.Library.KaraLineDisplay),
	]);

	const saveSettings = () => {
		commandBackend(WS_CMD.UPDATE_SETTINGS, {
			setting: {
				Frontend: {
					Library: {
						KaraLineDisplay: karaLineDisplay,
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

	const getFutureConfig = () => {
		const futureConfig = structuredClone(context.globalState.settings.data);
		futureConfig.config.Frontend.Library.KaraLineDisplay = karaLineDisplay;
		return futureConfig;
	};

	const toggleKaraLineDisplayAddModal = () => {
		showModal(context.globalDispatch, <KaraLineDisplayAddModal karaLineDisplay={karaLineDisplay} />);
	};

	return (
		<div className="modal modalPage" onClick={onClickOutsideModal}>
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="modal-header">
						<h4 className="modal-title">{i18next.t('MODAL.KARA_LINE_DISPLAY.TITLE')}</h4>
						<button className="closeModal" onClick={closeModalWithContext}>
							<i className="fas fa-times" />
						</button>
					</ul>
					<div className="modal-body">
						<div className="text">
							<Trans
								i18nKey="MODAL.KARA_LINE_DISPLAY.DESCRIPTION"
								components={{
									1: <b />,
								}}
							/>
							<div>{i18next.t('MODAL.KARA_LINE_DISPLAY.DESCRIPTION_ADD_REMOVE')}</div>
						</div>
						<div className="text">
							<KaraLineDisplayModalDndList
								karaLineDisplay={karaLineDisplay}
								setKaraLineDisplay={setKaraLineDisplay}
							/>
						</div>
						<div className="text">
							<div>{i18next.t('MODAL.KARA_LINE_DISPLAY.EXAMPLE')}</div>
							<div>{buildKaraTitle(getFutureConfig(), karaokeExample)}</div>
						</div>
					</div>
					<div className="modal-footer flex-space-between">
						<button className="btn btn-action btn-primary" onClick={toggleKaraLineDisplayAddModal}>
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

export default KaraLineDisplayModal;
