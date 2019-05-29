function genUpdateStateActions(state, body) {
	let result = [];
	let cache = {};
	let initialState = {...body};
	let initialStateKeys = Object.keys(initialState);

	Object.keys(state).filter(name => name.endsWith("Reducer")).forEach(reducer => {
		let reducerKeys = Object.keys(state[reducer]);

		initialStateKeys.forEach(name => {
			if (reducerKeys.includes(name)) {
				if (!cache[reducer]) cache[reducer] = {};
				cache[reducer][name] = body[name];
				delete initialState[name];
			}
		});
	});

	Object.keys(cache).forEach(reducer => {
		let name = reducer.replace("Reducer", "").toUpperCase();
		result.push({type: `UPDATE_STATE_${name}`, body: cache[reducer]});
	});

	if (Object.keys(initialState).length)
		console.error(`Unable to determine reducers for ${JSON.stringify(initialState)}`);

	return result;
}

function updateState(body) {
	return (dispatch, getState) => {
		genUpdateStateActions(getState(), body).forEach(dispatch);
	};
}

function getState(type) {
	return (dispatch, getState) => {
		return getState().AppReducer[type] || getState().LibraryReducer[type] || getState().EditReducer[type] || getState().LiveReducer[type] || getState().intl[type];
	};
}

function dispatch(type, body) {
	return (dispatch, getState) => dispatch({type, body});
}

export {
	genUpdateStateActions,

	updateState,
	getState,
	dispatch
}
