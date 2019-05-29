import GenaratingDoc from './components/images/genarating-doc.gif';

import MultipleSelection from './components/images/multiple-selection.png';
import MultipleDrag from './components/images/multiple-drag.png';

import SignUpLogo from './components/images/sign-up-logo.png';

import TickEmpty from './components/images/cm-empty.png';
import TickBlue from './components/images/cm-tick-blue.png';
import TickGrey from './components/images/cm-tick-grey.png';

import WhatsNewStep1 from './components/settings/wizards/whatsNew/step1.png';
// import WhatsNewStep2 from './components/settings/wizards/whatsNew/step2.png';
// import WhatsNewStep3 from './components/settings/wizards/whatsNew/step3.png';

function fixPath(path) {
	let appPath = NativeLinker.get("ROOT");
	let srcPath = path.substring(path.lastIndexOf("/src/"));

	return appPath + srcPath;
}

export default {
	genaratingDoc: fixPath(GenaratingDoc),
	multipleSelection: fixPath(MultipleSelection),
	multipleDrag: fixPath(MultipleDrag),
	signUpLogo: fixPath(SignUpLogo),
	tickEmpty: fixPath(TickEmpty),
	tickBlue: fixPath(TickBlue),
	tickGrey: fixPath(TickGrey),
	whatsNewStep1: fixPath(WhatsNewStep1)
	// whatsNewStep2: fixPath(WhatsNewStep2)
	// whatsNewStep3: fixPath(WhatsNewStep3)
};
