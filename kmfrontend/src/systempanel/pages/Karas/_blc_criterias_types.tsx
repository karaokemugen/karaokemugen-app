
export function getCriterasByValue(v) {
	const c = criteras_types.length;
	for (let i=0; i < c; i++) {
		if(criteras_types[i].value === v)
			return criteras_types[i];
	}
	return null;
}

export const criteras_types = [
	{
		value:1002,
		mode:'number',
		fields: ['duration'],
		test: 'gt',
	},
	{
		value:1003,
		mode:'number',
		fields: ['duration'],
		test: 'lt',
	},
	{
		value:1004,
		mode:'text',
		fields: ['title'],
		test: 'contain',
	},
	{
		value:0,
		mode:'text',
	},
	{
		value:1,
		mode:'tag',
	},
	{
		value:2,
		mode:'tag',
		fields: ['singers'],
		test: 'contain',
	},
	{
		value:3,
		mode:'tag',
	},
	{
		value:4,
		mode:'tag',
	},
	{
		value:5,
		mode:'tag',
	},
	{
		value:6,
		mode:'tag',
	},
	{
		value:7,
		mode:'tag',
	},
	{
		value:8,
		mode:'tag',
	},
	{
		value:9,
		mode:'tag',
	},
	{
		value:10,
		mode:'tag',
	},
	{
		value:11,
		mode:'tag',
	},
	{
		value:12,
		mode:'tag',
	},
	{
		value:13,
		mode:'tag',
	}
];

export default criteras_types;
