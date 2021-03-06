import React from 'react';

function DeviceNotChargingIcon(props) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34">
			<circle fill="none" cx="17px" cy="17px" r="17px" />
			<path fill="#333333" d="M26.047 14.266h-1.062V14c0-1.104-.895-2-2-2h-11.97c-1.103 0-2 .896-2 2v6c0 1.105.896 2 2 2h11.97c1.105 0 2-.895 2-2v-.266h1.062c.552 0 1-.448 1-1v-3.47c0-.55-.448-.998-1-.998zM22.985 20h-11.97v-6h11.97v6z" />
			<rect fill="#ffffff" x="10" y="13" width={props.width} height="8" />
		</svg>
	)
}

export default DeviceNotChargingIcon;
