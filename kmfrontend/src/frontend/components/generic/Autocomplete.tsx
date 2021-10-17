// ------------------------------------------------------------------------
// ------------------------------------------------------------------------
// AUTOCOMPLETE COMPONENT
// ------------------------------------------------------------------------
// ------------------------------------------------------------------------

import './Autocomplete.scss';

import { useEffect, useRef, useState } from 'react';

interface IProps {
	options?: any[];
	placeholder?: string;
	value: any;
	acceptNewValues?: boolean;
	onChange: (value: any) => void;
	forceTop?: boolean;
}

function Autocomplete(props: IProps) {
	const options = props.options || [];

	const node: any = useRef();
	const [placeholder, setPlaceholder] = useState(props.placeholder || undefined);
	const [selectedValue, setSelectedValue] = useState(props.value || '');

	let temp: string | any[] = '';
	if (selectedValue) {
		temp = options.filter((o) => o.value === selectedValue);
		if (temp.length) temp = temp[0].label;
	}
	const [searchValue, setSearchValue] = useState(temp);

	if (props.value !== selectedValue) {
		setSelectedValue(props.value);
		setSearchValue(props.value);
	}

	const searchInputRef: any = useRef();
	const [activeIndex, setActiveIndex] = useState(0);
	const [focus, setFocus] = useState(false);

	const updateSelectedValue = (v: any) => {
		setSelectedValue(v);
		if (typeof props.onChange === 'function') props.onChange(v);
		return;
	};

	// INPUT USER EVENT
	const handleInputFocus = () => {
		setTimeout(() => setFocus(true), 250);
		setSearchValue('');
	};

	const handleInputClick = () => {
		setFocus(!focus);
	};

	// SEARCH USER EVENT
	const handleSearchChange = (e: any) => {
		setSearchValue(e.target.value);
		setActiveIndex(0);
	};
	const handleSearchKeyUp = (e: any) => {
		const fo = filteredOptions();
		if (e.keyCode === 13) {
			//RETURN
			setFocus(false);
			const o = fo[activeIndex];
			if (props.acceptNewValues) {
				updateSelectedValue(e.target.value);
			} else if (o) {
				updateSelectedValue(o.value);
			}
		} else if (e.keyCode === 27)
			//ESC
			setFocus(false);
		else if (e.keyCode === 40)
			//DOWN
			setActiveIndex(fo.length > 0 ? Math.min(activeIndex + 1, fo.length - 1) : 0);
		else if (e.keyCode === 38)
			//UP
			setActiveIndex(fo.length > 0 ? Math.max(activeIndex - 1, 0) : 0);
	};

	const handleOptionSelection = (o: any) => {
		setFocus(false);
		updateSelectedValue(o.value);
		setSearchValue(o.label);
		setPlaceholder(o.label);
	};

	const escapeRegExp = (string: string) => {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
	};

	const filteredOptions = () =>
		options.filter((o) => {
			return (
				String(o.label)
					.toLowerCase()
					.match(escapeRegExp(String(searchValue).toLowerCase())) ||
				String(o.value)
					.toLowerCase()
					.match(escapeRegExp(String(searchValue).toLowerCase()))
			);
		});

	const handleClick = (e: any) => {
		if (node.current.contains(e.target)) {
			// inside click
			return;
		}
		// outside click
		setFocus(false);
	};

	useEffect(() => {
		if (focus) searchInputRef.current.focus();
		// add when mounted
		document.addEventListener('mousedown', handleClick);
		// return function to be called when unmounted
		return () => {
			document.removeEventListener('mousedown', handleClick);
		};
	}, [focus]); // executé au démarrage puis en cas de mise à jour de focus

	return (
		<div className="UI-autocomplete" ref={node}>
			<div className="UI-autocomplete-input" data-focus={focus ? 'true' : 'false'}>
				<input
					type="text"
					data-exclude={true}
					ref={searchInputRef}
					value={searchValue}
					placeholder={placeholder}
					onFocus={handleInputFocus}
					onClick={handleInputClick}
					onChange={handleSearchChange}
					onKeyUp={handleSearchKeyUp}
				/>
				{filteredOptions().length > 0 ?
					<ul
						className="UI-autocomplete-options"
						style={{
							top: node.current && props.forceTop ? node.current.getBoundingClientRect().top - 30 : undefined,
						}}
					>
						<div className="UI-autocomplete-options-wrapper">
							{filteredOptions().map((o, index) => (
								<li
									className="UI-autocomplete-option"
									data-active={index === activeIndex ? 'true' : 'false'}
									key={index}
									onClick={() => handleOptionSelection(o)}
								>
									{o.label}
								</li>
							))}
						</div>
					</ul> : null
				}
			</div>
		</div>
	);
}

export default Autocomplete;
