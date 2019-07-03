/* display a fading message, useful to show success or errors */

displayMessage = function(type, title, message, time) {
	var transition = isTouchScreen ? 300 : 500;
	if (!time) time = 3500;

	var messageDiv = $('<div nb="' + 0 + '" class="toastMessage alert alert-' + type + '">');
	messageDiv.html('<strong>' + title + '</strong> ' + message);
	messageDiv.appendTo($('.toastMessageContainer'));
	setTimeout(function(){
		messageDiv.css('opacity', '1');
	}, 0);
	
	setTimeout(function(){
		if( window.getSelection().focusNode == null || window.getSelection().focusNode.parentNode != messageDiv[0]) {
			messageDiv.addClass('dismiss');
		} else {
			transition += 7000;
		}
		setTimeout(function(){
			messageDiv.remove();
		}, transition);
		
	}, time);

	messageDiv.click( function() {
		if( window.getSelection().focusNode == null  || window.getSelection().focusNode.parentNode != messageDiv[0]) {
			messageDiv.addClass('dismiss');
		} else {
			transition += 7000;
		}
		setTimeout(function(){
			messageDiv.remove();
		}, transition);
		
	});
    
};

/* display a modal (really?) */
/* types : confirm, prompt, alert, ... */
displayModal = function(type, title, message, callback, placeholder) {
	window.callModal(type, title, message, callback, placeholder);
};

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

/* format seconds to Hour Minute Second */
secondsTimeSpanToHMS = function(s, format) {
	var d = Math.floor(s/(3600 * 24));
	if (format === '24h' || format === 'dhm') {
		s -= d * 3600 * 24;
	}
	var h = Math.floor(s/3600);
	if (format !== 'ms') {
		s -= h * 3600;
	}
	var m = Math.floor(s/60);
	s -= m * 60;

	var result = (h > 0 ? h+'h' : '')+(m < 10 ? '0'+m : m)+'m'+(s < 10 ? '0'+s : s ) + 's';
	if (format === 'ms') result = (m > 0 ? m+'m' : '')+(s < 10 && m > 0 ? '0'+s : s ) + 's';
	if (format === 'hm') result = (h > 0 ? h+'h' : '')+(m < 10 ? '0'+m : m)+'m';
	if (format === 'dhm') {
		result = (d > 0 ? d+'d' : '')+(h > 0 ? h+'h' : '')+(m < 10 ? '0'+m : m)+'m';
	}
	return result; 
};

/* cookies */
    
createCookie = function(name,value,days) {
	var expires;
	if (days) {
		var date = new Date();
		if (days === -1) days = 365 * 15;
		date.setTime(date.getTime() + (days*24*60*60*1000));
		expires = '; expires='+date.toGMTString();
	} else expires = '';
	document.cookie = name+'='+value+expires+'; path=/';
};

readCookie = function(name) {
	var nameEQ = name + '=';
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
};

eraseCookie = function(name) {
	createCookie(name,'',-1);
};

parseJwt = function(token) {
	var base64Url = token.split('.')[1];
	var base64 = base64Url.replace('-', '+').replace('_', '/');
	return JSON.parse(window.atob(base64));
};

isVisible = function( element, container ){
	
	var elementTop = element.offset().top,
		elementHeight = element.height(),
		containerTop = container.offset().top,
		containerHeight = container.height();

	return ((((elementTop - containerTop) + elementHeight) > 0)
		&& ((elementTop - containerTop) < containerHeight));
};

dataToDataAttribute = function(data) {
	var result = Object.keys(data).map(function (k) {
		return 'data-' + k + '="' +  data[k] + '"';
	}).join(' ');
	return result;
};

startIntro = function(mode, stepLabel){
	introManager = introJs();

	var prefix = mode == 'admin' ? 'INTRO_ADMIN_' : 'INTRO_PUBLIC_';
	var suffix = '_WIDE';
	var introSteps = [];

	if(mode =='admin') {
		introSteps = [{
			step: 1,
			label: '1',
			position: 'auto',
			intro: i18n.__(prefix + 'INTRO1', query.admpwd), // add password
			tooltipClass : 'hidePrev',
		}, {
			step: 2,
			label: 'preLogin',
			position: 'right',
			element: $('#loginModal .modal-content').get(0),
			intro: i18n.__(prefix + 'INTRO2'), 
			tooltipClass : 'hideNext',
		},{
			step: 3,
			label: 'afterLogin',
			position: 'auto',
			intro: i18n.__(prefix + 'INTRO3', 'NOMDUSUJET'), 
		},{
			step: 20,
			label: 'last',
			tooltipClass : 'hideNext',
			position: 'auto',
			intro: i18n.__(prefix + 'INTROFINAL'), 
		}];

		window.callLoginModal(scope==='admin');
		$('.nav-tabs a[href="#nav-signup"]').tab('show');			
		$('#signupRole').val('admin');

	} else {	// public
		introSteps = [{
			step: 1,
			label: 'preLogin',
			position: isSmall ? 'bottom' : 'right',
			element: $('#loginModal .modal-content').get(0),
			intro: i18n.__(prefix + 'INTRO1'), 
			tooltipClass : 'hideNext hidePrev',
		},{
			step: 2,
			label: 'afterLogin',
			position: 'auto',
			intro: i18n.__(prefix + 'INTRO2', 'NOMDUSUJET'), 
		},{
			step: 11,
			label: 'karadetails',
			position: 'auto',
			intro: i18n.__(prefix + 'KARADETAILS')
		},{
			step: 17,
			element: $('#underHeader').get(0),
			label: 'change_screen',
			position: 'auto',
			intro: i18n.__(prefix + 'CHANGE_SCREEN'),
			requiresSmall: true,
			tooltipClass : isTouchScreen ? 'hideNext' : '',
		},{
			step: 19,
			element: $('#underHeader').get(0),
			label: 'playlists',
			position: 'auto',
			intro: i18n.__(prefix + 'PLAYLISTS'), 
		},{
			step: 23,
			element: $('#underHeader').get(0),
			label: 'change_screen2',
			position: 'auto',
			intro: i18n.__(prefix + 'CHANGE_SCREEN2'), 
			requiresSmall: true,
			tooltipClass : isTouchScreen ? 'hideNext' : ''
		},{
			step: 27,
			label: 'last',
			tooltipClass : 'hideNext',
			position: 'auto',
			intro: i18n.__(prefix + 'LAST'), 
		}];
	}
	
	var specialOptions = {
		'SETTINGS' : { tooltipClass : 'hideNext' },
		'PLAYLISTS_MANAGE_BUTTON' :  { tooltipClass : 'hideNext' },
		'MODE' : { disableInteraction : true },
		'KARA' : { tooltipClass : 'hideNext' },
	};
	
	$('[introStep]').each((k,v) => {
		var label =  $(v).attr('introLabel').toUpperCase();
		var position = $(v).attr('introPosition');
		if(!position) position = 'auto';

		var intro = i18n.__(prefix + label);
		console.log(typeof i18n.__(prefix + label + suffix), i18n.__(prefix + label + suffix), prefix + label + suffix);
		if(!isSmall && typeof i18n.__(prefix + label + suffix) != 'undefined') {
			intro = i18n.__(prefix + label + suffix);
		}
		console.log(prefix + label + ' ' + position);
		var options = {
			requiresUser : $(v).attr('introRequiresUser') == 'true',
			label: $(v).attr('introLabel'),
			step: $(v).attr('introStep'),
			position: position,
			element: v,
			intro: intro,
		};
		options = Object.assign(options, specialOptions[label]);
		introSteps.push(options);
	});

	introSteps = introSteps.sort(function(a, b) {
		return a.step - b.step;
	});

	if(stepLabel) {
		var cutIndex = introSteps.findIndex(item => item.label === stepLabel);
		introSteps = introSteps.slice(cutIndex);
	}

	introManager.setOptions({
		steps: introSteps,
		hideNext: true,
		hidePrev: true,
		showBullets: false,
		showStepNumbers: false,
		exitOnOverlayClick: false,
		nextLabel: i18n.__('INTRO_LABEL_NEXT'),
		prevLabel: i18n.__('INTRO_LABEL_PREV'),
		skipLabel: i18n.__('INTRO_LABEL_SKIP'),
		doneLabel: i18n.__('INTRO_LABEL_DONE')
	});
			
	introManager.onafterchange(function(targetElement) {
		var label = introManager._introItems[this._currentStep].label;
		console.log(label);
		if(label == 'preLogin') {
			window.callLoginModal(scope==='admin');
			
			if(mode === 'public') {
				$('#loginModal').removeClass('firstRun');
				$('#loginModal').addClass('hideLogin');
				introManager.refresh();
			}
			$('#loginModal').addClass('introJsFix');
		} else if (label == 'afterLogin') {
			if($('#loginModal').hasClass('in')) {
				$('#nav-signup .login').click();
				$('#loginModal').modal('hide')
					.removeClass('hideLogin');
			}
		} else if (label == 'settings') {
			$('[name="kara_panel"]').bootstrapSwitch('state', true, false);
		}
	});

	introManager.onchange(function(targetElement) {
		
		var element = introManager._introItems[this._currentStep];

		var label = element.label;
		if(label === 'afterLogin') {
			var text = introManager._introItems[this._currentStep].intro;
			text = text.replace('NOMDUSUJET', logInfos.username);
			introManager._introItems[this._currentStep].intro = text;

			introManager._introItems =  introManager._introItems.filter(function( obj ) {
				return !(obj.requiresUser === true && (logInfos.role !== 'user' || logInfos.role !== 'admin') || (obj.requiresSmall == true && !isSmall))
			});
		} else if (label === 'karadetails') {
			if( $('.detailsKara ').length > 0) {
				introManager._introItems[this._currentStep].element = $('.detailsKara ').first().parent().get(0);
			}
		} else if (label === 'playlists') {
			if(!isSmall) {
				introManager._introItems[this._currentStep].element = $('#panel2').get(0);
			}
		} else if (label === 'menu') {
			var menu = isSmall ? $('#menuMobile') : $('#menuPC') ;
			menu.click();
			if(!isSmall) {
				introManager._introItems[this._currentStep].element = $('#menuPC').parent().find('ul').get(0);
			}
		} else if(label === 'last') {
			if(mode === 'public') {
				var menu = isSmall ? $('#menuMobile') : $('#menuPC') ;
				menu.click();
			} else if (mode === 'admin') {
				$('[name="kara_panel"]').bootstrapSwitch('state', true, false);
			}
			$('.introjs-tooltipbuttons > a').first().text(i18n.__('INTRO_LABEL_DONE'));
		}
	});

	introManager.onexit(() => {
		if (scope === 'admin') {
			$.ajax({
				type: 'PUT',
				url: 'admin/settings',
				contentType: 'application/json',
				dataType: 'json',
				data: JSON.stringify({ 'setting': {'App': {'FirstRun':false}} })
			});
		} else {
			createCookie('publicTuto', 'true');
			$('#loginModal').removeClass('firstRun');
		}
	});

	introManager.start();

	var buttons = $('.introjs-tooltipbuttons > a');
	buttons.each((k, el) => {
		$(el).attr('previousClass', $(el).attr('class'));
	});
	buttons.attr('class', 'btn btn-default' + (isTouchScreen ? ' btn-sm' : ' btn-xs' ));
}

getPerformanceIndice = function() {
    var _speedconstant = 1.15600e-8; //if speed=(c*a)/t, then constant=(s*t)/a and time=(a*c)/s
    var d = new Date();
    // var amount = 150000000;
    var amount = 110000000;
    var estprocessor = 1.7; //average processor speed, in GHZ
    console.log("Running loop "+amount+" times. Estimated time (for "+estprocessor+"ghz processor) is "+(Math.round(((_speedconstant*amount)/estprocessor)*100)/100)+"s");
    for (var i = amount; i>0; i--) {} 
    var newd = new Date();
    var accnewd = Number(String(newd.getSeconds())+"."+String(newd.getMilliseconds()));
    var accd = Number(String(d.getSeconds())+"."+String(d.getMilliseconds())); 
    var di = accnewd-accd;
    //console.log(accnewd,accd,di);
    if (d.getMinutes() != newd.getMinutes()) {
    di = (60*(newd.getMinutes()-d.getMinutes()))+di}
    spd = ((_speedconstant*amount)/di);
    console.log("Time: "+Math.round(di*1000)/1000+"s, estimated speed: "+Math.round(spd*1000)/1000+"GHZ");
    return Math.round(spd*1000)/1000;
}

flattenObject = function(ob) {
  
    return Object.keys(ob).reduce(function(toReturn, k) {
  
      if (Object.prototype.toString.call(ob[k]) === '[object Date]') {
        toReturn[k] = ob[k].toString();
      }
      else if ((typeof ob[k]) === 'object' && ob[k]) {
        var flatObject = flattenObject(ob[k]);
        Object.keys(flatObject).forEach(function(k2) {
          toReturn[k + '.' + k2] = flatObject[k2];
        });
      }
      else {
        toReturn[k] = ob[k];
      }
  
      return toReturn;
    }, {});
  };
  
unflattenObject = function(data) {
    var result = Object.create(null);
    for (var i in data) {
      var keys = i.split('.')
      keys.reduce(function(r, e, j) {
        return r[e] || (r[e] = isNaN(Number(keys[j + 1])) ? (keys.length - 1 == j ? data[i] : {}) : [])
      }, result)
    }
    return result
  }