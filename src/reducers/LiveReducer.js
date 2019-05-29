import * as ActionTypes from '../constants/ActionTypes'

let defaultState = {
	note: null,
	layerAdded: false
};

export default function LiveReducer(state = defaultState, action) {
	if (global.debug) console.reducer(action.type, action.body);

	switch (action.type) {
		case ActionTypes.UPDATE_STATE_LIVE: return {...state, ...action.body}
		case ActionTypes.LIVE_MODE_NEW_NOTE: return { ...state, note: action.body };
		case ActionTypes.LIVE_MODE_ADD_LAYER: return { ...state, layerAdded: !state.layerAdded };
		case ActionTypes.LIVE_MODE_FINALIZE: return { ...state, note: null };

		default:
			return state;
	}
}
