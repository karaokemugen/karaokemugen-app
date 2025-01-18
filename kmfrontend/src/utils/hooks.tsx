import { debounce } from 'lodash';
import { DependencyList, EffectCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DBKaraTag, DBYear } from '../../../src/lib/types/database/kara';
import { DBTag } from '../../../src/lib/types/database/tag';
import { AutocompleteOptions } from '../frontend/components/generic/Autocomplete';
import { GlobalContextInterface } from '../store/context';
import { getTagInLocale } from './kara';
import { commandBackend } from './socket';

// Big thanks to https://github.com/thivi/use-non-initial-effect-hook
// See https://www.thearmchaircritic.org/tech-journal/prevent-useeffects-callback-firing-during-initial-render
/**
 * This hook gets called only when the dependencies change but not during initial render.
 *
 * @param {EffectCallback} effect The `useEffect` callback function.
 * @param {DependencyList} deps An array of dependencies.
 *
 * @example
 * ```
 *  useNonInitialEffect(()=>{
 *      alert("Dependency changed!");
 * },[dependency]);
 * ```
 */
export const useDeferredEffect = (effect: EffectCallback, deps?: DependencyList) => {
	const initialRender = useRef(true);

	useEffect(() => {
		let effectReturns: void | (() => void | undefined) = () => {};

		if (initialRender.current) {
			initialRender.current = false;
		} else {
			effectReturns = effect();
		}

		if (effectReturns && typeof effectReturns === 'function') {
			return effectReturns;
		}
	}, deps);
};

/**
 * Hook to assign a listener to document resizes.
 *
 * @param {EventListener} onResize Callback on document resize
 */
export const useResizeListener = (onResize: EventListener) => {
	useEffect(() => {
		window.addEventListener('resize', onResize, { passive: true });
		return () => {
			window.removeEventListener('resize', onResize);
		};
	}, [onResize]);
};

/**
 * Do a search against a local dataset, useful for small datasets or static ones
 *
 * @param data {AutocompleteOptions} Your data, formatted for Autocomplete usage
 * @param query The user query string
 */
export const useLocalSearch = (data: AutocompleteOptions, query: string): AutocompleteOptions => {
	return useMemo(() => {
		if (query === '') {
			return data;
		} else {
			return data.filter(d => {
				return (
					String(d.label).toLowerCase().indexOf(query.toLowerCase()) >= 0 ||
					String(d.value).toLowerCase().indexOf(query.toLowerCase()) >= 0
				);
			});
		}
	}, [data, query]);
};

/**
 * Do a search against the tag remote dataset
 *
 * @param tagType {number} The tag type number, 0 for years
 * @param context The React Context, not using useContext to avoid double calls
 */
export const useTagSearch = (
	tagType: number,
	context: GlobalContextInterface
): [AutocompleteOptions, (q: string, t?: number) => void] => {
	const [tags, setTags] = useState<AutocompleteOptions>([]);
	const tagSearch = useMemo<(q: string, t?: number) => void>(
		() =>
			debounce(
				async (query: string, type?: number) => {
					const tType = typeof type === 'number' ? type : tagType;
					try {
						if (tType === 0) {
							const response = await commandBackend('getYears');
							setTags(
								response.content
									.filter((val: DBYear) => val.year.toString().startsWith(query))
									.map((val: DBYear) => {
										return {
											value: val.year,
											label: val.year,
											type: [0],
											karacount: [{ type: 0, count: val.karacount }],
										};
									})
							);
						} else if (tType < 999) {
							const response = await commandBackend('getTags', { filter: query, type: [tType] });
							setTags(
								response.content
									.filter((val: DBTag) => val.karacount !== null)
									.map((val: DBTag) => {
										return {
											value: val.tid,
											label: getTagInLocale(
												context.globalState.settings.data,
												val as unknown as DBKaraTag
											).i18n,
											type: val.types,
											karacount: val.karacount,
										};
									})
							);
						} else {
							// For 999+ values, it's CriteriaList implementation for other criteria than tags, so we return an empty dataset
							return [];
						}
					} catch (_) {
						//already display
					}
				},
				500,
				{ leading: true }
			),
		[tagType]
	);
	return [tags, tagSearch];
};
