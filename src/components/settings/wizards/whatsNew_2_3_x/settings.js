import Dictionary from './dictionary';

import images from '../../../../images';

module.exports = {
	version: "2.3.0",
	config: {
		prefix: "whatsNew",
		className: "center",
		discardXButton: true,
		discardOverlayClick: true,
		discardDotsClick: true,

		steps: [
			{
				image: {src: images.whatsNewStep1},
				waiting: {text: "update.progress"}
			}, {
				image: {src: images.whatsNewStep2},
				buttons: [{text: "btn.next"}]
			}, {
				image: {src: images.whatsNewStep3},
				buttons: [{
					text: "btn.cloudLogin.login",
					callback: () => {
						AuthenticationManager.login();
					}
				}, {
					text: "btn.notNow",
					className: "cancel"
				}]
			}
		]
	}
}
