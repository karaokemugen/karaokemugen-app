import i18next from 'i18next';
import { ChangeEvent, MouseEvent, useContext, useState } from 'react';

import { closeModal, showModal } from '../../../../store/actions/modal';
import GlobalContext from '../../../../store/context';
import type {
	KaraLineDisplayElement,
	KaraLineDisplayType,
	KaraLineElement,
	StyleFontType,
} from '../../../../../../src/lib/types/config';
import { tagTypes } from '../../../../utils/tagTypes';
import KaraLineDisplayModal from './KaraLineDisplayModal';
import KaraLineDisplayAddModalDndList from './KaraLineDisplayAddModalDndList';
import { Trans } from 'react-i18next';

interface IProps {
	karaLineDisplay: KaraLineDisplayElement[];
}

function KaraLineDisplayAddModal(props: IProps) {
	const context = useContext(GlobalContext);

	const [type, setType] = useState<KaraLineElement | KaraLineElement[]>();
	const [display, setDisplay] = useState<KaraLineDisplayType>('i18n');
	const [style, setStyle] = useState<StyleFontType>();

	const onClick = async () => {
		closeModal(context.globalDispatch);
		const newKaraLineDisplay = props.karaLineDisplay;
		newKaraLineDisplay.push({ type, display, style });
		showModal(context.globalDispatch, <KaraLineDisplayModal karaLineDisplay={newKaraLineDisplay} />);
	};

	const closeModalWithContext = () => {
		closeModal(context.globalDispatch);
		showModal(context.globalDispatch, <KaraLineDisplayModal karaLineDisplay={props.karaLineDisplay} />);
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
			arrayType.push(e.target.value as unknown as KaraLineElement);
			setType([...arrayType]);
		} else {
			setType(e.target.value as unknown as KaraLineElement);
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
								<KaraLineDisplayAddModalDndList type={type} setType={setType} />
							</div>
						) : null}
						<div className="text">
							{Array.isArray(type) ? (
								<Trans
									i18nKey="MODAL.KARA_LINE_DISPLAY.DESCRIPTION"
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
								<option key="FROM_DISPLAY_TYPE" value="displayType">
									{i18next.t('KARA.FROM_DISPLAY_TYPE')}
								</option>
							</select>
						</div>
						<div className="flex-column text">
							<div>{i18next.t('MODAL.KARA_LINE_ADD.STRING_TO_DISPLAY')}</div>
							<div>
								<input
									type="radio"
									id="shortformat"
									value="short"
									checked={display === 'short'}
									onChange={() => setDisplay('short')}
								/>
								<label htmlFor="shortformat" className="ml-1">
									{i18next.t('MODAL.KARA_LINE_ADD.STRING_TO_DISPLAY_SHORT')}
								</label>
							</div>
							<div>
								<input
									type="radio"
									id="i18nformat"
									value="i18n"
									checked={display === 'i18n'}
									onChange={() => setDisplay('i18n')}
								/>
								<label htmlFor="i18nformat" className="ml-1">
									{i18next.t('MODAL.KARA_LINE_ADD.STRING_TO_DISPLAY_LONG')}
								</label>
							</div>
							<div>
								<input
									type="radio"
									id="tagformat"
									value="tag"
									checked={display === 'tag'}
									onChange={() => {
										setStyle(undefined);
										setDisplay('tag');
									}}
								/>
								<label htmlFor="tagformat" className="ml-1">
									{i18next.t('MODAL.KARA_LINE_ADD.STRING_TO_DISPLAY_TAG')}
								</label>
							</div>
						</div>
						{display !== 'tag' ? (
							<div className="flex-column text">
								<div>{i18next.t('MODAL.KARA_LINE_ADD.STRING_FORMAT')}</div>
								<div>
									<input
										type="radio"
										id="none"
										value="none"
										checked={!style}
										onChange={() => setStyle(undefined)}
									/>
									<label htmlFor="none" className="ml-1">
										{i18next.t('MODAL.KARA_LINE_ADD.STRING_FORMAT_NONE')}
									</label>
								</div>
								<div>
									<input
										type="radio"
										id="bold"
										value="bold"
										checked={style === 'bold'}
										onChange={() => setStyle('bold')}
									/>
									<label htmlFor="bold" className="ml-1 bold">
										{i18next.t('MODAL.KARA_LINE_ADD.STRING_FORMAT_BOLD')}
									</label>
								</div>
								<div>
									<input
										type="radio"
										id="italic"
										value="italic"
										checked={style === 'italic'}
										onChange={() => setStyle('italic')}
									/>
									<label htmlFor="italic" className="ml-1 italic">
										{i18next.t('MODAL.KARA_LINE_ADD.STRING_FORMAT_ITALIC')}
									</label>
								</div>
							</div>
						) : null}
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

export default KaraLineDisplayAddModal;
