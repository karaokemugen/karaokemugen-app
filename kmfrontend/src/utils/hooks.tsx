import { DependencyList, EffectCallback, useEffect, useRef } from 'react';

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
