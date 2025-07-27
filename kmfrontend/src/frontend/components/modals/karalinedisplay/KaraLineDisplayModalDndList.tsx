import i18next from 'i18next';

import type { KaraLineDisplayElement, KaraLineElement } from '../../../../../../src/types/config';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';

interface IProps {
	karaLineDisplay: KaraLineDisplayElement[];
	setKaraLineDisplay: (karaLineDisplay: KaraLineDisplayElement[]) => void;
}

function KaraLineDisplayModalDndList(props: IProps) {
	const removeElement = index => props.setKaraLineDisplay(props.karaLineDisplay.filter((_, i) => i !== index));

	const getLabel = (e: KaraLineElement) => {
		if (e === 'title') {
			return i18next.t('MODAL.KARA_LINE_DISPLAY.TITLE_ELEMENT');
		} else if (e === 'displayType') {
			return i18next.t('KARA.FROM_DISPLAY_TYPE');
		}
		return i18next.t(`TAG_TYPES.${e.toUpperCase()}_other`);
	};

	const reorder = (
		list: KaraLineDisplayElement[],
		startIndex: number,
		endIndex: number
	): KaraLineDisplayElement[] => {
		const result = Array.from(list);
		const [removed] = result.splice(startIndex, 1);
		result.splice(endIndex, 0, removed);

		return result;
	};

	const onDragEnd = result => {
		// dropped outside the list
		if (!result.destination) {
			return;
		}

		const items = reorder(props.karaLineDisplay, result.source.index, result.destination.index);

		props.setKaraLineDisplay([...items]);
	};

	return (
		<DragDropContext onDragEnd={onDragEnd}>
			<Droppable droppableId="droppable">
				{provided => (
					<div {...provided.droppableProps} ref={provided.innerRef}>
						{props.karaLineDisplay.map((e, index) => (
							<Draggable key={index} draggableId={index.toString()} index={index}>
								{provided => (
									<div
										ref={provided.innerRef}
										{...provided.draggableProps}
										{...provided.dragHandleProps}
										className={`flex-line flex-align-center ${e.style}`}
									>
										{`${index}. ${
											Array.isArray(e.type)
												? e.type.map(e => getLabel(e)).join(', ')
												: getLabel(e.type)
										} (${e.display})`}
										{e.type !== 'title' && (
											<button
												className="btn btn-default btn-action mt-1"
												onClick={() => removeElement(index)}
												title={i18next.t('MODAL.KARA_LINE_DISPLAY.REMOVE')}
											>
												<i className="fas fa-times" />
											</button>
										)}
									</div>
								)}
							</Draggable>
						))}
						{provided.placeholder}
					</div>
				)}
			</Droppable>
		</DragDropContext>
	);
}

export default KaraLineDisplayModalDndList;
