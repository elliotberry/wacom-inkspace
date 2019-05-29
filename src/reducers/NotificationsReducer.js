import * as ActionTypes from '../constants/ActionTypes'
import {OrderedSet} from 'immutable';

let defaultState = {
	notifications: OrderedSet(),
	notificationsQueue: OrderedSet()
};

export default function NotificationsReducer(state = defaultState, action) {
	if (global.debug) console.reducer(action.type, action.body);

	switch (action.type) {
		case ActionTypes.ADD_NOTIFICATION: {
			let key = action.body.key;
			let msg = action.body.message;

			if (action.body.translatable) {
				if (LocalesManager.dictionary[msg]) {
					msg = LocalesManager.dictionary[msg];

					Object.keys(action.body.props).forEach(name => msg = msg.replace("{" + name + "}", action.body.props[name]));
				}
				else
					console.warn("translation missing:", action.body);
			}

			var notifications = state.notifications;
			var notificationsQueue = state.notificationsQueue;
			var notification = {
				key: key,
				message: msg,
				dismissAfter: 4000,
				style: false,
				activeClassName: 'activeNotification',
			};

			if (state.notifications.isEmpty())
				notifications = notifications.add(notification);
			else if (
				notification.message != state.notifications.last().message &&
				(notificationsQueue.isEmpty() || (!notificationsQueue.isEmpty() && notificationsQueue.last().message != notification.message))
			) {
				notificationsQueue = notificationsQueue.add(notification)
			}

			return {...state, notifications: notifications, notificationsQueue: notificationsQueue};
		}

		case ActionTypes.REMOVE_NOTIFICATION: {
			let entry = action.body;

			if (typeof action.body == "string")
				entry = state.notifications.find((notification => (notification.key == action.body)));

			var notifications = state.notifications;
			var queue = state.notificationsQueue;

			if (entry) {
				notifications = notifications.delete(entry);

				if (!state.notificationsQueue.isEmpty()) {
					var notificationTransfer = state.notificationsQueue.first();
					notifications = notifications.add(notificationTransfer);
					queue = queue.delete(notificationTransfer);
				}
			}
			else if (typeof action.body == "string") {
				entry = queue.find((notification => (notification.key == action.body)));
				if (entry) queue = queue.delete(entry);
			}

			return {...state, notifications: notifications, notificationsQueue: queue};
		}

		default:
			return state;
	}
}
