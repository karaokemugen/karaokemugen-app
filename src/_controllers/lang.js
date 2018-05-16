export const getLang = (req, res, next) => {
	const langs = req.get('accept-language').split(',');
	req.lang = langs[0].substring(0,2);	
	next();
};