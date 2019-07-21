/* simplified ajax call */
ajx = function(type, url, data, doneCallback) {
	$.ajax({
		url: url,
		type: type,
		data: data
	})
		.done(function (data) {
			if(typeof doneCallback != 'undefined'){
				doneCallback(data);
			}
		});
};