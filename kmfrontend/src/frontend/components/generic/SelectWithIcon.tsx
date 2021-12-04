import './SelectWithIcon.scss';

import i18next from 'i18next';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Button, Menu, MenuItem, Wrapper } from 'react-aria-menubutton';

import { useResizeListener } from '../../../utils/hooks';

interface IProps {
	list: { value: string; label: string; icons?: string[] }[];
	value?: string;
	onChange: (value: string) => void;
}

function SelectWithIcon(props: IProps) {
	const [maxHeight, setMaxHeight] = useState(0);
	const [maxWidth, setMaxWidth] = useState(0);
	const menuRef = useRef<HTMLSpanElement>();

	const onResize = useCallback(() => {
		if (menuRef.current) {
			setMaxHeight(visualViewport.height - menuRef.current.getBoundingClientRect().bottom);
			setMaxWidth(visualViewport.width - menuRef.current.getBoundingClientRect().left);
		}
	}, []);

	useResizeListener(onResize);
	useEffect(() => {
		onResize();
	}, []);

	const select =
		props.value && props.list?.length > 0
			? props.list.filter((element) => props.value === element.value)[0]
			: undefined;
	return (
		<Wrapper onSelection={props.onChange} className="selectWithIcon">
			<Button className="selectWithIcon-trigger">
				<span className="selectWithIcon-triggerInnards" ref={menuRef}>
					{select?.icons
						? select.icons.map((icon) => {
							return (
								<Fragment key={icon}>
									<i className={`fas ${icon}`} />
									&nbsp;
								</Fragment>
							);
						})
						: null}
					<span className="selectWithIcon-label">
						{props.value ? select?.label : i18next.t('SELECT_PLACEHOLDER')}
					</span>
				</span>
			</Button>
			<Menu>
				<div className="selectWithIcon-menu" style={{['--maxh' as any]: `${maxHeight}px`, ['--maxw' as any]: `${maxWidth}px`}}>
					{props.list.map((element) => (
						<MenuItem value={element.value} key={element.value} className="selectWithIcon-menuItem">
							{element.icons
								? element.icons.map((icon) => {
									return (
										<Fragment key={icon}>
											<i className={`fas ${icon}`} />
											&nbsp;
										</Fragment>
									);
								})
								: null}
							<span className="selectWithIcon-label">{element.label}</span>
						</MenuItem>
					))}
				</div>
			</Menu>
		</Wrapper>
	);
}

export default SelectWithIcon;
