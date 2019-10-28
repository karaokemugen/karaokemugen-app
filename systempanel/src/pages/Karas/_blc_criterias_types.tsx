export function getCriterasByValue(v) {
	let c = criteras_types.length;
	for(let i=0; i<c; i++)
	{
		if(criteras_types[i].value===v)
			return criteras_types[i];
	}
	return null;
}

export const criteras_types = [
	{
		label:"Plus long que (s)",
		value:1002,
		mode:'number',
		fields: ['duration'],
		test: 'gt',
	},
	{
		label:"Plus court que (s)",
		value:1003,
		mode:'number',
		fields: ['duration'],
		test: 'lt',
	},
	{
		label:"Titre contenant",
		value:1004,
		mode:'text',
		fields: ['title'],
		test: 'contain',
	},
	{
		label:"Série contenant",
		value:1000,
		mode:'text',
		fields: ['serie','serie_i18n','serie_altname'],
		test: 'contain',
	},
	{
		label:"Métadonnées",
		value:0,
		mode:'text',
	},
	{
		label:"Chanteur",
		value:2,
		mode:'tag',
		fields: ['singers'],
		test: 'contain',
	},
	{
		label:"Type",
		value:3,
		mode:'tag',
	},
	{
		label:"Créateur",
		value:4,
		mode:'tag',
	},
	{
		label:"Langue",
		value:5,
		mode:'tag',
	},
	{
		label:"Auteur du kara",
		value:6,
		mode:'tag',
	},
	{
		label:"Tags",
		value:7,
		mode:'tag',
	},
	{
		label:"Compositeur",
		value:8,
		mode:'tag',
	},
	{
		label:"Groupe de kara",
		value:9,
		mode:'tag',
	}
];

export default criteras_types;