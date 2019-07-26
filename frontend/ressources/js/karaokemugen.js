/* eslint-disable no-undef */
var status;             // String : status of the player
var mode;               // String : way the kara list is constructed, atm "list" supported
var scope;              // String : way the kara list is constructed, atm "list" supported
var welcomeScreen;              // String : if we're in public or admin interface
var refreshTime;        // Int (ms) : time unit between every call
var stopUpdate;         // Boolean : allow to stop any automatic ajax update
var oldState;           // Object : last player state saved
var ajaxSearch;  // 2 variables used to optimize the search, preventing a flood of search
var tags;               // Object : list of blacklist criterias tags
var forSelectTags;      // Object : list of blacklist criterias tags for select use
var series;
var showInfoMessage;	// Object : list of info codes to show as a toast
var softErrorMessage;
var logInfos;			// Object : contains all login infos : role, token, username

var dragAndDrop;        // Boolean : allowing drag&drop
var isTouchScreen;

/* promises */
var playlistsUpdating;
var tagsUpdating;

/* html */

var listTypeBlc;
var tagsTypesList;
var plData;

(function (yourcode) {
	yourcode(window.jQuery, window, document);
}(function ($, window, document) {

	window.t = function(message, value) {
		if (window.translation) {
			return window.translation(message, value);
		} else {
			return message;
		}
	};
	
	var webappMode = 2;

	$(function () {

		welcomeScreen = false;

		// Once page is loaded
		plData = {
			'0' : {
				name: 'Standard playlists',
				url : scope + '/playlists/pl_id/karas',
				canTransferKara : true,
				canAddKara : true,
			},
			'-1' : {
				name : 'Kara list',
				url : 'public/karas',
				canTransferKara : false,
				canAddKara : false,
			},
			'-2' : {
				name : 'Blacklist',
				url : scope + '/blacklist',
				canTransferKara : false,
				canAddKara : true,
			},
			'-3' : {
				name : 'Whitelist',
				url : scope + '/whitelist',
				canTransferKara : true,
				canAddKara : true,
			},
			'-4' : {
				name : 'Blacklist criterias',
				url : scope + '/blacklist/criterias',
				canTransferKara : false,
				canAddKara : true,
			},
			'-5' : {
				name : 'Favorites',
				url : 'public/favorites',
				canTransferKara : true,
				canAddKara : true,
			},
			'-6' : {
				name : 'Kara list recent',
				url : 'public/karas/recent',
				canTransferKara : false,
				canAddKara : false,
			}
		};
		// Background things
		var rdmFlip = Math.floor(Math.random() * 2) + 1;
		$('#panel' + rdmFlip + ' > .playlistContainer').attr('flipped', true);
		$('#panel' + non(rdmFlip) + ' > .playlistContainer').attr('flipped', false);
		var rdmColor = Math.floor(Math.random() * 20) + 1;
		if (rdmColor == 20) $('.playlistContainer').attr('noGreyFace', true);

		// Setup
		$.ajaxSetup({
			dataFilter: function(res) {

				res = JSON.parse(res);
				var data = res.data;
				if(data) { // if server response qualifies as the standard error structure
					if(res.code) {
						var errMessage = res.code;
						if(showInfoMessage.indexOf(res.code) === -1) {
							console.log(res.code, errMessage, 'console');
						} else {
							window.displayMessage('info', '', errMessage, '2000');
						}
					}
					return JSON.stringify(data);
				} else {
					return JSON.stringify(res);
				}
			},
			error: function (res, textStatus, errorThrown) {
				console.log(res.status + '  - ' + textStatus + '  - ' + errorThrown + (res.responseJSON ? ' : ' +  res.responseJSON.message : ''));
				if(res.status != 0 && res.status != 200) {
					var errMessage = 'unknown';
					var code = '';
					if(res.status == 500 && res.responseJSON.code) {
						var args = typeof res.responseJSON.args === 'object' ? Object.keys(res.responseJSON.args).map(function(e) {
							return res.responseJSON.args[e];
						}) : [ res.responseJSON.args];
						errMessage = window.t(res.responseJSON.code, args);
					} else {
						code = window.t('UNKNOWN_ERROR');
						errMessage = res.responseText;
					}
					if(!res.responseJSON) {
						window.displayMessage('warning', code, errMessage);
					}
				}
			}
		});

		setupAjax = function () {
			var headers = logInfos.onlineToken ? { 'Authorization': logInfos.token, 'onlineAuthorization': logInfos.onlineToken } :  { 'Authorization': logInfos.token };
			$.ajaxSetup({
				cache: false,
				headers: headers
			});
		};

		$('.overlay').on('click touchstart', function() {
			var video = $('#video');
			$('.overlay').hide();
			video[0].pause();
			video.removeAttr('src');
		});

		$('.playlist-main').on('click','li.karaSuggestion', function() {
        	var search = $('#searchPlaylist1').val();
			window.callModal('prompt', window.t('KARA_SUGGESTION_NAME'), '', function(text) {
				$.ajax({
					type: 'POST',
					url: 'public/karas/suggest',
					data: {karaName : text}
				})
					.done(function (response) {
						setTimeout(function() {
							window.displayMessage('info', window.t('KARA_SUGGESTION_INFO'),
								window.t('KARA_SUGGESTION_LINK', response.issueURL, 'console'), '30000');
						}, 200);
					})
			}, search);
		
		});

		// (de)select all karas button
		$('.playlist-main').on('click', '.actionDiv > button.clusterAction', function() {
			var $this = $(this);
			var name = $this.attr('name');
			var side = $this.closest('.panel').attr('side');
			var idPlaylist = $this.closest('.plDashboard').data('playlist_id');
			var idPlaylistTo = $('#panel' + non(side) + ' .plDashboard').data('playlist_id');
			var url = getPlData(idPlaylist).url;

			if (name === 'selectAllKaras') {
				var checked = !$this.attr('checked');
				$this.attr('checked', checked);
				$('#playlist' + side + ' [name="checkboxKara"]').attr('checked', checked);
			} else if (name === 'addAllKaras') {
				var filter = $('#searchPlaylist' + side).val();
				$.ajax({ url: url + '?filter=' + filter }).done(function (response) {
					var data = response.content;
					window.displayMessage('info', 'Info', 'Ajout de ' + response.infos.count + ' karas à la playlist ' + $('#panel' + non(side) + ' .plDashboard').data('name'));
					var karaList = data.map(function(a) {
						return a.kid;
					}).join();
					var urlPost = getPlData(idPlaylistTo).url;

					$.ajax({
						url: urlPost,
						type: 'POST',
						data: { kid : karaList, requestedby : logInfos.username }
					});
				});
			} else if (name === 'deleteAllKaras') {
				$.ajax({
					url: url.replace('/karas','') + '/empty',
					type: 'PUT'
				});
			}
		});

		/* filter menu part */
		$('.tags').change(function() {
			var tag_id =  $(this).val();
			if(tag_id) {
				var $searchMenu = $(this).closest('.searchMenu');
				var $tag = $searchMenu.find('li.tagFilter');
				var tagType = $searchMenu.find('.tagsTypes').val();
				var searchCriteria = 'tag';

				$tag.attr('searchValue', tag_id);

				if(tagType === 'serie' || tagType === 'year') {
					searchCriteria = tagType;
				}

				$tag.attr('searchCriteria', searchCriteria);
				$tag.find('.choice').click();
			}
		});

		$('.tagsTypes').change(function() {
			$('.tags').val('').change();
		});
		$('.searchMenu .nav .choice').on('click', function(){
			var $searchMenu = $(this).closest('.searchMenu');
			var $li = $(this).parent();
			if($li.length > 0) {
				$searchMenu.find('.nav li').removeClass('active');
				$li.addClass('active');
				var val = $li.attr('val');
				$selector = $searchMenu.closest('.panel').find('.plSelect > select');
				if(val) $selector.val(val);
				$selector.change();
			}
		});

		/* prevent the virtual keyboard popup when on touchscreen by not focusing the search input */
		if(isTouchScreen) {
			$('#progressBarColor').addClass('cssTransition');
		}

		$(window).trigger('resize');
	});
	isTouchScreen =  'ontouchstart' in document.documentElement;
	if(isTouchScreen) $('body').addClass('touch');
	isSmall = $(window).width() < 1025;
	animTime = isSmall ? 200 : 300;
	refreshTime = 1000;
	mode = 'list';
	logInfos = { username : null, role : null };

	dragAndDrop = true;
	stopUpdate = false;

	playlistRange = {};
	ajaxSearch = {};
	oldState = {};
	oldSearchVal = '';

	listTypeBlc = [
		'BLCTYPE_1001' ,
		'BLCTYPE_1002',
		'BLCTYPE_1003',
		'BLCTYPE_1004',
		'BLCTYPE_1000',
		'BLCTYPE_0',
		'BLCTYPE_2',
		'BLCTYPE_3',
		'BLCTYPE_4',
		'BLCTYPE_5',
		'BLCTYPE_6',
		'BLCTYPE_7',
		'BLCTYPE_8',
		'BLCTYPE_9'];

	tagsTypesList = [
		'DETAILS_SERIE',
		'BLCTYPE_3',
		'BLCTYPE_7',
		'BLCTYPE_2',
		'BLCTYPE_4',
		'BLCTYPE_5',
		'BLCTYPE_6',
		'DETAILS_YEAR',
		'BLCTYPE_8',
		'BLCTYPE_9'];

	/* list of error code allowing an info popup message on screen */
	showInfoMessage = [
		'USER_CREATED',
		'PL_SONG_ADDED',
		'PL_SONG_DELETED',
		'PLAYLIST_MODE_SONG_ADDED'];
	softErrorMessage = [
		'PLAYLIST_MODE_ADD_SONG_ERROR'];

	/* simplify the ajax calls */
	$.ajaxPrefilter(function (options) {
		if (options.url.indexOf('http') === -1) {
			options.url = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + '/api/' + options.url;
		}
	});

	/**
     * Fill a playlist on screen with karas
     * @param {1, 2} side - which playlist on the screen
     * @param {'reposition','goTo'} scrollingType (optional) - the way to position the scroll after filling with new results
     * @param {'top','bottom','playing'} scrolling (optional) - second arg about the new position
     */
	// TODO if list is updated from another source (socket ?) keep the size of the playlist
	fillPlaylist = function (side, scrollingType, scrolling) {
		var deferred = $.Deferred();
		var idPlaylist = parseInt($('#selectPlaylist' + side).val());
		var filter = $('#searchPlaylist' + side).val();
		var fromTo = '';
		var url, html, canTransferKara, canAddKara;

		var $filter = $('#searchMenu' + side + ' li.active');
		var searchType = $filter.attr('searchType');
		var searchCriteria = $filter.attr('searchCriteria');
		var searchValue = $filter.attr('searchValue');

		var singlePlData = getPlData(idPlaylist);

		if(!singlePlData) return false;
		url = singlePlData.url;
		canTransferKara = singlePlData.canTransferKara;
		canAddKara = singlePlData.canAddKara;

		// public users can add kara to one list, current or public
		canAddKara = scope === 'admin' ? canAddKara : '';//$('#selectPlaylist' + side + ' > option:selected').data('flag_' + playlistToAdd)

		urlFiltre = url + '?filter=' + filter + fromTo;

		if(searchType) {
			searchCriteria = searchCriteria ?
				{
					'year' : 'y',
					'serie' : 's',
					'tag' : 't'
				}[searchCriteria]
				: '';

			urlFiltre += '&searchType=' + searchType + '&searchValue=' + (searchCriteria && searchValue ? searchCriteria + ':' + searchValue : '');
		}

		if(idPlaylist != -4) {	// general case

		} else {
			var data = response;
			/* Blacklist criterias build */
			var blacklistCriteriasHtml = $('<div/>');
			if (scope === 'admin') {
				if ($('#blacklistCriteriasInputs').length > 0) {
					$('#blacklistCriteriasInputs').detach().appendTo(blacklistCriteriasHtml);
				} else {
					blacklistCriteriasHtml = $('<div><span id="blacklistCriteriasInputs" class="list-group-item" style="padding:10px">'
					+	'<select id="bcType" class="input-sm" style="color:black"/> '
					+	'<span id="bcValContainer" style="color:black"></span> '
					+	'<button id="bcAdd" class="btn btn-default btn-action addBlacklistCriteria"></button>'
					+	'</span></div>');
					$.each(listTypeBlc, function(k, v){
						if(v !== 'BLCTYPE_1001') blacklistCriteriasHtml.find('#bcType').append($('<option>', {value: v.replace('BLCTYPE_',''), text: window.t(v)}));
					});
				}
			}
			tagsUpdating.done(e => {
				for (var k in data) {
					if (data.hasOwnProperty(k)) {
						if(blacklistCriteriasHtml.find('li[type="' + data[k].type + '"]').length == 0) {
							
							blacklistCriteriasHtml.append('<li class="list-group-item liType" type="' + data[k].type + '">' + window.t('BLCTYPE_' + data[k].type) + '</li>');
						}
						// build the blacklist criteria line

						var tagsFiltered = jQuery.grep(tags, function(obj) {
							return obj.tag_id == data[k].value;
						});

						var tagText = '';
						if(tagsFiltered.length === 1 && data[k].type > 0  && data[k].type < 100) {
							var trad = tagsFiltered[0].i18n[i18n.locale];
							tagText = trad ? trad : tagsFiltered[0].name;
						} else {
							tagText = data[k].value
						}
						var textContent = data[k].type == 1001 ? buildKaraTitle(data[k].value[0]) : tagText;

						blacklistCriteriasHtml.find('li[type="' + data[k].type + '"]').after(
							'<li class="list-group-item liTag" blcriteria_id="' + data[k].blcriteria_id + '"> '
						+	'<div class="actionDiv">' + html + '</div>'
						+	'<div class="typeDiv">' + window.t('BLCTYPE_' + data[k].type) + '</div>'
						+	'<div class="contentDiv">' + textContent + '</div>'
						+	'</li>');
						

					}
				}
			})
			$('#playlist' + side).empty().append(blacklistCriteriasHtml);
			$('#bcType').change();
			deferred.resolve();
		}

		// drag & drop part
		if(dragAndDrop && scope === 'admin') {
			var sortableUl = $('#playlist' + side);
			if(idPlaylist > 0) {
				if(sortableUl.hasClass('ui-sortable')) {
					sortableUl.sortable('enable');
				} else {
					sortableUl.sortable({
						appendTo: sortableUl,
						handle : isTouchScreen ? '.actionDiv' : false,
						cancel : '',
						update: function(event, ui) {
							changeKaraPos(ui.item);
						},
						distance: 10,
						delay: 10,
						// connectWith: sortableUl2,
						axis : 'y'
					});
				}
			} else if(sortableUl.hasClass('ui-sortable')) {
				sortableUl.sortable('disable');
			}
		}

		return deferred.promise();
	};
	/**
    * refresh the player infos
    */
	refreshPlayerInfos = function (data) {
		if (oldState != data && logInfos.username) {
			var newWidth = $('#karaInfo').width() * parseInt(10000 * ( data.timePosition + refreshTime/1000) / $('#karaInfo').attr('length')) / 10000 + 'px';

			if (data.timePosition != oldState.timePosition && !stopUpdate && $('#karaInfo').attr('length') != 0) {
				var elm = document.getElementById('progressBarColor');
				elm.style.transform =  'translateX(' + newWidth + ')';
			}
			if (oldState.status != data.status || oldState.playerStatus != data.playerStatus) {
				status = data.status === 'stop' ? 'stop' : data.playerStatus;
				switch (status) {
				case 'play':
					$('#progressBarColor').addClass('cssTransform');
					break;
				case 'pause':
					$('#progressBarColor').removeClass('cssTransform');
					break;
				case 'stop':
					$('#progressBarColor').removeClass('cssTransform');
					break;
				default:
				}
            }
            
            if($('input[name="lyrics"]').is(':checked')
                || (mode == 'mobile' || webappMode == 1)) {
				var text = data['subText'];
				if (text) text = text.indexOf('\n') == -1 ? text:  text.substring(0, text.indexOf('\n') );
				$('#karaInfo > span').html(text);
			}
			if (data.currentlyPlaying !== oldState.currentlyPlaying) {
				var barCss = $('#progressBarColor.cssTransform');
				barCss.removeClass('cssTransform');
				$('#progressBarColor').stop().css({transform : 'translateX(0)'});
				barCss.addClass('cssTransform');


				if ( data.currentlyPlaying === null) {

					$('#karaInfo').attr('idKara', data.currentlyPlaying);
					$('#karaInfo').attr('length', -1);
					$('#karaInfo > span').text( window.t('KARA_PAUSED_WAITING') );
					$('#karaInfo > span').data('text',window.t('KARA_PAUSED_WAITING') );
				} else if ( data.currentlyPlaying === -1) {
					$('#karaInfo').attr('idKara', data.currentlyPlaying);
					$('#karaInfo').attr('length', -1);
					$('#karaInfo > span').text( window.t('JINGLE_TIME') );
					$('#karaInfo > span').data('text',window.t('JINGLE_TIME') );

				} else {
					$.ajax({ url: 'public/karas/' + data.currentlyPlaying }).done(function (dataKara) {
						var kara = dataKara;
						$('#karaInfo').attr('idKara', kara.kid);
						$('#karaInfo').attr('length', kara.duration);
						$('#karaInfo > span').text( buildKaraTitle(kara) );
						$('#karaInfo > span').data('text', buildKaraTitle(kara) );
					});
				}
			}

			oldState = data;
		}
	};

	/**
    * Build kara title for users depending on the data
    * @param {Object} data - data from the kara
    * @return {String} the title
    */
	buildKaraTitle = function(data) {
		var isMulti = data.langs.find(e => e.name.indexOf('mul') > -1);
		if(data.langs && isMulti) {
			data.langs = [isMulti];
		}
		var limit = isSmall ? 35 : 50;
		var serieText =  data.serie ? data.serie : data.singers.map(e => e.name).join(', ');
		serieText = serieText.length <= limit ? serieText : serieText.substring(0, limit) + '…';
		var titleArray = [
			data.langs.map(e => e.name).join(', ').toUpperCase(),
			serieText,
			(data.songtypes[0].short ?  + data.songtypes[0].short : data.songtypes[0].name) + (data.songorder > 0 ? ' ' + data.songorder : '')
		];
		var titleClean = titleArray.map(function (e, k) {
			return titleArray[k] ? titleArray[k] : '';
		});

		var separator = '';
		if(data.title) {
			separator = ' - ';
		}
		return titleClean.join(' - ') + separator + data.title;
	};
	window.buildKaraTitle = buildKaraTitle;

	formatTagsPlaylist = function (playlist) {
		if (!playlist.id) return playlist.text;

		count = '<k>' + playlist.karacount + '</k>';
		var $option = $('<span>' + count + ' ' + playlist.text + '</span>') ;

		return $option;
	};

	initApp = window.initApp;

	// Some html & stats init
	window.initApp = function() {
		setupAjax();

		if(!welcomeScreen) {
			tagsUpdating = $.ajax({ url: 'public/tags', }).done(function (data) {
				tags = data.content;

				var tagList = tagsTypesList.map(function(val, ind){
					if(val === 'DETAILS_SERIE') {
						return {id: 'serie', text: window.t(val)}
					} else if (val === 'DETAILS_YEAR') {
						return {id: 'year', text: window.t(val)}
					} else {
						return {id: val.replace('BLCTYPE_',''), text: window.t(val)}
					}
				});

				$('.tagsTypes').select2({ theme: 'bootstrap',
					tags: false,
					minimumResultsForSearch: 15,
					data: tagList
				});
				$('.tagsTypes').parent().find('.select2-container').addClass('value tagsTypesContainer');

				forSelectTags = tags.map(function(val, ind){
					var trad = val.i18n[i18n.locale];
					return {id:val.tag_id, text: trad ? trad : val.name, type: val.type, karacount: val.karacount};
				});

				$.ajax({ url: 'public/series', }).done(function (data) {

					series = data.content;
					series = series.map(function(val, ind){
						return {id:val.sid, text: val.i18n_name, type: 'serie',
							aliases : val.aliases, karacount : val.karacount};
					});
					forSelectTags.push.apply(forSelectTags, series);

					$.ajax({ url: 'public/years', }).done(function (data) {

						var years = data.content;
						years = years.map(function(val, ind){
							return {id:val.year, text: val.year, type: 'year', karacount: val.karacount};
						});
						forSelectTags.push.apply(forSelectTags, years);

						$('.tags').select2({
							theme: 'bootstrap tags',
							placeholder: '',
							dropdownAutoWidth: false,
							minimumResultsForSearch: 20,
							templateResult: formatTagsPlaylist,
							templateSelection : formatTagsPlaylist,
							ajax: {
								transport: function(params, success, failure) {
									var page = params.data.page;
									var pageSize = 120;
									var type = $('.tagsTypes').val();

									var items = forSelectTags.filter(function(item) {
										return item.type == type
                                            && (new RegExp(params.data.q, 'i').test(item.text)
                                                || item.aliases && new RegExp(params.data.q, 'i').test(item.aliases.join(' ')));
									});
									var totalLength = items.length;

									if(page) {
										items = items.slice((page - 1) * pageSize, page * pageSize);
									}  else {
										items = items.slice(0, pageSize);
										page = 1;
									}

									var more = false;
									if( page * pageSize + items.length < totalLength) {
										more = true
									}
									var promise = new Promise(function(resolve, reject) {
										resolve({results: items, pagination : { more : more} });
									});
									promise.then(success);
									promise.catch(failure);
								}
							}
						});
						$('.tags').parent().find('.select2-container').addClass('value tags');
					});
				});
			});


		}

	};

	/* opposite sideber of playlist : 1 or 2 */
	non = function (side) {
		return 3 - parseInt(side);
	};

	getPlData = function(idPl) {
		var idPlNorm = Math.min(0, idPl);
		var singlePlData = plData[idPlNorm] ? jQuery.extend({}, plData[idPlNorm]) : null;

		if(singlePlData) singlePlData.url = singlePlData.url.replace('pl_id', idPl);

		return singlePlData;
	};

	/* socket part */

	if(!welcomeScreen) {
		window.socket.on('playerStatus', function(data){
			refreshPlayerInfos(data);
		});
	}
    
}));
