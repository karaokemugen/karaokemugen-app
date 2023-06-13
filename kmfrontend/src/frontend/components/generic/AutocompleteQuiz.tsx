// ------------------------------------------------------------------------
// ------------------------------------------------------------------------
// AUTOCOMPLETE COMPONENT
// ------------------------------------------------------------------------
// ------------------------------------------------------------------------

import './Autocomplete.scss';

import { useEffect, useRef, useState } from 'react';

export interface AutocompleteOption {
	label: string;
	value: string;
}

export type AutocompleteOptions = AutocompleteOption[];

interface LabelProps {
	options?: AutocompleteOptions;
	placeholder?: string;
	value: string;
	focus: boolean;
	disabled?: boolean;
	acceptNewValues?: boolean;
	provideLabels?: true;
	onChange: (value: AutocompleteOption) => void;
	onType?: (query: string) => void;
	changeFocus?: (focus: boolean) => void;
	styleInclude?: boolean;
	inputProps?: JSX.IntrinsicElements['input'];
}

interface DefaultProps {
	options?: AutocompleteOptions;
	placeholder?: string;
	value: string;
	focus: boolean;
	disabled?: boolean;
	acceptNewValues?: boolean;
	provideLabels?: false;
	onChange: (value: string) => void;
	onType?: (query: string) => void;
	changeFocus?: (focus: boolean) => void;
	styleInclude?: boolean;
	inputProps?: JSX.IntrinsicElements['input'];
}

type IProps = LabelProps | DefaultProps;

function AutocompleteQuiz(props: IProps) {
	const options = props.options || [];

	const node: any = useRef();

	const searchInputRef = useRef<HTMLInputElement>();
	const [activeIndex, setActiveIndex] = useState(-1);

	const updateSelectedValue = (v: any) => {
		if (typeof props.onChange === 'function') {
			if (props.provideLabels) props.onChange(v);
			else props.onChange(v.value);
		}
		return;
	};

	// INPUT USER EVENT
	const handleInputFocus = () => {
		setTimeout(() => props.changeFocus(true), 250);
	};

	const handleInputClick = () => {
		props.changeFocus(true);
	};

	const closeFocus = () => {
		props.changeFocus(false);
		setActiveIndex(-1);
	};

	// SEARCH USER EVENT
	const handleSearchChange = (e: any) => {
		props?.onType(e.target.value);
		setActiveIndex(-1);
	};
	const handleSearchKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.keyCode === 13) {
			//RETURN
			const o = options[activeIndex];
			if (props.acceptNewValues && activeIndex === -1) {
				const value = (e.target as HTMLInputElement).value;
				updateSelectedValue({
					label: value,
					value: (e.target as HTMLInputElement).value,
				});
			} else if (o) {
				updateSelectedValue(o);
			}
			closeFocus();
		} else if (e.keyCode === 27) {
			//ESC
			closeFocus();
		} else if (e.keyCode === 40) {
			//DOWN
			setActiveIndex(options.length > 0 ? Math.min(activeIndex + 1, options.length - 1) : 0);
		} else if (e.keyCode === 38) {
			//UP
			setActiveIndex(options.length > 0 ? Math.max(activeIndex - 1, 0) : 0);
		}
	};

	const handleOptionSelection = (o: any) => {
		closeFocus();
		updateSelectedValue(o);
	};

	useEffect(() => {
		if (props.focus) {
			searchInputRef.current.focus();
		}
	}, [props.focus, props.disabled]); // exécuté au démarrage puis en cas de mise à jour de focus

	const handleClick = (e: any) => {
		if (node.current?.contains(e.target)) {
			// inside click
			return;
		}
		// outside click
		closeFocus();
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
			<div className="UI-autocomplete-input" data-focus={props.focus ? 'true' : 'false'}>
				<input
					type="text"
					data-exclude={!props.styleInclude}
					ref={searchInputRef}
					value={props.value}
					placeholder={props.placeholder}
					disabled={props.disabled}
					onFocus={handleInputFocus}
					onClick={handleInputClick}
					onChange={handleSearchChange}
					onKeyUp={handleSearchKeyUp}
					{...props.inputProps}
				/>
				{props.value.length > 0 && options.length > 0 && props.focus ? (
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

export default AutocompleteQuiz;
