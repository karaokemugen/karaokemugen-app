$(document).ready(function () {
	
	$('#choixPseudo').focus(function(){
		this.value = '';
	});

	$('#choixPseudo').blur(function(){
		if($(this).val()) {
			$.ajax({
				url: 'public/myaccount', 	
				type: 'PUT',
				data: { nickname : $(this).val() }
			})
				.done(function (response) {
					if($('#pseudo > option[value="' + pseudo +'"]').length == 0) {
						$('#pseudo').append($('<option>', {value: pseudo}));
					}
					pseudo = response.nickname;
					$('#choixPseudo').val(pseudo);
				})
				.fail( (response) => {
					
				});
		}
	});
	
	$('.btn.tour').click(function(){
		startIntro('public');
	});

	$('.showSettings').click(function(){
		$('#settingsPublic').modal('show');
	});
	$('.showPoll').click(function(){
		buildPollFromApi();
		$('#pollModal').modal('show');
	});
	$('#pollModal').on('click', 'button.poll', (e) => {
		var playlistcontent_id = $(e.target).val();
		
		$.ajax({ url: 'public/songpoll/',
			type: 'POST',
			data: { playlistcontent_id : playlistcontent_id }
		}).done(function() {
			$('#pollModal').modal('hide');
		});
	});

	$('input[name="lyrics"]').on('switchChange.bootstrapSwitch', function () {
		if(!$(this).is(':checked')) {   
			$('#karaInfo > span').text( $('#karaInfo > span').data('text') );
		}
	});

	$('input[name="kara_panel"]').on('switchChange.bootstrapSwitch', function () {
		if ($(this).val() == 0) {
			$('#searchPlaylist1').fadeIn(animTime);
			$('#playlist1').closest('.panel').show();
			$('#playlist2').closest('.panel').css('width', '');
		} else {
			$('#searchPlaylist1').fadeOut(animTime);
			$('#playlist1').closest('.panel').hide();
			$('#playlist2').closest('.panel').css('width', '100%');
		}

	});

	$('#menuMobile').click(function(){
		var opened = $(this).data('opened');
		opened = !opened;

		ul = $(this).parent().find('ul');
		if(opened) ul.show();
		ul.css('opacity', opened ? '1' : '0');
		setTimeout(function() {
			if(!opened) ul.hide();
		}, 500);    
    
		$(this).data('opened', opened);
	});
	$('.tourAgain').click(() => {
		startIntro('public', 'afterLogin');
		$('#settingsPublic').modal('hide')
	});
	$('#switchInfoBar').click(function(){
		$(this).toggleClass('showLyrics');
		if(  $(this).hasClass('showLyrics') ) {
			$('input[name="lyrics"]').prop('checked', true);
		} else {
			$('input[name="lyrics"]').prop('checked', false);
		}
		$('input[name="lyrics"]').trigger('switchChange.bootstrapSwitch');
    });
});

var datePlus10 = new Date();
datePlus10.setFullYear(datePlus10.getFullYear() + 10);

var currentPanning;
var settings = {};
refreshTime = 2000;
panel1Default = -1;

getPublicSettings = function() {
	var promise = $.Deferred();
	$.ajax({ url: 'public/settings' }).done(function (configAndVersiondata) {
        var config = configAndVersiondata.config;
        if(typeof settings.Frontend !=="undefined"
            && config.Frontend.Mode !== settings.Frontend.Mode) {	// webapp mode changed, reload app and all
			window.location.reload();
		}

        playlistToAdd = config.Karaoke.Private ? 'current' : 'public';
        
		$('[name="modalLoginServ"]').val(config.Online.Users ? config.Online.Host : '');

		$.ajax({ url: 'public/playlists/' + playlistToAdd, }).done(function (data) {
			playlistToAddId = data.playlist_id;
			playlistToAddName = data.name;

			if(webappMode === 1) {
				$('#selectPlaylist1').empty()
					.append('<option default value="' + playlistToAddId + '"  data-playlist_id="' +  playlistToAddId + '"><option>')
					.change();
			}

			promise.resolve();
		});

        // Init with player infos, set the playlist's id where users can add their karas
		settings = config;
			
		$('#version').text(configAndVersiondata.version.name + ' ' + configAndVersiondata.version.number);
		$('#mode').text(configAndVersiondata['Karaoke.Private'] ? 'Privé' : 'Public');
	}); 
	return promise.promise();
};

/* touchscreen event handling part */

var swipeLeft = false;
var swipeRight = false;
var sensibility = isTouchScreen ? .26 : .18;

var elem = $('.playlist-main');
var swipeManager = new Hammer.Manager(elem[0],{
	prevent_default: true
});

var swipe = new Hammer.Swipe({'threshold' : 1, velocity : .05,  direction : Hammer.DIRECTION_HORIZONTAL });

swipeManager.add(swipe);

swipeManager.on('swipe', function (e) {
	if(isSmall) {
		panelWidth =  $('#panel1').width();
		var elem = $('#panel1, #panel2');
		elem.css({transition: 'transform 1s ease'});
		if(e.direction == 2 ) {
			elem.css({transform: 'translateX('+ -1 * panelWidth+'px)'});
			if(introManager && introManager._currentStep) introManager.goToStepNumber(19);
		} else if (e.direction == 4) {
			elem.css({transform: 'translateX(0)'});
			if(introManager && introManager._currentStep) introManager.goToStepNumber(27);
		}
	}
});


if(webappMode == 2) {

	var publicTuto = readCookie('publicTuto');
	if(!publicTuto) {
		$('#loginModal').addClass('firstRun');
	}

	// for each side
	[1,2].forEach(function(side){
		
		var swipable = $('.list-group[side="' + side + '"]');
		
		if(swipable.length > 0) {
			
			
			var manager = new Hammer.Manager(swipable[0],{
				prevent_default: false
			});
			
			var panner = new Hammer.Pan({ direction: Hammer.DIRECTION_HORIZONTAL, threshold: 50 });
			var tapper = new Hammer.Tap();
			
			manager.add(panner);
			manager.add(tapper);

			if(side == 1) {
				manager.on('pan', function (e) {
					e.gesture = e;
					
					if ((e.gesture.pointerType === 'touch' || e.gesture.pointerType === 'mouse')) {
						var $this = $(currentPanning);
						var direction = e.gesture.direction;
						var x = e.gesture.deltaX;
						var velocityX = e.gesture.velocityX;
						DEBUG && console.log(e,direction,x );
						if(direction != 4 &&  direction != 2) {
							return false;
						}
						
						if(x > $this.innerWidth() * .12) {
							$this.velocity({ translateX: x
							}, { duration: 50, queue: false, easing: 'easeOutQuad' });

						}
						
						
						
						// Swipe Left
						if (direction === 4 && (x > $this.innerWidth()  * sensibility || velocityX < -0.75)) {
							swipeLeft = true;
							$this.attr('valid', true) ;
						}
						if(direction === 2 && (x < -1 * $this.innerWidth()  * sensibility )) {
							swipeLeft = false;
							$this.attr('valid', false) ;
						}
						// Swipe Right
						if (direction === 2 && (x < -1 * $this.innerWidth()  * sensibility  || velocityX > 0.75)) {
							swipeRight = true;
						}
					}
				}).on('panend', function (e) {
					if(currentPanning) {
						e.gesture = e;
						var $this = $(currentPanning);
						// Reset if list-group is moved back into original position
						if (Math.abs(e.gesture.deltaX) < $this.innerWidth() * sensibility) {
							swipeRight = false;
							swipeLeft = false;
							$this.attr('valid', false) ;
						}
			
						if (e.gesture.pointerType === 'touch' || e.gesture.pointerType === 'mouse') {
							if (swipeLeft) {
								var fullWidth;
								if (swipeLeft) {
									fullWidth = $this.innerWidth();
								} else {
									fullWidth = -1 * $this.innerWidth();
								}
						
								heightSave = $this.height();
								$this.velocity({ translateX: fullWidth
								}, { duration: 100, queue: false, easing: 'easeOutQuad', complete: function () {
									if( $this.is(':visible') ) {
										$this.removeClass('list-group-item');
										$this.velocity({ height: 0
										}, { duration: 100, queue: false, easing: 'easeOutQuad', complete: function () {
										}});
										var idKara = $this.attr('idkara');
										$this.hide();
										addKaraPublic(idKara, function() {
											$this.remove();
										}, function() {	// if it fails
											$this.show();
											
											$this.attr('valid', false) ;
											$this.addClass('list-group-item');
											//revert back the kara
											$this.velocity('stop', true).velocity({ translateX: 0, 
											}, { duration: 200, easing: 'easeOutQuad', complete: function () {
												$this.velocity({ height: heightSave
												}, { duration: 200, easing: 'easeOutQuad', complete: function () {
													$this.height('auto');
												}});
											}});
										});
									}
								}});
						
							} else {
								$this.velocity({ translateX: 0
								}, { duration: 100, queue: false, easing: 'easeOutQuad',  complete: function () {
								}});
							}
							swipeLeft = false;
							swipeRight = false;
						}
					}
					
				});
			} 
			
		}
	});
}