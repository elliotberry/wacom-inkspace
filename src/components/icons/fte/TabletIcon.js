import React from 'react';

function TabletIcon(props) {
	var iconFill = props.iconfill || '#999999';
	var bgFill = props.bgfill || '#ffffff';

	if (props.selected) {
		iconFill = "#ffffff";
		bgFill = "#999999";
	}

	var rotateAngle = "";
	var flipHorizontal = "";

	switch (props.orientation) {
		case "left":
			rotateAngle = "180";
			flipHorizontal = `scale(1.03, -1.03) translate(-2, -110)`;
			break;
		case "top":
			rotateAngle = "-90";
			break;
		case "right":
			rotateAngle = "0";
			break;
		case "bottom":
			rotateAngle = "90";
			break;
		default:
			rotateAngle = "0";
	}

	const logoRotate = `rotate(${rotateAngle} 56.5 56.5)`;

	return (
		<svg className="tablet-icon" xmlns="http://www.w3.org/2000/svg" width="114" height="114" viewBox="0 0 114 114">
			<circle shapeRendering="geometricPrecision" cx="56.5" cy="56.5" r="55" fill={bgFill} fillOpacity="1" stroke="#999999" strokeWidth="2px"/>

			<g transform={logoRotate} fill={iconFill}>
				<g transform={flipHorizontal}>
					<path d="M92.990473 30.2h-12.3c-.3-.4-.7-.7-1.3-.7h-41.4c-.5 0-1 .3-1.3.7h-16.4c-1.8 0-3.3 1.5-3.3 3.3v46.7c0 1.8 1.5 3.3 3.3 3.3h72.6c1.8 0 3.1-1.5 3.1-3.3V33.4c.2-1.8-1.2-3.2-3-3.2zm-12.1 7.2h6.3v39h-50v-5.9c0-.6-.5-1.1-1.1-1.1h-4.9v-32h5.5c.2 0 .8 1 1.6 1h41.1c.6 0 1.2-1 1.5-1zm-45.7 34v3.1l-3-3.1h3zm43.9-40l-.2 5h-40.4l-.1-5h40.7zm15.1 48.7c0 .7-.6 1.3-1.3 1.3h-72.5c-.7 0-1.3-.6-1.3-1.3V33.2c0-.6.4-1 1-1h16.3l.1 3.2h-7.3v36l6.6 7h53.4v-43h-8.2l.1-3.2h12.1c.5 0 1 .4 1 1v46.9z"/>
					<path d="M24.622884 55.1839c-1.9 0-3.5 1.6-3.5 3.5s1.6 3.5 3.5 3.5 3.5-1.6 3.5-3.5-1.6-3.5-3.5-3.5zm0 5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm.2-7.5c.6 0 1-.4 1-1v-5c0-.6-.4-1-1-1s-1 .4-1 1v5c0 .6.4 1 1 1zm0 12c-.6 0-1 .4-1 1v5c0 .6.4 1 1 1s1-.4 1-1v-5c0-.6-.4-1-1-1z"/>
				</g>
			</g>
		</svg>
	)
}

export default TabletIcon;
