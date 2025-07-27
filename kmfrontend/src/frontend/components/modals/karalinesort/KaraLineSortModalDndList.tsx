import i18next from 'i18next';

import type { KaraSortElement } from '../../../../../../src/types/config';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';

interface IProps {
	karaLineSort: KaraSortElement[];
	setKaraLineSort: (karaLineSort: KaraSortElement[]) => void;
}

function KaraLineSortModalDndList(props: IProps) {
	const removeElement = index => props.setKaraLineSort(props.karaLineSort.filter((_, i) => i !== index));

	const getLabel = (e: KaraSortElement) => {
		if (Array.isArray(e)) {
			return e.map(value => getLabel(value)).join(', ');
		} else if (e === 'title') {
			return i18next.t('MODAL.KARA_LINE_DISPLAY.TITLE_ELEMENT');
		} else if (e === 'parents') {
			return i18next.t('KARA.PARENTS');
		}
		return i18next.t(`TAG_TYPES.${e.toUpperCase()}_other`);
	};

	const reorder = (list: KaraSortElement[], startIndex: number, endIndex: number): KaraSortElement[] => {
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

		const items = reorder(props.karaLineSort, result.source.index, result.destination.index);

		props.setKaraLineSort([...items]);
	};

	return (
		<DragDropContext onDragEnd={onDragEnd}>
			<Droppable droppableId="droppable">
				{provided => (
					<div {...provided.droppableProps} ref={provided.innerRef}>
						{props.karaLineSort.map((e, index) => (
							<Draggable key={index} draggableId={index.toString()} index={index}>
								{provided => (
									<div
										ref={provided.innerRef}
										{...provided.draggableProps}
										{...provided.dragHandleProps}
										className="flex-line flex-align-center"
									>
										{`${index}. ${getLabel(e)}`}
										{e !== 'title' && (
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

export default KaraLineSortModalDndList;
