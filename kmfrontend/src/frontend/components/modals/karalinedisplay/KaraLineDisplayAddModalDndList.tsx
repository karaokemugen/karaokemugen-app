import i18next from 'i18next';

import type { KaraLineElement } from '../../../../../../src/types/config';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';

interface IProps {
	type: KaraLineElement[];
	setType: (karaLineDisplay: KaraLineElement[]) => void;
}

function KaraLineDisplayAddModalDndList(props: IProps) {
	const removeElement = index => props.setType(props.type.filter((_, i) => i !== index));

	const getLabel = (e: KaraLineElement) => {
		if (e === 'displayType') {
			return i18next.t('KARA.FROM_DISPLAY_TYPE');
		}
		return i18next.t(`TAG_TYPES.${e.toUpperCase()}_other`);
	};

	const reorder = (list: KaraLineElement[], startIndex: number, endIndex: number): KaraLineElement[] => {
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

		const items = reorder(props.type, result.source.index, result.destination.index);

		props.setType([...items]);
	};

	return (
		<DragDropContext onDragEnd={onDragEnd}>
			<Droppable droppableId="droppable">
				{provided => (
					<div {...provided.droppableProps} ref={provided.innerRef}>
						{props.type.map((e, index) => (
							<Draggable key={index} draggableId={index.toString()} index={index}>
								{provided => (
									<div
										ref={provided.innerRef}
										{...provided.draggableProps}
										{...provided.dragHandleProps}
										className="flex-line flex-align-center"
									>
										{`${index}. ${getLabel(e)}`}
										<button
											className="btn btn-default btn-action mt-1"
											onClick={() => removeElement(index)}
											title={i18next.t('MODAL.KARA_LINE_DISPLAY.REMOVE')}
										>
											<i className="fas fa-times" />
										</button>
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

export default KaraLineDisplayAddModalDndList;
