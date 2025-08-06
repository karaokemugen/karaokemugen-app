import i18next from 'i18next';
import { ChangeEvent, MouseEvent, useContext, useState } from 'react';

import { closeModal, showModal } from '../../../../store/actions/modal';
import GlobalContext from '../../../../store/context';
import type { KaraSortElement, KaraSortType } from '../../../../../../src/types/config';
import { tagTypes } from '../../../../utils/tagTypes';
import { Trans } from 'react-i18next';
import KaraLineSortModal from './KaraLineSortModal';
import KaraLineSortAddModalDndList from './KaraLineSortAddModalDndList';

interface IProps {
	karaLineSort: KaraSortElement[];
}

function KaraLineSortAddModal(props: IProps) {
	const context = useContext(GlobalContext);

	const [type, setType] = useState<KaraSortElement>();

	const onClick = async () => {
		closeModal(context.globalDispatch);
		const newKaraLineSort = props.karaLineSort;
		newKaraLineSort.push(type);
		showModal(context.globalDispatch, <KaraLineSortModal karaLineSort={newKaraLineSort} />);
	};

	const closeModalWithContext = () => {
		closeModal(context.globalDispatch);
		showModal(context.globalDispatch, <KaraLineSortModal karaLineSort={props.karaLineSort} />);
	};

	const onClickOutsideModal = (e: MouseEvent) => {
		const el = document.getElementsByClassName('modal-dialog')[0];
		if (!el.contains(e.target as Node)) {
			closeModalWithContext();
		}
	};

	const addElement = (e: ChangeEvent<HTMLSelectElement>) => {
		if (Array.isArray(type)) {
			const arrayType = type;
			arrayType.push(e.target.value as unknown as KaraSortType);
			setType([...arrayType]);
		} else {
			setType(e.target.value as unknown as KaraSortElement);
		}
	};

	return (
		<div className="modal modalPage" onClick={onClickOutsideModal}>
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="modal-header">
						<h4 className="modal-title">{i18next.t('MODAL.KARA_LINE_ADD.TITLE')}</h4>
						<button className="closeModal" onClick={closeModalWithContext}>
							<i className="fas fa-times" />
						</button>
					</ul>
					<div className="modal-body">
						<div className="text flex-line">
							<input
								type="radio"
								id="tag"
								name="tag"
								value="tag"
								checked={!Array.isArray(type)}
								onChange={() => setType(undefined)}
							/>
							<label htmlFor="tag">{i18next.t('MODAL.KARA_LINE_ADD.TAG_TYPE')}</label>

							<input
								type="radio"
								id="array"
								name="array"
								value="array"
								checked={Array.isArray(type)}
								onChange={() => setType([])}
							/>
							<label htmlFor="array">{i18next.t('MODAL.KARA_LINE_ADD.TAG_TYPES_GROUP')}</label>
						</div>

						{Array.isArray(type) ? (
							<div className="text">
								<KaraLineSortAddModalDndList type={type} setType={setType} />
							</div>
						) : null}
						<div className="text">
							{Array.isArray(type) ? (
								<Trans
									i18nKey="MODAL.KARA_LINE_SORT.DESCRIPTION"
									components={{
										1: <b />,
									}}
								/>
							) : null}
							<div>
								{Array.isArray(type)
									? i18next.t('MODAL.KARA_LINE_ADD.ADD_TAG_TYPES_GROUP')
									: i18next.t('MODAL.KARA_LINE_ADD.ADD_TAG_TYPE')}
							</div>
							<select value={type} onChange={addElement}>
								<option hidden key="empty" value=""></option>
								{Object.entries(tagTypes).map(([key]) => (
									<option key={key} value={key.toLowerCase()}>
										{i18next.t(`TAG_TYPES.${key}_other`)}
									</option>
								))}
								<option key="PARENTS" value="parents">
									{i18next.t('KARA.PARENTS')}
								</option>
								<option key="FROM_DISPLAY_TYPE" value="displayType">
									{i18next.t('KARA.FROM_DISPLAY_TYPE')}
								</option>
							</select>
						</div>
					</div>
					<div className="modal-footer">
						<button className="btn btn-action btn-primary other" onClick={closeModalWithContext}>
							<i className="fas fa-times" /> {i18next.t('CANCEL')}
						</button>
						<button
							disabled={(Array.isArray(type) && type.length === 0) || !type}
							className="btn btn-action btn-default ok"
							onClick={onClick}
						>
							<i className="fas fa-plus" /> {i18next.t('ADD')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default KaraLineSortAddModal;
