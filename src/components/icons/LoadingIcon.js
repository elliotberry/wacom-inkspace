import React from 'react';
import Loader from 'react-loader';

function LoadingIcon(props) {
	let color = props.color || "#000000";
	let className = ("loader-wrapper flex-wrapper " + (props.className || "")).trim();
	let style = props.style || null;

	return (
		<div className={className} style={style}>
			<Loader
				loaded={false} lines={9} length={1} width={3} radius={6}
				corners={80} rotate={0} direction={1} color={color} speed={1.5}
				trail={60} shadow={false} hwaccel={false} className="spinner"
				zIndex={1000} top="50%" left="50%" scale={1.00} opacity={0.1}
			/>
		</div>
	)
}

export default LoadingIcon;
