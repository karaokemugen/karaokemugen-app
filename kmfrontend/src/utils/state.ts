import { PublicPlayerState } from "../../../src/types/state.js";

export function isOnlyTimepositionPlayerStateUpdate(state: PublicPlayerState) {
    // Detect and skip timeposition updates
    // They are very frequent and cause everything to re-render when emitted
	const { timeposition, ...rest } = state;
	return (Object.keys(rest).length === 0);
}