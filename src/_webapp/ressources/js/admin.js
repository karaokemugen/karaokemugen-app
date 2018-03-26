var mouseDown;          // Boolean : capture if the mouse is pressed

(function (yourcode) {
	yourcode(window.jQuery, window, document);
}(function ($, window, document) {
	// The $ is now locally scoped 
	// Listen for the jQuery ready event on the document
	$(function () {

		/* init selects & switchs */

		$('[name="kara_panel"]').on('switchChange.bootstrapSwitch', function (event, state) {
			if (state) {
				$('#playlist').show();
				$('#manage').hide();
			} else {
				$('#playlist').hide();
				$('#manage').show();
			}
		});

		// handling small touchscreen screens with big virtual keyboard

		$('select[type="playlist_select"]').on('select2:open', function () {
			//$('#header').hide();
			$('.select2-dropdown').css('z-index', '9999');
		});

		$('select[type="playlist_select"]').on('select2:close', function () {
			// $('#header').show();
			$('.select2-dropdown').css('z-index', '1051');
			document.body.scrollTop = 0; // For Chrome, Safari and Opera 
			document.documentElement.scrollTop = 0; // For IE and Firefox
		});

		$('#volume').on('mouseleave', () => {
			$('#volume').click();
		});
		$('button[action="command"], a[action="command"]').click(function (e) {
			var name = $(this).attr('name');
			var dataAjax = { command: name };

			if ($(this).val() != '') dataAjax['options'] = $(this).val();

			if (e.target.name == 'setVolume') {
				var btn = $(e.target);
				var val = parseInt(btn.val()), base = 100, pow = .76;
				val = Math.pow(val, pow) / Math.pow(base, pow);
				val = val * base;
				dataAjax = { command: btn.attr('name'), options: val };
			}

			$.ajax({
				url: 'admin/player',
				type: 'PUT',
				data: dataAjax
			}).done(function () {
				// refreshPlayerInfos();
			});
		});

		$('input[action="command"][switch="onoff"]').on('switchChange.bootstrapSwitch', function () {
			var val = $(this).attr('nameCommand');
			if(!val) val =  $(this).attr('name');

			$.ajax({
				url: 'admin/player',
				type: 'PUT',
				data: { command: val }
			}).done(function () {
				// refreshPlayerInfos();
			});
		});

		$('button[action="poweroff"]').click(function () {
			$.ajax({
				url: 'admin/shutdown',
				type: 'POST',
			}).done(function () {
				DEBUG && console.log('Shutdown');
				stopUpdate = true;
			});
		});

		$('#adminMessage').click(function () {
			displayModal('prompt', 'Message indispensable', 
				'<select class="form-control" name="destination"><option value="screen">' + i18n.__('CL_SCREEN') + '</option>'
																+ '<option value="users">' + i18n.__('CL_USERS') + '</option><option value="all">' + i18n.__('CL_ALL') + '</option></select>'
																+ '<input type="text"name="duration" placeholder="5000 (ms)"/>', function(data){
					var msgData =  { message: data.modalInput, destination : data.destination };
					if (data.duration) {
						msgData['duration'] = data.duration; 
					}
					ajx('POST', 'admin/player/message', msgData);
				}
			);
		});
	
		$('#settings select').change(function () {
			setSettings($(this));
		});
		$('#settings input[type!="checkbox"][exclude!="true"]').blur(function () {
			setSettings($(this));
		});
		$('#settings input[type="checkbox"], input[name="EnginePrivateMode"]').on('switchChange.bootstrapSwitch', function () {
			setSettings($(this));
		});

		$('#settings input').focus(function () {
			$(this).attr('oldValue', $(this).val());
		}).keypress(function (e) { // allow pressing enter to validate a setting
			if (e.which == 13) {
				$(this).blur();
			}
		});

		$('[name="searchPlaylist"]').keypress(function (e) { // allow pressing enter to validate a setting
			if (e.which == 13) {
				$(this).blur();
			}
		});
        
		$('.playlist-main').on('keypress', '#bcVal', function (e) {
			if (e.which == 13) {
				$('#blacklistCriteriasInputs').find('#bcAdd').click();
			}
		});

		$('.playlist-main').on('click', 'button.addBlacklistCriteria', function () {
			// TODO check if type is valid maybe
			var type = $('#bcType').val();
			var val = $('#bcVal').val();
			var data = { blcriteria_type: type, blcriteria_value: val };
			$.ajax({
				url: scope + '/blacklist/criterias',
				type: 'POST',
				data: data
			}).done(function () {
				//displayMessage('success', 'Success', 'Criteria ' + type + ' - ' + val + ' added to the list');
			});
		});

		$('.playlist-main').on('click', '.deleteCriteria', function () {
			// TODO check if type is valid maybe
			var bcId = $(this).closest('li').attr('blcriteria_id');
			$.ajax({
				url: scope + '/blacklist/criterias/' + bcId,
				type: 'DELETE'
			}).done(function () {
				//displayMessage('success', 'Success', 'Blacklist criteria ' + bcId + ' deleted');
			});
		});
		$('.playlist-main').on('change', '#bcType', function () {
			if(bcTags) {
				var bcType = $(this).val();
				var bcTagsFiltered = jQuery.grep(bcTags, function (obj) {
					return obj.type == bcType;
				});
	
				var $bcValInput;
				if (bcTagsFiltered.length > 0) {
					$bcValInput = $('<select id="bcVal" class="input-sm"></select>');
					$.each(bcTagsFiltered, function (i, o) {
						var $option = $('<option/>').attr('value', o.tag_id).text(o.name_i18n);
						$bcValInput.append($option);
					});
				} else {
					$bcValInput = $('<input type="text" id="bcVal" class="input-sm"/>');
				}
				$('#bcValContainer').empty().append($bcValInput);
	
				if (bcTagsFiltered.length > 0) {
					$('#bcVal').select2({ theme: 'bootstrap', dropdownAutoWidth: true, minimumResultsForSearch: 7 });
	
				}
			} else {
				console.log("Err: bcTags empty");
			}
		});

		
		// main actions on karas in the playlists
		$('.playlist-main').on('click contextmenu', '.actionDiv > button:not(.clusterAction)', function (e) {
			if(e.type === 'contextmenu') {
				e.preventDefault();
			}
			var side = $(this).closest('.panel').attr('side');
        
			var li = $(this).closest('li');
			var idPlaylistFrom = parseInt($('#selectPlaylist' + side).val());
			var idPlaylistTo = parseInt($('#selectPlaylist' + non(side)).val());
			var idKara, idKaraPlaylist;
			var clusterAction = false;
			var nameElementId = idPlaylistFrom !== -3 ? 'idplaylistcontent' : 'idwhitelist';

			if($(this).parent().hasClass('plCommands')) {
				clusterAction = true;
				var checkedList = $(this).closest('.panel').find('li:has(span[name="checkboxKara"][checked])');
				var idKaraList = checkedList.map(function (k, v) {
					return $(v).attr('idkara');
				});
				var idKaraPlaylistList = checkedList.map(function (k, v) {
					return $(v).attr(nameElementId);
				});
                
				li = checkedList;
				idKara = Array.prototype.slice.apply(idKaraList).join();
				idKaraPlaylist = Array.prototype.slice.apply(idKaraPlaylistList).join();
				if(!idKara && !idKaraPlaylist) {
					DEBUG && console.log('No kara selected');
					return false;
				}
			} else {
				idKara = li.attr('idkara');
				idKaraPlaylist = li.attr(nameElementId);
			}

			var action = $(this).attr('name');
			DEBUG && console.log(action, side, idPlaylistFrom, idPlaylistTo, idKara);

			var promise = $.Deferred();
			var url, data, type;
			if (action === 'addKara' || action === 'transferKara') {
				url = '', data = {}, type = '';
				type = 'POST';

				if (idPlaylistTo > 0) {
					url = scope + '/playlists/' + idPlaylistTo + '/karas';
					var requestedby = idPlaylistFrom == -1 || li.data('username') == undefined ? logInfos.username : li.data('username');
					data = { requestedby: requestedby, kara_id: idKara };
				} else if (idPlaylistTo == -1) {
					//displayMessage('warning', 'Error','can\'t add kara to the kara list from database');
					DEBUG && console.log('ERR: can\'t add kara to the kara list from database');
				} else if (idPlaylistTo == -2 || idPlaylistTo == -4) {
					url = scope + '/blacklist/criterias';
					data = { blcriteria_type: 1001, blcriteria_value: idKara };
				} else if (idPlaylistTo == -3) {
					url = scope + '/whitelist';
					data = { kara_id: idKara};
				}

				if(e.type === 'contextmenu') {
					data.pos = -1;
				}

				DEBUG && console.log('ACTION : ', idPlaylistTo, url, type, data);
				if (url !== '') {
					$.ajax({
						url: url,
						type: type,
						data: data
					}).done(function (data) {
						DEBUG && console.log(data);
						promise.resolve();
						playlistContentUpdating.done( function() {
							scrollToKara(non(side), idKara); 
						});
						var ajout = clusterAction ?   li.length + ' karas'
							: '"' + li.find('.contentDiv').text() + '"';
						if(clusterAction) li.find('span[name="checkboxKara"][checked]').attr('checked', false);
                    	/*
						displayMessage('success', ajout, ' ajouté' +  (clusterAction ? 's' : '')
							+ ' à la playlist <i>' +$('#selectPlaylist' + non(side) + ' > option[value="' + idPlaylistTo + '"]').data('name') + '</i>.');
						*/
						DEBUG && console.log('Kara ' + idKara + ' to playlist (' + idPlaylistTo + ') '
							+ $('#selectPlaylist' + non(side) + ' > option[value="' + idPlaylistTo + '"]').text() + '.');
					}).fail(function () {
						scrollToKara(non(side), idKara);
					});
				}
			} else {
				promise.resolve();
			}
			if (action === 'transferKara' || action === 'deleteKara') {
				// temp solution to database transaction issue
				promise.done( function() {
					li.addClass('deleted');
					url = '', data = {}, type = '';
					type = 'DELETE';
					if (idPlaylistFrom > 0) {
						url = scope + '/playlists/' + idPlaylistFrom + '/karas/';
						data['plc_id'] = idKaraPlaylist;
					} else if (idPlaylistFrom == -1) {
						DEBUG && console.log('ERR: can\'t delete kara from the kara list from database');
					} else if (idPlaylistFrom == -2) {
						DEBUG && console.log('ERR: can\'t delete kara directly from the blacklist');
					} else if (idPlaylistFrom == -3) {
						url = scope + '/whitelist';
						data['wlc_id'] = idKaraPlaylist;
					}
					if (url !== '') {
						$.ajax({
							type: 'DELETE',
							url: url,
							data: data
						}).done(function () {
							li.hide();
							//fillPlaylist(side);
						});
					}
				});
			}
		});
		
		$('.playlist-main').on('click', '.infoDiv > button.playKara', function () {
			var liKara = $(this).closest('li');
			var idPlc = parseInt(liKara.attr('idplaylistcontent'));
			var idPlaylist = parseInt($('#selectPlaylist' + $(this).closest('ul').attr('side')).val());

			$.ajax({
				type: 'PUT',
				url: scope + '/playlists/' + idPlaylist + '/karas/' + idPlc,
				data: { flag_playing: '1' }
			}).done(function () {
				DEBUG && console.log('Kara plc_id ' + idPlc + ' flag_playing set to true');
			});
		});
		$('.playlist-main').on('click', 'button.showPlaylistCommands', function () {
			$(this).closest('.plDashboard').toggleClass('advanced');
			$(window).resize();
		
			if( $('.plDashboard').hasClass('advanced') && ($('#playlist1').parent().height() < 200 ||  $('#playlist2').parent().height() <  200) ) {
				$('body').addClass('hiddenHeader');
			} else if(!$('.plDashboard').hasClass('advanced')) {
				$('body').removeClass('hiddenHeader');
			}
                
			$(this).toggleClass('btn-primary');
		});
        
		$('.playlist-main').on('click', 'span[name="checkboxKara"]', function () {
			var checked = $(this).attr('checked');
			$(this).attr('checked', !checked);
		});

		$('#karaInfo').click(function (e) {
			if (status != undefined && status != '' && status != 'stop') {
				//refreshPlayerInfos(goToPosition, e);
				goToPosition(e);
			}
		});

		$('#karaInfo').on('mousedown touchstart', function (e) {
			if (status != undefined && status != '' && status != 'stop') {
				stopUpdate = true;
				mouseDown = true;
				$('#progressBarColor').removeClass('cssTransform')
					.css('transform', 'translateX(' + e.pageX + 'px)')
					.addClass('');
               
				$('#progressBar').attr('title', oldState.timeposition);
			}
		});
		$('#karaInfo').mouseup(function () {
			mouseDown = false;
		});
		$('#karaInfo').mousemove(function (e) {
			if (mouseDown) {
				$('#progressBarColor').removeClass('cssTransform')
					.css('transform', 'translateX(' + e.pageX + 'px)')
					.addClass('');       
			}
		});
		$('#karaInfo').mouseout(function () {
			if (mouseDown) {
				$('#progressBarColor').addClass('cssTransform');
				stopUpdate = false;
				mouseDown = false;
				//refreshPlayerInfos();
			}
		});

		/* password case handlers */

		$('#confirmPassword, #passwordSettings').on('input', function () {
			if ($('#confirmPassword').val() === $('#passwordSettings').val() && $('#passwordSettings').val() !== '') {
				$('#sendPassword').attr('oldvalue', $('#sendPassword').val());
				$('#sendPassword').val($('#confirmPassword').val());
				$('#sendPassword').removeClass('btn-danger').addClass('btn-success');
				$('#sendPassword').prop('disabled', false);
			} else {
				$('#sendPassword').addClass('btn-danger').removeClass('btn-success');
				$('#sendPassword').prop('disabled', true);
			}
		});
		$('#sendPassword').click(function () {
			setSettings($(this), true);
		});

		setStopUpdate = function (stop) {
			stopUpdate = stop;
		};
		$('select[name="PlayerScreen"] > option').each(function(i) {
			$(this).text(i+1 + ' - ' + $(this).text());
		});

	});

	/*** INITIALISATION ***/
	/* variables & ajax setup */

	mouseDown = false;
	scope = 'admin';
	panel1Default = -1;

	// dynamic creation of switchable settings 
	var htmlSettings = '';
	$.each(settingsOnOff, function (e, val) {
		var htmlString = '<div class="form-group"><label for="' + e + '" class="col-xs-4 control-label">' + val + '</label>'
												+ '<div class="col-xs-6"> <input switch="onoff" type="checkbox" name="' + e + '"></div></div>';
		if (e === 'PlayerPIP') {
			$(htmlString).insertBefore('#pipSettings');
		} else if (e === 'EngineDisplayConnectionInfo') {
			$(htmlString).insertBefore('#connexionInfoSettings');
		} else if (e === 'EngineFreeUpvotes') {
			$(htmlString).insertBefore('#freeUpvotesSettings');
		} else {
			htmlSettings += htmlString;
		}
	});

	$('#settings').append(htmlSettings);

	// nameExclude = input not being updated (most likely user is on it)
	getSettings = function (nameExclude) {
		var promise = $.Deferred();
		$.ajax({ url: 'admin/settings' }).done(function (data) {
			settings = data;
			$.each(data, function (i, val) {
				var input = $('[name="' + i + '"]');
				// DEBUG && console.log(i, val);
				if (input.length == 1 && i != nameExclude && settingsNotUpdated.indexOf(i) === -1) {
					if (input.attr('type') !== 'checkbox') {
						input.val(val);
					} else { // only checkbox here
						val =  parseInt(val);
						input.bootstrapSwitch('state', val, true);
						input.val(val);
						if (input.attr('name') === 'PlayerPIP') {
							val ? $('#pipSettings').show('500') : $('#pipSettings').hide('500');
						} else if (input.attr('name') === 'EngineDisplayConnectionInfo') {
							val ? $('#connexionInfoSettings').show('500') : $('#connexionInfoSettings').hide('500');
						} else if (input.attr('name') === 'EngineFreeUpvotes') {
							val ? $('#freeUpvotesSettings').show('500') : $('#freeUpvotesSettings').hide('500');
						}
					}
				}
			});

			playlistToAdd = data['EnginePrivateMode'] == 1 ? 'current' : 'public';
            
			$.ajax({ url: 'public/playlists/' + playlistToAdd, }).done(function (data) {
				playlistToAddId = data.playlist_id;
				promise.resolve();
			});
		});

		return promise.promise();
	};

	/* el is the html element containing the value being updated */
	setSettings = function (el, changeAdminPass) {
		//    DEBUG && console.log( $(e).attr('name'), $(e).val(), $(e));
		if (el.attr('oldValue') !== el.val() || el.attr('type') === 'checkbox') {
			settingsUpdating = getSettings(el.attr('name'));
			if(changeAdminPass) passwordUpdating = $.Deferred();

			$('#settings').promise().then(function () {
				settingsArray = {};
				formArray = $('#settings').serializeArray()
					.concat($('#settings input[type=checkbox]:not(:checked)')
						.map(function () {
							return { name: this.name, value: '0' }; 
						})
						.get());

				$(formArray).each(function (index, obj) {
					settingsArray[obj.name] = obj.value;
				});
				settingsArray['EnginePrivateMode'] = $('input[name="EnginePrivateMode"]').val();
				// ignore currently typed value if the pass is not changing
				settingsArray['AdminPassword'] = changeAdminPass ? $('button[name="AdminPassword"]').val() : $('button[name="AdminPassword"]').attr('oldValue');
		
				DEBUG && console.log('setSettings : ', settingsArray);

				$.ajax({
					type: 'PUT',
					url: 'admin/settings',
					data: settingsArray
				}).done(function () {
					if (changeAdminPass) {
						setupAjax(settingsArray['AdminPassword']);
						$('button[name="AdminPassword"]').attr('oldValue', settingsArray['AdminPassword']);
						
						passwordUpdating.resolve();
					}
				}).fail(function () {
					if (changeAdminPass) { passwordUpdating.resolve(); }
					el.val(el.attr('oldValue')).focus();
				});
			});
		}
	};


	/* progression bar handlers part */

	goToPosition = function (e) {
		var karaInfo = $('#karaInfo');
		var songLength = karaInfo.attr('length');
		var barInnerwidth = karaInfo.innerWidth();
		var futurTimeX = e.pageX - karaInfo.offset().left;
		//var presentTimeX = $('#progressBarColor').width();
		var futurTimeSec = songLength * futurTimeX / barInnerwidth;
        
		$('#progressBarColor').removeClass('cssTransform')
			.css('transform', 'translateX(' + e.pageX + 'px)')
			.addClass('');

		//var start_time = new Date().getTime();
		$.ajax({
			url: 'admin/player',
			type: 'PUT',
			data: { command: 'goTo', options: futurTimeSec},
			complete : function() {
				$('#progressBarColor').addClass('cssTransform'); 
			}
		})
			.done(function () {
				//var request_time = new Date().getTime() - start_time;
				setStopUpdate(false);
			});
	};

	$('#flag1, #flag2').on('click', 'button', function () {
		var btn = $(this);
		var name = btn.attr('name');
		var selector = btn.closest('.panel-heading').find('[type="playlist_select"]');
		var idPlaylist = selector.val();
		var namePlaylist = selector.find('option[value="' + idPlaylist + '"]').data('name');
		var data = {}, urlEnd = '';

		if (name === 'flag_current' && !btn.hasClass('btn-primary')) {
			urlEnd = '/setCurrent';
		} else if (name === 'flag_public' && !btn.hasClass('btn-primary')) {
			urlEnd = '/setPublic';
		} else if (name === 'flag_visible') {
			urlEnd = '';
			setTo = btn.closest('.plDashboard').data('flag_visible') == '1' ? 0 : 1;
        
			if(idPlaylist > 0) {
				data = { name: namePlaylist, flag_visible: setTo };
			} else {
				var list = { '-2' : 'Blacklist', '-3' : 'Whitelist', '-4' : 'BlacklistCriterias' };
				$('input[name="EngineAllowView' + list[idPlaylist] + '"]').val(1).bootstrapSwitch('state', setTo);
				return false;
			}
		}
		$.ajax({
			url: 'admin/playlists/' + idPlaylist + urlEnd,
			type: 'PUT',
			data: data
		}).done(function () {
			//refreshPlaylistSelects();
		});
	});

	$('#flag1, #flag2').on('contextmenu', 'button', function (e) {
		e.preventDefault();
		var btn = $(this);
		var name = btn.attr('name');
		var selector = btn.closest('.panel-heading').find('[type="playlist_select"]');
		var idPlaylist = selector.find('option[data-' + name + '="1"]').val();
		console.log(idPlaylist, selector);
		selector.val(idPlaylist).change();
	});

	$('.import-file').change(function() {
		if ( ! window.FileReader ) return alert( 'FileReader API is not supported by your browser.' ); 
		
		var dashBoard = $(this).closest('.plDashboard');
		var select = dashBoard.find('.plSelect select');
		var input = this;
		if ( input.files && input.files[0] ) {
			file = input.files[0]; 
			fr = new FileReader();
			fr.onload = function () {
				var data = {};
				data['playlist'] = fr['result'];
				var name = JSON.parse(fr.result).PlaylistInformation.name;
				ajx('POST', scope + '/playlists/import', data, function(response) {
					displayMessage('success', 'Playlist importée' + ' : ', name);
					if(response.unknownKaras.length > 0) {
						displayMessage('warning', 'Karas inconnus' + ' : ', response.unknownKaras );
					}
					playlistsUpdating.done( function() {
						select.val(response.playlist_id).change();
					});
				});
			};
			fr.readAsText( file );
		} 
	});

	$('.controls button').click(function () {
		var name = $(this).attr('name');
		var dashBoard = $(this).closest('.plDashboard');
		var select = dashBoard.find('.plSelect select');
		var selectedOption = dashBoard.find('[type="playlist_select"] > option:selected');
		var playlistName = selectedOption.data('name');
		var idPlaylist = parseInt(dashBoard.data('playlist_id'));
        
		var url = scope + '/playlists/' + idPlaylist;
		var type = '', data = {};

		if(name == 'shuffle') {
			url += '/shuffle';
			type = 'PUT';
			ajx(type, url, data);
		} else if (name == 'export') {
			url += '/export';
			type = 'GET';
			ajx(type, url, data, function(data) {
				var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data,null,4));
				var dlAnchorElem = document.getElementById('downloadAnchorElem');
				dlAnchorElem.setAttribute('href', dataStr);
				dlAnchorElem.setAttribute('download', ['KaraMugen', playlistName, new Date().toLocaleDateString().replace('\\','-')].join('_') + '.kmplaylist');
				dlAnchorElem.click();
			});
		} else if (name == 'import') {
			/*
			url = scope + '/playlists/import';
			type = 'POST';
            
			displayModal('prompt','Collez votre JSON ci-dessous', '', function(json){
				data['playlist'] = json;
				ajx(type, url, data);
			});
			*/
		} else if (name == 'editName') {
			type = 'PUT';
			$.each(['flag_current', 'flag_visible', 'flag_public'], function(k, v){
				data[v] = selectedOption.data(v);
			});
            
			displayModal('prompt', i18n.__('CL_RENAME_PLAYLIST', playlistName), '', function(newName){
				data['name']  = newName;
				ajx(type, url, data);
			}, playlistName);
		} else if (name == 'add') {
			type = 'POST';
			url = 'admin/playlists';

			displayModal('prompt', i18n.__('CL_CREATE_PLAYLIST', playlistName),'',
				function(playlistName) {
					data = { name: playlistName, flag_visible: 0, flag_current: 0, flag_public: 0 };
					ajx(type, url, data, function (idNewPlaylist) {
						playlistsUpdating.done(function () {
							select.val(idNewPlaylist).change();
						});
					});
				}
			);
		} else if (name == 'delete') {
			url += '';
			type = 'DELETE';
			displayModal('confirm', i18n.__('CL_DELETE_PLAYLIST', playlistName), '', function(confirm){
				if( confirm ) {
					ajx(type, url, data, function() {
						playlistsUpdating.done(function() {
							select.change(); 
						}); 
					});
				}
			});
		} else if (name == 'startFavMix') {
			$.ajax({
				url: 'public/users/', 	
				type: 'GET'})
				.done(function (response) {
					var userList = response.filter(u => u.type<2);
					
					var userlistStr = '<div class="automixUserlist">';
					$.each(userList, function(i, k) {
						userlistStr +=
							'<div class="checkbox"><label>'
						+	'<input type="checkbox" name="users"'
						+	' value="' + k.login + '" ' + (k.flag_online==1 ? 'checked' : '') + '>'
						+	k.nickname + '</label></div>';
					});
					userlistStr += '</div>';

					displayModal('custom', i18n.__('START_FAV_MIX'), 
						userlistStr	+ '<input type="text"name="duration" placeholder="200 (min)"/>',
						function(data){
							if(!data.duration) data.duration = 200;
							$.ajax({
								url: 'admin/automix',
								type: 'POST',
								data: data })
								.done(function(response) {
									var idNewPlaylist = response.playlist_id;
									playlistsUpdating.done(function () {
										select.val(idNewPlaylist).change();
									});
								});
						}
					);
				});	
		}
      
       
	});

	changeKaraPos = function (e) {
		var liKara = e.closest('li');
		var idKara = liKara.attr('idKara');
		var side = liKara.closest('ul').attr('side');
		var posFromPrev = parseInt(liKara.prev('li').attr('pos')) + 1;
		var posFromNext = parseInt(liKara.next('li').attr('pos'));
		posFromPrev = isNaN(posFromPrev) ? posFromNext : posFromPrev;
		posFromNext = isNaN(posFromNext) ? posFromPrev : posFromNext;

		if (posFromPrev != posFromNext || isNaN(posFromPrev) && isNaN(posFromNext)) {
			displayMessage('warning', 'Err:',  i18n.__('CL_WRONG_KARA_ORDER'));
			fillPlaylist(side);
			return false;
		} else {
			var idPlc = parseInt(liKara.attr('idplaylistcontent'));
			var idPlaylist = parseInt($('#selectPlaylist' + side).val());

			$.ajax({
				type: 'PUT',
				url: scope + '/playlists/' + idPlaylist + '/karas/' + idPlc,
				data: { pos : posFromPrev }
			}).done(function () {
				DEBUG && console.log('Kara plc_id ' + posFromPrev + ' pos changed');
			}).fail(function () {
				fillPlaylist(side);
			});
			scrollToKara(side, idKara, .55); 
		}
	};

	// you know what it is
	var k = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65], n = 0;
	$(document).keydown(function (e) {
		if (e.keyCode === k[n++]) {
			if (n === k.length) {
				displayModal('alert', '<span style="color:red">World destruction panel</span>',
					'<button class="btn btn-danger"> rip </button>');
				n = 0;
				return false;
			}
		} else {
			n = 0;
		}
	});
}));