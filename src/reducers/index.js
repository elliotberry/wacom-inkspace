import {combineReducers} from 'redux';
import {intlReducer} from 'react-intl-redux';
import {routerReducer} from 'react-router-redux';

import AppReducer from './AppReducer';
import LibraryReducer from './LibraryReducer';
import EditReducer from './EditReducer';
import LiveReducer from './LiveReducer';
import NotificationsReducer from './NotificationsReducer';

export const rootReducer = combineReducers({
	AppReducer,
	LibraryReducer,
	EditReducer,
	LiveReducer,
	NotificationsReducer,
	intl: intlReducer,
	router: routerReducer
});

