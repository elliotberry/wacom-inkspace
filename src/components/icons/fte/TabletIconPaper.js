import React from 'react';

function TabletIconPaper(props) {
	let orientation = props.orientation || 'right';
	let iconFill = props.selected ? "#ffffff" : props.iconfill || '#999999';
	let bgFill = props.selected ? "#999999" : props.bgfill || '#ffffff';
	let width = 113;
	let height = 113;
	let center = width / 2;
	let radius = width / 2 - 2;
	let viewBox = `0 0 ${width} ${height}`;

	return (
		<svg className="tablet-icon" xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={viewBox}>
			<circle cx={center} cy={center} r={radius} fill={bgFill} stroke="#999999" strokeWidth="2"/>

			<g fill={iconFill}>
				{(() => {
					if (orientation == "left")
						return <path d="M75.953125,48.7236328c1.34375,0,2.4365234-1.0927734,2.4365234-2.4360352 s-1.0927734-2.4360352-2.4365234-2.4360352c-1.3427734,0-2.4355469,1.0927734-2.4355469,2.4360352 S74.6103516,48.7236328,75.953125,48.7236328z M75.953125,45.8515625c0.2402344,0,0.4365234,0.1958008,0.4365234,0.4360352 s-0.1962891,0.4360352-0.4365234,0.4360352s-0.4355469-0.1958008-0.4355469-0.4360352S75.7128906,45.8515625,75.953125,45.8515625z M75.953125,49.8515625c-0.8183594,0-1.484375,0.6665039-1.484375,1.4853516s0.6660156,1.4848633,1.484375,1.4848633 c0.8193359,0,1.4853516-0.6660156,1.4853516-1.4848633S76.7724609,49.8515625,75.953125,49.8515625z M61,48H46 c-0.5527344,0-1,0.4477539-1,1s0.4472656,1,1,1h15c0.5527344,0,1-0.4477539,1-1S61.5527344,48,61,48z M36,81h35 c0.5527344,0,1-0.4472656,1-1V32c0-0.5522461-0.4472656-1-1-1H36c-0.5527344,0-1,0.4477539-1,1v48 C35,80.5527344,35.4472656,81,36,81z M37,33h33v46H37V33z M81,27H32c-0.5527344,0-1,0.4477539-1,1v56c0,0.5527344,0.4472656,1,1,1 h49c0.5527344,0,1-0.4472656,1-1V28C82,27.4477539,81.5527344,27,81,27z M80,83H33V29h47V83z M55,62h-9 c-0.5527344,0-1,0.4472656-1,1s0.4472656,1,1,1h9c0.5527344,0,1-0.4472656,1-1S55.5527344,62,55,62z M61,55H46 c-0.5527344,0-1,0.4477539-1,1s0.4472656,1,1,1h15c0.5527344,0,1-0.4477539,1-1S61.5527344,55,61,55z" />
					else if (orientation == "top")
						return <path d="M66.1689453,73.331543c-1.3427734,0-2.4355469,1.0927734-2.4355469,2.4360352 s1.0927734,2.4360352,2.4355469,2.4360352c1.34375,0,2.4365234-1.0927734,2.4365234-2.4360352 S67.5126953,73.331543,66.1689453,73.331543z M66.1689453,76.2036133c-0.2402344,0-0.4355469-0.1958008-0.4355469-0.4360352 s0.1953125-0.4360352,0.4355469-0.4360352s0.4365234,0.1958008,0.4365234,0.4360352S66.4091797,76.2036133,66.1689453,76.2036133z M61.1201172,74.2827148c-0.8193359,0-1.4853516,0.6660156-1.4853516,1.4848633s0.6660156,1.4853516,1.4853516,1.4853516 s1.4853516-0.6665039,1.4853516-1.4853516S61.9394531,74.2827148,61.1201172,74.2827148z M32,72h48c0.5527344,0,1-0.4477539,1-1V36 c0-0.5522461-0.4472656-1-1-1H32c-0.5527344,0-1,0.4477539-1,1v35C31,71.5522461,31.4472656,72,32,72z M33,37h46v33H33V37z M84,31 H28c-0.5527344,0-1,0.4477539-1,1v49c0,0.5522461,0.4472656,1,1,1h56c0.5527344,0,1-0.4477539,1-1V32 C85,31.4477539,84.5527344,31,84,31z M83,80H29V33h54V80z M65,46H48c-0.5527344,0-1,0.4477539-1,1s0.4472656,1,1,1h17 c0.5527344,0,1-0.4477539,1-1S65.5527344,46,65,46z M65,53H48c-0.5527344,0-1,0.4477539-1,1s0.4472656,1,1,1h17 c0.5527344,0,1-0.4477539,1-1S65.5527344,53,65,53z M56,60h-8c-0.5527344,0-1,0.4477539-1,1s0.4472656,1,1,1h8 0.5527344,0,1-0.4477539,1-1S56.5527344,60,56,60z" />
					else if (orientation == "right")
						return <path d="M60.9916992,62h-9c-0.5527344,0-1,0.4472656-1,1s0.4472656,1,1,1h9 c0.5527344,0,1-0.4472656,1-1S61.5444336,62,60.9916992,62z M65.9916992,48h-14c-0.5527344,0-1,0.4477539-1,1s0.4472656,1,1,1h14 c0.5527344,0,1-0.4477539,1-1S66.5444336,48,65.9916992,48z M65.9916992,55h-14c-0.5527344,0-1,0.4477539-1,1s0.4472656,1,1,1h14 c0.5527344,0,1-0.4477539,1-1S66.5444336,55,65.9916992,55z M81.0083008,27H30.9916992c-0.5527344,0-1,0.4477539-1,1v56 c0,0.5527344,0.4472656,1,1,1h50.0166016c0.5527344,0,1-0.4472656,1-1V28C82.0083008,27.4477539,81.5610352,27,81.0083008,27z M80.0083008,83H31.9916992V29h48.0166016V83z M36.4916992,68c1.3789062,0,2.5-1.1210938,2.5-2.5s-1.1210938-2.5-2.5-2.5 s-2.5,1.1210938-2.5,2.5S35.112793,68,36.4916992,68z M36.4916992,65c0.2753906,0,0.5,0.2246094,0.5,0.5s-0.2246094,0.5-0.5,0.5 s-0.5-0.2246094-0.5-0.5S36.2163086,65,36.4916992,65z M36.4916992,62c0.8271484,0,1.5-0.6728516,1.5-1.5s-0.6728516-1.5-1.5-1.5 s-1.5,0.6728516-1.5,1.5S35.6645508,62,36.4916992,62z M41.9916992,81h35c0.5527344,0,1-0.4472656,1-1V32 c0-0.5522461-0.4472656-1-1-1h-35c-0.5527344,0-1,0.4477539-1,1v48C40.9916992,80.5527344,41.4389648,81,41.9916992,81z M42.9916992,33h33v46h-33V33z" />
					else // bottom
						return <path d="M46.5,40c1.3789062,0,2.5-1.1210938,2.5-2.5S47.8789062,35,46.5,35 S44,36.1210938,44,37.5S45.1210938,40,46.5,40z M46.5,37c0.2753906,0,0.5,0.2246094,0.5,0.5S46.7753906,38,46.5,38 S46,37.7753906,46,37.5S46.2246094,37,46.5,37z M51.5,39c0.8271484,0,1.5-0.6728516,1.5-1.5S52.3271484,36,51.5,36 S50,36.6728516,50,37.5S50.6728516,39,51.5,39z M65,52H48c-0.5527344,0-1,0.4472656-1,1s0.4472656,1,1,1h17 c0.5527344,0,1-0.4472656,1-1S65.5527344,52,65,52z M56,66h-8c-0.5527344,0-1,0.4472656-1,1s0.4472656,1,1,1h8 c0.5527344,0,1-0.4472656,1-1S56.5527344,66,56,66z M84,31H28c-0.5527344,0-1,0.4472656-1,1v49c0,0.5527344,0.4472656,1,1,1h56 c0.5527344,0,1-0.4472656,1-1V32C85,31.4472656,84.5527344,31,84,31z M83,80H29V33h54V80z M32,78h48c0.5527344,0,1-0.4472656,1-1V42 c0-0.5527344-0.4472656-1-1-1H32c-0.5527344,0-1,0.4472656-1,1v35C31,77.5527344,31.4472656,78,32,78z M33,43h46v33H33V43z M65,59 H48c-0.5527344,0-1,0.4472656-1,1s0.4472656,1,1,1h17c0.5527344,0,1-0.4472656,1-1S65.5527344,59,65,59z" />
				})()}
			</g>
		</svg>
	)
}

export default TabletIconPaper;
