// ------------------------------------------------------------------------
// ------------------------------------------------------------------------
// AUTOCOMPLETE COMPONENT
// ------------------------------------------------------------------------
// ------------------------------------------------------------------------

import './Autocomplete.scss';

import { useEffect, useRef, useState } from 'react';

export interface AutocompleteOption {
	label: string;
	value: string | number;
}

export type AutocompleteOptions = AutocompleteOption[];

interface LabelProps {
	options?: AutocompleteOptions;
	placeholder?: string;
	value: string | number;
	acceptNewValues?: boolean;
	provideLabels?: true;
	onChange: (value: AutocompleteOption) => void;
	onType?: (query: string) => void;
	styleInclude?: boolean;
}

interface DefaultProps {
	options?: AutocompleteOptions;
	placeholder?: string;
	value: string | number;
	acceptNewValues?: boolean;
	provideLabels?: false;
	onChange: (value: string) => void;
	onType?: (query: string) => void;
	styleInclude?: boolean;
}

type IProps = LabelProps | DefaultProps;

function Autocomplete(props: IProps) {
	const options = props.options || [];

	const node: any = useRef();
	const [placeholder, setPlaceholder] = useState(props.placeholder || undefined);
	const [selectedValue, setSelectedValue] = useState('');
	const [searchValue, setSearchValue] = useState('');

	const searchInputRef: any = useRef();
	const [activeIndex, setActiveIndex] = useState(0);
	const [focus, setFocus] = useState(false);

	const updateSelectedValue = (v: any) => {
		if (typeof props.onChange === 'function') {
			if (props.provideLabels) props.onChange(v);
			else props.onChange(v.value);
		}
		props.onType('');
		return;
	};

	// INPUT USER EVENT
	const handleInputFocus = () => {
		setTimeout(() => setFocus(true), 250);
		setSearchValue('');
	};

	const handleInputClick = () => {
		setFocus(true);
	};

	// SEARCH USER EVENT
	const handleSearchChange = (e: any) => {
		props?.onType(e.target.value);
		setSearchValue(e.target.value);
		setActiveIndex(0);
	};
	const handleSearchKeyUp = (e: any) => {
		if (e.keyCode === 13) {
			//RETURN
			setFocus(false);
			const o = options[activeIndex];
			if (props.acceptNewValues) {
				updateSelectedValue({ label: e.target.value, value: e.target.value });
			} else if (o) {
				updateSelectedValue(o);
			}
		} else if (e.keyCode === 27)
			//ESC
			setFocus(false);
		else if (e.keyCode === 40)
			//DOWN
			setActiveIndex(options.length > 0 ? Math.min(activeIndex + 1, options.length - 1) : 0);
		else if (e.keyCode === 38)
			//UP
			setActiveIndex(options.length > 0 ? Math.max(activeIndex - 1, 0) : 0);
	};

	const handleOptionSelection = (o: any) => {
		setFocus(false);
		updateSelectedValue(o);
		setSearchValue(o.label);
		setPlaceholder(o.label);
	};

	useEffect(() => {
		if (focus) searchInputRef.current.focus();
	}, [focus]); // exécuté au démarrage puis en cas de mise à jour de focus

	useEffect(() => {
		if (typeof props.value === 'string' && props.options instanceof Array && props.value !== selectedValue) {
			setSelectedValue(props.value);
			setPlaceholder(props.value);
			setSearchValue(props.options.find(opt => opt.value === props.value)?.label || '');
		}
	}, [props.value, props.options]); // properly reflect value changes by prop mutation

	const handleClick = (e: any) => {
		if (node.current?.contains(e.target)) {
			// inside click
			return;
		}
		// outside click
		setFocus(false);
	};

	useEffect(() => {
		// add when mounted
		document.addEventListener('mousedown', handleClick);
		// return function to be called when unmounted
		return () => {
			document.removeEventListener('mousedown', handleClick);
		};
	}, []);

	return (
		<div className="UI-autocomplete" ref={node}>
			<div className="UI-autocomplete-input" data-focus={focus ? 'true' : 'false'}>
				<input
					type="text"
					data-exclude={!props.styleInclude}
					ref={searchInputRef}
					value={searchValue}
					placeholder={placeholder}
					onFocus={handleInputFocus}
					onClick={handleInputClick}
					onChange={handleSearchChange}
					onKeyUp={handleSearchKeyUp}
				/>
				{(options.length < 75 || searchValue.length >= 3) && focus ? (
					<ul className="UI-autocomplete-options">
						<div className="UI-autocomplete-options-wrapper">
							{options.map((o, index) => (
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
					</ul>
				) : null}
			</div>
		</div>
	);
}

export default Autocomplete;
