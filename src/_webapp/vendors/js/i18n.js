var I18n = function(options){
	for (var prop in options) {
		this[prop] = options[prop];
	};

	this.setLocale(this.locale);
};

I18n.localeCache = {};

I18n.prototype = {
	defaultLocale: "en",
	directory: "/locales",
	extension: ".min.json",

	getLocale: function(){
		return this.locale;
	},

	setLocale: function(locale){
		if(!locale) {
			// locale = $("html").attr("lang");
			locale = navigator.languages[0].substring(0, 2);
		}

		if(!locale)
			locale = this.defaultLocale;

		this.locale = locale;

		if(locale in I18n.localeCache) return;
		else this.getLocaleFileFromServer();
	},

	getLocaleFileFromServer: function(){
		localeFile = null;

		$.ajax({
			url: this.directory + "/" + this.locale + this.extension,
			async: false,
			dataType: 'json',
			success: function(data){
				localeFile = data;
			}
		});

		I18n.localeCache[this.locale] = localeFile;
	},

	__: function(){
		if(I18n.localeCache[this.locale]) {
			var key = arguments[0].split('.');
			var value = I18n.localeCache[this.locale][key[0]];
			var depth = 0;
			while(typeof value == 'object' &&  Object.keys(value).length > 0 && depth <= key.length) {
				depth++;
				value = value[key[depth]];
			}
			var msg = value;
			if (msg && arguments.length > 1) {
				var msgArgs = arguments[1];
				if(typeof msgArgs === 'string') msgArgs = [msgArgs];
				if(!(arguments.length == 3 && arguments[2] == 'console')) msg = msg.replace(/%s/g, '<b>%s</b>');            
				msg = vsprintf(msg, msgArgs);
			}
			return msg;
		} else {
			return arguments[0];
		}
        
	},

	__n: function(singular, count){
		var msg = I18n.localeCache[this.locale][singular];

		count = parseInt(count, 10);
		if(count === 0)
			msg = msg.zero;
		else
			msg = count > 1 ? msg.other : msg.one;

		msg = vsprintf(msg, [count]);

		if (arguments.length > 2)
			msg = vsprintf(msg, Array.prototype.slice.call(arguments, 2));

		return msg;
	}
};
