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
	var modal = $('#modalBox').attr('type', type);
	var okButton = modal.find('.modal-footer > button.ok').unbind().show();
	var otherButton = modal.find('.modal-footer > button.other').prop('disabled', false).unbind().show();
	var body =  modal.find('.modal-body').show();
	var form = body.find('.form').show();
	var input = form.find('input').show();

	body.find('.modal-message').html(message).show();
	modal.find('.modal-title').html(title);
    
	if(type !== 'confirm' && type !== 'prompt') otherButton.hide();
	if(type !== 'prompt') {
		form.hide();
		if(!message || message === '') body.hide();
	} 

	if(typeof callback != 'undefined') {
		if(type === 'confirm') {
			okButton.click(function(){
				callback(true);
			});
			otherButton.click(function(){
				callback(false);
			});
			if(placeholder == 'lucky') {
				if(isTouchScreen) {
					otherButton.prop('disabled', true);
				} else {
					otherButton.on('mouseenter', function(){
						$(this).css('order', 1 - parseInt($(this).css('order')));
					});
				}
			}
		} else if ( type === 'prompt') {
			input.val(placeholder ? placeholder : '');
			okButton.click(function(){
				var data = {};
				data = input.val();
				callback(data);
			});
		} else if ( type === 'custom') {
			input.hide();
			okButton.click(function(){
				var data = {};

				body.find('input[type="checkbox"]:checked, input[type!="checkbox"], select').map(function(k, v){
					if(!data[v.name]) {
						data[v.name] =  $(v).val();
					} else {
						data[v.name] += ',' + $(v).val();
					}
				});

				callback(data);
			});
		} else {
			okButton.click(function(){
				callback();
			});
		}
	}

	modal.modal('show');
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
	s -= h * 3600;
	var m = Math.floor(s/60);
	s -= m * 60;

	var result = (h > 0 ? h+'h' : '')+(m < 10 ? '0'+m : m)+'m'+(s < 10 ? '0'+s : s ) + 's';
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
/* BOOM */
endOfTheWorldAsWeKnowIt = function() {
  
	displayMessage('danger', '', '<center>Oh no</center>');
	$('html').attr('style', 'background-color: hsla(39, 100%, 34%, 0.86); opacity: .1;z-index: 99999;transition: all 5s linear');
	$('body').css('background-color','#4E5154');
	$('body').css('opacity','.95');
	setTimeout(function(){
		$('html').attr('style', 'background-color: hsla(39, 100%, 34%, 0.96); opacity: 0.95;  z-index: 99999;transition: all 5s linear');
	}, 3000);
  
	setInterval(function () {
     
		endOfTheWorldAsWeKnowItloop();
       
	}, 50);
};
  
endOfTheWorldAsWeKnowItloop = function(){
	var things = $('body *');
	var randomColor = Math.floor(Math.random()*16777215).toString(16);
	var random = Math.floor(Math.random()*things.length);
	el = things.eq(random);
	el.css({'transition': 'all 5s linear',
		'width': Math.floor(Math.random()*400),
		'height': Math.floor(Math.random()*400),
		'position': 'fixed',
		'top': Math.floor(Math.random()*$(window).height() ),
		'left': Math.floor(Math.random()*$(window).width() ),
		'opacity': Math.random()/2 + .4 });
    
	if(Math.random() > .85) el.css('background-color', '#' + randomColor );  
	if(Math.random() > .992) el.css({'background': 'url(/ressources/img/4thimpact.png) no-repeat',
		'background-color': 'transparent',
		'background-size': 'contain'});
  
    
	el.draggable({
		container: 'body',
		appendTo: 'body',
      
	});
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

startIntro = function(mode){
	introJs = introJs();

	var prefix = mode == 'admin' ? 'INTRO_ADMIN_' : 'INTRO_PUBLIC_';
	var introSteps = [];
	if(mode =='admin') {
		introSteps = [{
			step: 1,
			position: 'auto',
			intro: i18n.__(prefix + 'INTRO1', query.admpwd), // add password
		}, {
			step: 2,
			position: 'right',
			element: $('#loginModal .modal-content').get(0),
			intro: i18n.__(prefix + 'INTRO2'), 
			tooltipClass : 'hideNext',
		},{
			step: 3,
			position: 'auto',
			intro: i18n.__(prefix + 'INTRO3', 'NOMDUSUJET'), 
		},{
			step: 20,
			position: 'auto',
			intro: i18n.__(prefix + 'INTROFINAL'), 
		}];
		$('#loginModal').modal('show');
		$('.nav-tabs a[href="#nav-signup"]').tab('show');

	} else {	// public

	}
	
	var specialOptions = {
		'SETTINGS' : { tooltipClass : 'hideNext' },
		'PLAYLISTS_MANAGE_BUTTON' :  { tooltipClass : 'hideNext' },
		'MODE' : { disableInteraction : true }

	};
	
	$('[introStep]').each((k,v) => {
		var label =  $(v).attr('introLabel').toUpperCase();
		var position = $(v).attr('introPosition');
		if(!position) position = 'auto';
		
		console.log(prefix + label + ' ' + position);
		var options = {
			step: $(v).attr('introStep'),
			position: position,
			element: v,
			intro: i18n.__(prefix + label), 
		};
		options = Object.assign(options, specialOptions[label]);

		introSteps.push(options);
	});

	introSteps = introSteps.sort(function(a, b) {
		return a.step - b.step;
	});

	introJs.setOptions({
		steps: introSteps,
		hideNext: true,
		exitOnOverlayClick: false

	});

	introJs.onchange(function(targetElement) {
		var $el = $(targetElement);
		if(this._currentStep == 2) {
			var text = introJs._introItems[2].intro;
			text = text.replace('NOMDUSUJET', logInfos.username);
			introJs._introItems[2].intro = text;
		} 
	});

	introJs.onafterchange(function(targetElement) {
		var $el = $(targetElement);
		if(this._currentStep == 1) {
			$('#loginModal').modal('show');
			$('.nav-tabs a[href="#nav-signup"]').tab('show');
							
			$('#loginModal').addClass('introJsFix');
			$('#signupRole').val('admin');
		} else if (this._currentStep == 2) {
			if($('#loginModal').hasClass('in')) {
				$('#nav-signup .login').click();
				$('#loginModal').modal('hide');
			}
		} else if (this._currentStep == 12) {
			$('[name="kara_panel"]').bootstrapSwitch('state', true, false);
		}

		var buttons = $('.introjs-tooltipbuttons > a');
		buttons.attr('class', 'btn btn-xs btn-default');
	});
	introJs.oncomplete(function() {
		$('[name="kara_panel"]').bootstrapSwitch('state', true, false);
	});

	$('#loginModal').modal('show');
	introJs.start();
}