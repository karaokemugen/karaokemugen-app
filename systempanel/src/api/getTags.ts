import axios from 'axios/index';

var tags = null;

let getTags = async () => {
	if(tags===null)
	{
		let res = await axios.get('/api/tags');
		tags = res && res.data && res.data.content ? res.data.content : [];
	}
	return tags;
}

export default getTags

