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
	
	$('.showSettings').click(function(){
		window.callHelpModal();
	});
	$('.showPoll').click(function(){
		$('#pollModal').modal('show');
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

var settings = {};

getPublicSettings = function() {
	var promise = $.Deferred();
	$.ajax({ url: 'public/settings' }).done(function (configAndVersiondata) {
        var config = configAndVersiondata.config;
        if(typeof settings.Frontend !=="undefined"
            && config.Frontend.Mode !== settings.Frontend.Mode) {	// webapp mode changed, reload app and all
			window.location.reload();
		}
		promise.resolve();

        // Init with player infos, set the playlist's id where users can add their karas
		settings = config;
	}); 
	return promise.promise();
};