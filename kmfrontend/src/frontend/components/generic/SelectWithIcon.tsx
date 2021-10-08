import './SelectWithIcon.scss';

import i18next from 'i18next';
import React from 'react';
import { Button, Menu, MenuItem, Wrapper } from 'react-aria-menubutton';

interface IProps {
	list: { value: string; label: string; icons?: string[] }[];
	value?: string;
	onChange: (value: string) => void;
}

function SelectWithIcon(props: IProps) {
	const select =
		props.value && props.list?.length > 0
			? props.list.filter((element) => props.value === element.value)[0]
			: undefined;
	return (
		<Wrapper onSelection={props.onChange} className="selectWithIcon">
			<Button className="selectWithIcon-trigger">
				<span className="selectWithIcon-triggerInnards">
					{select?.icons
						? select.icons.map((icon) => {
							return (
								<React.Fragment key={icon}>
									<i className={`fas ${icon}`} />
										&nbsp;
								</React.Fragment>
							);
						  })
						: null}
					<span className="selectWithIcon-label">
						{props.value ? select?.label : i18next.t('SELECT_PLACEHOLDER')}
					</span>
				</span>
			</Button>
			<Menu>
				<div className="selectWithIcon-menu">
					{props.list.map((element) => (
						<MenuItem value={element.value} key={element.value} className="selectWithIcon-menuItem">
							{element.icons
								? element.icons.map((icon) => {
									return (
										<React.Fragment key={icon}>
											<i className={`fas ${icon}`} />
												&nbsp;
										</React.Fragment>
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
