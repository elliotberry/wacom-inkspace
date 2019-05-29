import Dictionary from './dictionary';

import images from '../../../../images';

export default {
	version: "2.7.0",
	config: {
		prefix: "whatsNew",
		className: "center",
		discardXButton: true,
		discardOverlayClick: true,

		dictionary: Dictionary,

		steps: [
			{image: {src: images.whatsNewStep1}, buttons: [{text: "btn.OK"}]}
		]
	}
}
