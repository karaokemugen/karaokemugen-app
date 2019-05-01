/* eslint-disable no-undef */
var panel1Default;      // Int : default id of the playlist of the 1st panel (-1 means kara list)
var status;             // String : status of the player
var mode;               // String : way the kara list is constructed, atm "list" supported
var scope;              // String : way the kara list is constructed, atm "list" supported
var welcomeScreen;              // String : if we're in public or admin interface
var refreshTime;        // Int (ms) : time unit between every call
var stopUpdate;         // Boolean : allow to stop any automatic ajax update
var oldState;           // Object : last player state saved
var ajaxSearch, timer;  // 2 variables used to optimize the search, preventing a flood of search
var tags;             // Object : list of blacklist criterias tags
var forSelectTags;             // Object : list of blacklist criterias tags for select use
var showInfoMessage;	// Object : list of info codes to show as a toast
var hideErrorMessage;
var softErrorMessage;
var logInfos;			// Object : contains all login infos : role, token, username
var pseudo;
var pathAvatar;
var pathVideo;

var DEBUG;
var SOCKETDEBUG;
var isChrome;

var dragAndDrop;        // Boolean : allowing drag&drop
var pageSize;        // Int : number of karas disaplyed per "page" (per chunk)
var saveLastDetailsKara;    // Matrice saving the differents opened kara details to display them again when needed
var playlistToAdd;          // Int : id of playlist users are adding their kara to
var isTouchScreen;
var showedLoginAfter401; // to only show the login once after login error
var socket;
var settings;
var kmStats;
var i18n;
var introManager;

/* promises */
var statsUpdating;
var scrollUpdating;
var playlistsUpdating;
var playlistContentUpdating;
var settingsUpdating;
var tagsUpdating;

/* html */
var addKaraHtml;
var deleteKaraHtml;
var deleteCriteriaHtml;
var transferKaraHtml;
var infoKaraHtml;
var checkboxKaraHtml;
var likeKaraHtml;
var closeButton;
var closeButtonBottom;
var showFullTextButton;
var showVideoButton;
var makeFavButton;
var makeFavButtonFav;
var	makeFavButtonSmall;
var	makeFavButtonSmallFav;
var dragHandleHtml;
var playKaraHtml;
var serieMoreInfoButton;

var listTypeBlc;
var tagsTypesList;
var plData;
var tagsGroups;
var flattenedTagsGroups;
var settingsNotUpdated;

(function (yourcode) {
	yourcode(window.jQuery, window, document);
}(function ($, window, document) {
	$(function () {


		var perf = sessionStorage.getItem('perf');
		if (!perf) {
			perf = getPerformanceIndice()
			sessionStorage.setItem('perf', perf);
		}
		pageSize = parseInt(Math.min(400, Math.max(90, 105 + perf * perf * 10)));
		// alert(pageSize)
		if (!isNaN(query.PAGELENGTH)) pageSize = parseInt(query.PAGELENGTH);

		initSwitchs();

		tagsGroups = {
			'TAGCAT_FAMI':['TAG_ANIME','TAG_REAL','TAG_VIDEOGAME'],
			'TAGCAT_SUPP':['TAG_3DS','TAG_DREAMCAST','TAG_DS','TAG_GAMECUBE','TAG_PC','TAG_PS2','TAG_PS3','TAG_PS4','TAG_PSP','TAG_PSV','TAG_PSX','TAG_SATURN','TAG_SEGACD','TAG_SWITCH','TAG_WII','TAG_WIIU','TAG_XBOX360'],
			'TAGCAT_CLAS':['TAG_IDOL','TAG_MAGICALGIRL','TAG_MECHA','TAG_SHOUJO','TAG_SHOUNEN','TAG_YAOI','TAG_YURI'],
			'TAGCAT_ORIG':['TAG_MOBAGE','TAG_DRAMA','TAG_MOVIE','TAG_ONA','TAG_OVA','TAG_TOKU','TAG_TVSHOW','TAG_VN','TAG_VOCALOID'],
			'TAGCAT_TYPE':['TAG_DUO','TAG_HARDMODE','TAG_HUMOR','TAG_LONG','TAG_PARODY','TAG_R18','TAG_COVER','TAG_DUB','TAG_REMIX','TAG_SPECIAL','TAG_SPOIL'],
		}
		flattenedTagsGroups = [].concat.apply([], Object.values(tagsGroups));
		// Once page is loaded
		plData = {
			'0' : {
				name: 'Standard playlists',
				url : scope + '/playlists/pl_id/karas',
				html : scope === 'admin' ? deleteKaraHtml + addKaraHtml + transferKaraHtml : '',
				canTransferKara : true,
				canAddKara : true,
			},
			'-1' : {
				name : 'Kara list',
				url : 'public/karas',
				html : addKaraHtml,
				canTransferKara : false,
				canAddKara : false,
			},
			'-2' : {
				name : 'Blacklist',
				url : scope + '/blacklist',
				html : scope === 'admin' ? '' : '',
				canTransferKara : false,
				canAddKara : true,
			},
			'-3' : {
				name : 'Whitelist',
				url : scope + '/whitelist',
				html : scope === 'admin' ? deleteKaraHtml + addKaraHtml + transferKaraHtml : '',
				canTransferKara : true,
				canAddKara : true,
			},
			'-4' : {
				name : 'Blacklist criterias',
				url : scope + '/blacklist/criterias',
				html : deleteCriteriaHtml,
				canTransferKara : false,
				canAddKara : true,
			},
			'-5' : {
				name : 'Favorites',
				url : 'public/favorites',
				html : addKaraHtml,
				canTransferKara : true,
				canAddKara : true,
			},
			'-6' : {
				name : 'Kara list recent',
				url : 'public/karas/recent',
				html : addKaraHtml,
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
						// TODO recoder la fonction pour interpréter comme i18n server ?
						var args = res.args && typeof res.args === 'object' ? Object.keys(res.args).map(function(e) {
							return res.args[e];
						}) : [res.args];
						var errMessage = i18n.__(res.code, args);
						if(showInfoMessage.indexOf(res.code) === -1) {
							console.log(res.code, errMessage, 'console');
						} else {
							displayMessage('info', '', errMessage, '2000');
						}
					}

					DEBUG && res.message && console.log(res.message);
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
						errMessage = i18n.__(res.responseJSON.code, args);
					} else if(res.status == 401) {
						errMessage = i18n.__('UNAUTHORIZED');
						if(!showedLoginAfter401) {
							$('#loginModal').modal('show');
							showedLoginAfter401 = true;
						}
					} else {
						code = i18n.__('UNKNOWN_ERROR');
						errMessage = res.responseText;
					}
					if(!res.responseJSON || hideErrorMessage.indexOf(res.responseJSON.code) === -1) {
						displayMessage('warning', code, errMessage);
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

		$('.changePseudo').click( function() {
			if(logInfos.token && !showedLoginAfter401) {
				showProfil();
			} else {
				$('#loginModal').modal('show');
			}
		});

		var mugenToken = readCookie('mugenToken');
		var mugenTokenOnline = readCookie('mugenTokenOnline');

		if(welcomeScreen) {
			$('#wlcm_login > span').text(i18n.__('NOT_LOGGED'));
			$('#wlcm_disconnect').hide();
		}

		if(query.admpwd && scope === 'admin' && typeof appFirstRun != "undefined" && appFirstRun) { // app first run admin
			login('admin', query.admpwd).done(() => {
				if(!welcomeScreen) {
					startIntro('admin');
					var privateMode = $('input[name="Karaoke.Private"]');
					privateMode.val(1);
					setSettings(privateMode);
				} else {
					$('#wlcm_login > span').text(logInfos.username);
					$('#wlcm_disconnect').show();
					initApp();
				}
			});
		} else if(mugenToken) {
			logInfos = parseJwt(mugenToken);
			logInfos.token = mugenToken;
			if(mugenTokenOnline) {
				logInfos.onlineToken = mugenTokenOnline;
			}
			if(scope === 'admin' && logInfos.role !== 'admin') {
				$('#loginModal').modal('show');
			} else {
				$('#wlcm_login > span').text(logInfos.username);
				$('#wlcm_disconnect').show();
				initApp();
			}
		} else if (webappMode === 1){
            loginGuest();
        } else {
			$('#loginModal').modal('show');

		}

		// Méthode standard on attend 100ms après que la personne ait arrêté d'écrire, on abort toute requete de recherche en cours, et on lance la recherche
		$('#searchPlaylist1, #searchPlaylist2').on('input', function () {
			var side = $(this).attr('side');

			clearTimeout(timer);
			timer = setTimeout(function () {
				fillPlaylist(side);
			}, 200);
		});

		// Allow pressing enter to validate a setting
		$('#searchPlaylist1, #searchPlaylist2, #choixPseudo').keypress(function (e) {
			if (e.which == 13) {
				$(this).blur();
			}
		});

		// When user selects a playlist
		$('#selectPlaylist1, #selectPlaylist2').change(function (e) {
			var $this = $(this);
			var val = $this.val();
			var oldVal = $this.closest('.plDashboard').data('playlist_id');
			if(!val) {
				// if somehow we end up with no playlist selected (playlist was made private etc.) we handle this case and try to get a new default playlist
				settingsUpdating.done( function(){
					var newSelection = sideOfPlaylist('-1') ? '-2'  : '-1';
					if(scope == 'public' && newSelection == '-2') {
						newSelection = playlistToAddId;
					}
					$this.val(newSelection);
					if($this.val()) $this.change();

					e.preventDefault();
					return false;
				});

			} else {	// usual case
				var side = $this.attr('side');
				var isNew = $this.find('[data-select2-tag="true"][value="' + val + '"]');

				if(isNew.length > 0) {
					e.preventDefault(); // si c'est une nouvelle entrée, le serveur nous dira quand elle sera crée
					refreshPlaylistSelects();
				} else if(val != oldVal && val == $('select[type="playlist_select"][side!="' + side + '"] > option:selected[value="' + val + '"]').val()) {
					$('select[type="playlist_select"][side!="' + side + '"]').val(oldVal);

					refreshPlaylistSelects().done( function() {
						$('select[type="playlist_select"]').change();
					});
				} else {
					createCookie('mugenPlVal' + side, val, 365);

					$('#playlist' + side).empty();
					$('#searchPlaylist' + side).val('');
					if (val != -1 && val != -5) {
						$('#searchMenu' + side).collapse('hide');
					}
					playlistContentUpdating = fillPlaylist(side);
					refreshPlaylistDashboard(side);
				}
			}
		});

		$('.overlay').on('click touchstart', function() {
			var video = $('#video');
			$('.overlay').hide();
			video[0].pause();
			video.removeAttr('src');
		});

		$('body[scope="public"] .playlist-main').on('click', '.actionDiv > button[name="addKara"]', function() {
			var idKara = $(this).closest('li').attr('idkara');
			addKaraPublic(idKara);
		});

		$('body[scope="public"] .playlist-main').on('click', 'button[name="deleteKara"]', function() {
			var idPlaylistContent = $(this).closest('li').attr('idplaylistcontent');
			deleteKaraPublic(idPlaylistContent);
		});


		$('.playlist-main').on('click','li.karaSuggestion', function() {
            var search = $('#searchPlaylist1').val();
            settingsUpdating.done( function() {
                displayModal('prompt', i18n.__('KARA_SUGGESTION_NAME'), '', function(text) {
                    var adress = 'mailto:' + (settings && settings.App ? settings.App.karaSuggestionMail : 'err');
                    var subject = i18n.__('KARA_SUGGESTION_SUBJECT') + text;
                    var body = i18n.__('KARA_SUGGESTION_BODY') + '%0D%0A %0D%0A ' + logInfos.username;
                    setTimeout(function() {
                        displayMessage('info', i18n.__('KARA_SUGGESTION_INFO'),
                            i18n.__('KARA_SUGGESTION_LINK', 'https://lab.shelter.moe/karaokemugen/karaokebase/issues/', 'console'), '30000');
                    }, 200);
    
                    window.open(adress + '?' + 'body=' + body + '&subject=' + subject,'_blank');
                }, search);
            });
		
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
					displayMessage('info', 'Info', 'Ajout de ' + response.infos.count + ' karas à la playlist ' + $('#panel' + non(side) + ' .plDashboard').data('name'));
					var karaList = data.map(function(a) {
						return a.kid;
					}).join();
					var urlPost = getPlData(idPlaylistTo).url;

					$.ajax({
						url: urlPost,
						type: 'POST',
						data: { kid : karaList, requestedby : logInfos.username }
					}).done(function () {
						DEBUG && console.log(karaList + ' added to playlist ' + idPlaylistTo);

					});
				});
			} else if (name === 'deleteAllKaras') {
				$.ajax({
					url: url.replace('/karas','') + '/empty',
					type: 'PUT'
				}).done(function () {
					DEBUG && console.log('Playlist ' + idPlaylist + ' emptied');
				});
			} else if (name === 'addRandomKaras') {

				displayModal('prompt', i18n.__('CL_ADD_RANDOM_TITLE'),'', function(nbOfRandoms){
					$.ajax({
						url: url,
						data : { random : nbOfRandoms},
						type: 'GET'
					}).done(function (randomKaras) {
						// console.log(randomKaras);
						if(randomKaras.content.length > 0) {

							let textContent = randomKaras.content.map(e => buildKaraTitle(e)).join('<br/><br/>');

							displayModal('confirm', i18n.__('CL_CONGRATS'), i18n.__('CL_ABOUT_TO_ADD', '<br/><br/>' + textContent), function(){
								var karaList = randomKaras.content.map(function(a) {
									return a.kid;
								}).join();


				            	var urlPost = getPlData(idPlaylistTo).url;

								$.ajax({
									url: urlPost,
									type: 'POST',
									data: { kid : karaList },
									complete: function() {
										$('#modalBox').modal('hide');
										$('body').removeClass('modal-open');
										$('.modal-backdrop').remove();
									}
								}).done(function () {
									DEBUG && console.log(karaList + ' added to playlist ' + idPlaylistTo);

								});
							},'');
						} else {
							console.log('Error : server could not pick any random song');
						}
					});
				},'');

			}
		});

		if(mode != 'mobile' && !(isTouchScreen && scope === 'public')) {
			$('.playlist-main').on('click', '.infoDiv > button[name="infoKara"], .detailsKara > button.closeParent', function() {
				toggleDetailsKara($(this));
			});
			// show full lyrics of a given kara
			$('.playlist-main').on('click', '.fullLyrics', function () {
				var playlist = $(this).closest('ul');
				var liKara = $(this).closest('li');
				var lyricsKara = liKara.find('.lyricsKara');
				var idKara = liKara.attr('idkara');
				var detailsKara = liKara.find('.detailsKara');

				if(lyricsKara.length == 0) {
					liKara.append($('<div class="lyricsKara alert alert-info">' + closeButton + '<div class="lyricsKaraLoad">...</div>' + closeButtonBottom + '</div>')
						.hide().fadeIn(animTime));
				} else if (!lyricsKara.is(':visible')) {
					lyricsKara.fadeIn(animTime);
				} else {
					lyricsKara.fadeOut(animTime);
				}
				$.ajax({ url: 'public/karas/' + idKara + '/lyrics' }).done(function (data) {
					liKara.find('.lyricsKaraLoad').html(data.join('<br/>'));
					scrollToElement(playlist.parent(), detailsKara,  liKara.find('.lyricsKara'));
				});
			});

			$('.playlist-main').on('click', '.showVideo', function() {
				showVideo($(this));
			});

			$('.playlist-main').on('click', '.makeFav', function() {
				var liKara = $(this).closest('li');
				var idKara = liKara.attr('idkara');
				makeFav(idKara, !$(this).hasClass('currentFav'), $(this));
			});

			$('.playlist-main').on('click', '.likeKara', function() {
				likeKara(!$(this).hasClass('currentLike'), $(this));
			});

			$('.playlist-main').on('click', '.moreInfo', function() {
				moreInfo($(this));
			});
		}

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

		/*****************/
		makeFav = function(idKara, make, $el) {
			var type = make ? 'POST' : 'DELETE';
			$.ajax({
				url: 'public/favorites',
				type: type,
				data: { 'kid' : idKara } })
				.done(function (response) {
					if($el) {
						if(make) {
							$el.addClass('currentFav');
						} else {
							$el.removeClass('currentFav');
						}
					}
				}).fail(function(response) {
				});
		};
		showVideo = function(el) {
			var previewFile = el.closest('.detailsKara').data('previewfile');
			if(previewFile) {
				setTimeout(function() {
					$('#video').attr('src', pathVideo + previewFile);
					$('#video')[0].play();
					$('.overlay').show();
				}, 1);
			}
		};
		moreInfo = function(el) {
			var openExternalPageButton = '<i class="glyphicon glyphicon-new-window"></i>';
			var externalUrl = '';
			var details = el.closest('.detailsKara');
			var serie = details.data('serie');
			var extraSearchInfo = "";
			var searchLanguage = navigator.languages[0];
			searchLanguage = searchLanguage.substring(0, 2);
			if(!details.data('misc_tags') || (
				details.data('misc_tags').find(e => e.name == 'TAG_VIDEOGAME')
                && details.data('misc_tags').find(e => e.name == 'TAG_MOVIE')
			)) {
				extraSearchInfo = 'anime ';
			}
			var searchUrl = "https://" + searchLanguage  + ".wikipedia.org/w/api.php?origin=*&action=query&format=json&formatversion=2&list=search&utf8=&srsearch=" + extraSearchInfo + serie;
			var detailsUrl = "";

			var xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function() {
			  if (this.readyState == 4 && this.status == 200) {
					var json = JSON.parse(this.response);
					var results = json.query.search;
					var contentResult = json.query.pages;
					var searchInfo = json.query.searchinfo;

					if(results && results.length > 0 && detailsUrl === ""){
						var pageId = results[0].pageid;
						externalUrl= 'https://' + searchLanguage  + '.wikipedia.org/?curid=' + pageId;
						//newWindows.location = externalUrl
						detailsUrl = 'https://' + searchLanguage + '.wikipedia.org/w/api.php?origin=*&action=query&format=json&formatversion=2&prop=extracts&exintro=&explaintext=&pageids=' + pageId;
						xhttp.open("GET", detailsUrl , true);
						xhttp.send();
					} else if (contentResult && contentResult.length > 0 && detailsUrl !== "") {
						var extract = contentResult[0].extract;
						extract = extract.replace(/\n/g, '<br /><br />');
						extract = extract.replace(serie, '<b>' + serie + '</b>');
						extract = extract.replace('anime', '<b>anime</b>');
						displayModal('alert', '<a target="_blank" href="' + externalUrl + '">' + serie + ' ' + openExternalPageButton + '</a>', extract);
					} else if (searchInfo && searchInfo.totalhits === 0 && searchInfo.suggestion) {
						var searchUrl = "https://" + searchLanguage  + ".wikipedia.org/w/api.php?origin=*&action=query&format=json&formatversion=2&list=search&utf8=&srsearch=" + searchInfo.suggestion;
						xhttp.open("GET", searchUrl , true);
						xhttp.send();
					} else {
						displayMessage('warning', '', i18n.__('NO_EXT_INFO', serie));
					}
			  }
			};
			xhttp.open("GET", searchUrl , true);
			xhttp.send();

		};

		likeKara = function(like, $el) {
			var idPlc = parseInt($el.closest('li').attr('idplaylistcontent'));
			var dataLikeKara = {};
			if (!like) {
				dataLikeKara = {'downvote' : 'true'};
			}
			$.ajax({
				url: 'public/playlists/public/karas/'+idPlc+'/vote',
				type: 'POST',
				data: dataLikeKara })
				.done(function (response) {
					if($el) {
						if(like) {
							$el.addClass('currentLike');
						} else {
							$el.removeClass('currentLike');
						}
					}
				}).fail(function(response) {
				});
		};

		// pick a random kara & add it after (not) asking user's confirmation
		$('.getLucky').on('click', function () {
			var filter = $('#searchPlaylist' + 1).val();

			$.ajax({ url: 'public/karas?filter=' + filter, data : { random : 1 } }).done(function (data) {
				if(data && data.content && data.content[0]) {
					var chosenOne = data.content[0].kid;
					$.ajax({ url: 'public/karas/' + chosenOne }).done(function (data) {
						data = data[0];
						displayModal('confirm', i18n.__('CL_CONGRATS'), i18n.__('CL_ABOUT_TO_ADD', buildKaraTitle(data)), function(){
							$.ajax({
								url: 'public/karas/' + chosenOne,
								type: 'POST',
								data: { requestedby : logInfos.username }
							}).done(function () {
								playlistContentUpdating.done( function() {
									scrollToKara(2, chosenOne);
								});
							});
						},'lucky');
					});
				}
			});
		});
		$('.favorites').on('click', function() {
			var $this = $(this);
			var newOptionVal;
			$this.toggleClass('on');
			if($this.hasClass('on')) {
				newOptionVal = $('#selectPlaylist1 > option[data-flag_favorites="true"]').val();
			} else {
				newOptionVal = -1;
			}
			$('#selectPlaylist1').val(newOptionVal).change();
		});
		$('.plBrowse button').on('click', function() {
			var $this = $(this);
			var panel = $this.closest('.panel');
			var dashboard = panel.find('.plDashboard');
			var idPlaylist = dashboard.data('playlist_id');
			var karacount = dashboard.attr('karacount');
			var side = panel.attr('side');
			var playlist = $('#playlist' + side);

			if($this.attr('action') === 'goTo') {
				var from, scrollHeight;

				if($this.attr('value') === 'top') {
					from = 0;
				} else if ($this.attr('value') === 'bottom') {
					from =  Math.max(0, karacount - pageSize);
				} else if ($this.attr('value') === 'playing') {
					from = -1;
				}
				playlist.parent().attr('flagScroll', true);
				setPlaylistRange(idPlaylist, from, from + pageSize);
				fillPlaylist(side, 'goTo', $this.attr('value'));
			}
		});

		// generic close button
		$('body').on('click', '.closeParent', function () {
			var el = $(this);
			var container = el.closest('.alert,.shutdown-popup');

			var infoKaraButton = container.closest('li').find('[name="infoKara"]');

			if(container.hasClass('detailsKara') && infoKaraButton.length > 0) {
				infoKaraButton.click();
			} else {
				container.fadeOut(animTime, function(){
					el.parent().remove();
				});
			}
		});

		/* handling dynamic loading */
		$('.playlistContainer').scroll(function() {
			var container = $(this);
			if(container.attr('flagScroll') != true && container.attr('flagScroll') != 'true' )  {
				var playlist = container.find('ul').first();
				var side = playlist.attr('side');
				var dashboard = $('#panel' + side + ' > .plDashboard');
				var idPlaylist = dashboard.find('select').val();
				var from =  getPlaylistRange(idPlaylist).from;
				var to = getPlaylistRange(idPlaylist).to;
				var karaCount = dashboard.attr('karacount');
				var nbKaraInPlaylist = parseInt(dashboard.parent().find('.plInfos').data('to')) - parseInt(dashboard.parent().find('.plInfos').data('from'));
				var shift = 2 * parseInt((12*pageSize/20)/2);
				var fillerBottom = playlist.find('.filler').last();
				var fillerTop = playlist.find('.filler').first();
				if (fillerTop.length > 0 && fillerBottom.length > 0) {
					var scrollDown = container.offset().top + container.innerHeight() >= fillerBottom.offset().top && to < karaCount && nbKaraInPlaylist >= pageSize;
					var scrollUp = fillerTop.offset().top + fillerTop.innerHeight() > container.offset().top + 10 && from > 0;
					DEBUG && console.log(container.offset().top,container.innerHeight() , fillerBottom.offset().top ,to < karaCount , nbKaraInPlaylist >= pageSize);
					DEBUG && console.log(scrollUpdating, (!scrollUpdating || scrollUpdating.state() == 'resolved') , scrollDown, scrollUp);

					localStorage.setItem('scroll' + side, container.scrollTop());

					if (  (!scrollUpdating || scrollUpdating.state() == 'resolved')  && (scrollDown || scrollUp)) {
						container.attr('flagScroll', true);

						if(scrollDown) {
							from += shift;
							to = from + pageSize;
						} else if( scrollUp ) {
							from = Math.max(0, from - shift);
							to = from + pageSize;
						}

						DEBUG && console.log('Affichage des karas de ' + from + ' à ' + to);

						setPlaylistRange(idPlaylist, from, to);
						scrollUpdating = fillPlaylist(side, 'reposition', scrollUp ? "top" : "bottom");
					}
				}
			}
		});

		$('#modalBox').on('shown.bs.modal', function () {
			input = $('#modalInput');
			if(input.is(':visible')) $('#modalInput').focus();
			else $('#modalBox').find('button.ok').focus();
		});
		$('#modalBox').on('keydown', function(e) {
			var keyCode = e.keyCode || e.which;
			if (keyCode == '13') $(this).find('button.ok').click();
		});

		/* close closable popup */
		$('body').on('click', '.closePopupParent', function () {
			var el = $(this);
			el.closest('.popup').fadeOut(animTime);
			el.remove();
			$('body > div[class!="popup"]').css('opacity','1');
		});

		/* login stuff */

		$('#profilModal,#loginModal,#modalBox, #pollModal').on('shown.bs.modal', function (e) {
			resizeModal();
		});

		$('#profilModal').on('show.bs.modal', function (e) {

			if(logInfos && logInfos.role === 'guest') {
				$(this).find('.profileData').hide();
			} else {
				$(this).find('.profileData').show();
			}
		});

		$('#nav-login .login').click( () => {
			var servername = $('#loginServ').val();
			var username = $('#login').val() + (servername ? '@' + servername : '');
			var password = $('#password').val();
			login(username, password);

		});
		$('#nav-login .guest').click( loginGuest );
        function loginGuest() {
            new Fingerprint2( { excludeUserAgent: true }).get(function(result, components) {
				login('', result);
			});
        }
		$('#nav-signup input').focus( function(){
			if(introManager && typeof introManager._currentStep != 'undefined') {
				setTimeout(() => {
					if($(window).height() < 500)
						$('.introjs-tooltip ').addClass('hidden');
				}, 700);
			}
		});
		$('#loginModal .nav-tabs a').click(function(){
			if(introManager && typeof introManager._currentStep != 'undefined') {
				setTimeout(() => {
					introManager.refresh();
				}, 200);
			}
		});
		$('#nav-signup .login').click( () => {
			var servername = $('#signupServ').val();
			var username = $('#signupLogin').val();
			if(username.includes('@')) {
				$('#signupLogin').addClass('errorBackground')
				displayMessage('warning','', i18n.__('CHAR_NOT_ALLOWED', '@'));
				$('#signupLogin').focus();
				return;
			} else {
				$('#signupLogin').removeClass('errorBackground')
			}
			var username = username + (servername ? '@' + servername : '');
			var password = $('#signupPassword').val();
			var passwordConfirmation = $('#signupPasswordConfirmation').val();
			if(password !== passwordConfirmation) {
				$('#signupPasswordConfirmation,#signupPassword').val('').addClass('redBorders');
				$('#signupPassword').focus();
			} else {
				var data = { login: username, password: password};

				if(scope === 'admin') {
					data.role =  $('#signupRole').val();
				}

				$.ajax({
					url: scope + '/users',
					type: 'POST',
					data: data })
					.done(function (response) {
						if(response == true) {
							displayMessage('info', 'Info',  i18n.__('CL_NEW_USER', username));
						}

						$('#loginModal').modal('hide');
						$('#signupPasswordConfirmation,#signupPassword').removeClass('redBorders');

						if(scope === 'public' || introManager &&  typeof introManager._currentStep !== 'undefined') login(username, password);

					}).fail(function(response) {
						$('#signupPasswordConfirmation,#signupPassword').val('').addClass('redBorders');
						$('#signupPassword').focus();
					});
			}
		});

		$('#password, #signupPasswordConfirmation').on('keypress', (e) => {
			if(e.which == 13) {
				$(e.target).parent().parent().find('.login').click();
			}
		});

		$('.logout, .btn[action="logout"]').click( () => {
			eraseCookie('mugenToken');
			eraseCookie('mugenTokenOnline');
			window.location.reload();
		});
		/* login stuff END */

		$('#nav-userlist').on('click', '.userlist > li', (e) => {
			var $li = $(e.currentTarget);
			var $details = $li.find('.userDetails');
			var login = $li.data('login');
			if($li.hasClass('open')) {
				$li.removeClass('open');
				$details.empty();
			} else {
				$.ajax({
					url: 'public/users/' + login,
					type: 'GET'})
					.done(function (response) {
						$li.addClass('open');
						$details.empty().html(
							'<div><i class="glyphicon glyphicon-envelope"></i> ' + (response.email ? response.email : '') + '</div>'
						+	'<div><i class="glyphicon glyphicon-link"></i> ' + (response.url ? response.url : '') + '</div>'
						+	'<div><i class="glyphicon glyphicon-leaf"></i> ' + (response.bio ? response.bio : '') + '</div>');
					});
			}
		});
		/* profil stuff */
		showProfil = function() {
			$.ajax({
				url: 'public/myaccount/',
				type: 'GET'})
				.done(function (response) {

					$('#profilModal').modal('show');

					$.each(response, function(i, k) {
						var $element = $('.profileContent [name="' + i + '"]');
						$element.attr('oldval', k);

						if(i === 'avatar_file' && k) {
							$element.attr('src', pathAvatar + k);
						} else if( i === 'login') {
							$element.text(k);
						} else if (i !== 'password') {
							$element.val(k);
						}
					});


					$.ajax({
						url: 'public/users/',
						type: 'GET'})
						.done(function (response) {
							var users = [response.filter(a => a.flag_online)] //, response.filter(a => a.flag_online==false)];
							var $userlist = $('.userlist');
							var userlistStr = '';
							users.forEach( (userList) => {
								$.each(userList, function(i, k) {
									userlistStr +=
										'<li ' + dataToDataAttribute(k) + ' class="list-group-item' + (k.flag_online ? ' online' : '') + '">'
									+	'<div class="userLine">'
									+	'<span class="nickname">' + k.nickname + '</span>'
									+	'<img class="avatar" src="' + pathAvatar + k.avatar_file + '"/>'
									+	'</div><div class="userDetails">'
									+	'</li>';
								});
							});
							$userlist.empty().append($(userlistStr));
						});
				});

		};

		$('.profileData .profileLine input').on('keypress', (e) => {
			if(e.which == 13) {
				$(e.target).blur();
			}
		});

		$('.profileData .profileLine input[name!="password"]').on('blur', (e) => {
			var $input = $(e.target);
			if ($input.attr('oldval') !== $input.val()) {
				// TODO gestion confirmation password
				var $password = $('.profileData .profileLine > input[name="password"]');
				var $passwordConfirmation = $('.profileData .profileLine > input.passwordConfirmation');
				if($password.val() !== $passwordConfirmation.val()) {
					$password.val('').addClass('redBorders');
					$passwordConfirmation.val('').addClass('redBorders');
					$input.focus();
				} else {
					var profileData = $('.profileData .profileLine > input[name]').serialize();
					$.ajax({
						url: 'public/myaccount',
						type: 'PUT',
						data: profileData
					})
						.done(function (response) {
							$('.profileContent .profileLine > input').removeClass('redBorders');
							$input.attr('oldval', $input.val());
							pseudo = response.nickname;
						})
						.fail( (response) => {
							var listFieldErr = Object.keys(response.responseJSON);
							listFieldErr.forEach((v, k) => {
								var $element = $('.profileContent [name="' + v + '"]');

								if(v === 'avatar_file') {
									// TODO
								} else if( v === 'login') {
									// TODO
								} else if (v !== 'password') {
									$element.addClass('redBorders');
								}
								if( k === 0 ) {
									$element.focus();
								}
							});

						});
				}
			}
		});

		$('#avatar').change(function() {
			var dataFile = new FormData();
			$.each(this.files, function(i, file) {
				dataFile.append('avatarfile', file);
			});

			dataFile.append('nickname', logInfos.username);

			$.ajax({
				url: 'public/myaccount',
				type: 'PUT',
				contentType: false,
				processData: false,
				data: dataFile
			})
				.done(function (response) {
					$('.profileContent .profileLine > input').removeClass('redBorders');
					$('[name="avatar_file"]').attr('src', pathAvatar + response.avatar_file);
				})
				.fail( (response) => {
					var listFieldErr = Object.keys(response.responseJSON);
					listFieldErr.forEach((v, k) => {
						var $element = $('.profileContent [name="' + v + '"]');

						if(v === 'avatar_file') {
							// TODO
						} else if( v === 'login') {
							// TODO
						} else if (v !== 'password') {
							$element.addClass('redBorders');
						}
						if( k === 0 ) {
							$element.focus();
						}
					});

				});

		});
		$('.favImport > input').change(function() {
			if ( ! window.FileReader ) return alert( 'FileReader API is not supported by your browser.' );

			var input = this;
			if ( input.files && input.files[0] ) {
				file = input.files[0];
				fr = new FileReader();
				fr.onload = function () {
					displayModal('confirm',i18n.__('CONFIRM_FAV_IMPORT'), '', function(confirm){
						if( confirm ) {
							var data = {};
							data['playlist'] = fr['result'];
							var name = JSON.parse(fr.result).PlaylistInformation.name;
							ajx('POST', 'public/favorites/import', data, function(response) {
							});
						}
					});
				};
				fr.readAsText( file );
			}
		});
		$('.favExport').click(function() {
			ajx('GET', 'public/favorites/export', {}, function(data) {
				var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data,null,4));
				var dlAnchorElem = document.getElementById('downloadAnchorElem');
				dlAnchorElem.setAttribute('href', dataStr);
				dlAnchorElem.setAttribute('download', ['KaraMugen', 'fav', logInfos.username, new Date().toLocaleDateString().replace('\\','-')].join('_') + '.kmplaylist');
				dlAnchorElem.click();
			});
		});

		$('.profileConvert').click(function() {
			if(settings) {
				displayModal('custom', i18n.__('PROFILE_CONVERT'),
					'<label>' + i18n.__('INSTANCE_NAME') + '</label>'
                    + '<input type="text"  name="modalLoginServ" value="' + settings.Online.Host + '"//>'
                    + '<label>' + i18n.__('PROFILE_PASSWORD_AGAIN') + '</label>'
                    + '<input type="password" placeholder="' + i18n.__('PASSWORD') + '" class="form-control" name="password">', function(data){

						var msgData =  { instance: data.modalLoginServ, password : data.password };

						ajx('POST', 'public/myaccount/online', msgData, function(response) {
							displayMessage('success', '', i18n.__('PROFILE_CONVERTED'));

							createCookie('mugenToken',  response.token, -1);
							createCookie('mugenTokenOnline',  response.onlineToken, -1);

							logInfos = parseJwt(response.token);
							logInfos.token = response.token;
							logInfos.onlineToken = response.onlineToken;
							initApp();
						});
					}
				);
			} else {
				getSettings();
			}
		});

		$('.profileDelete').click(function() {
			if(settings) {
				displayModal('custom', i18n.__('PROFILE_ONLINE_DELETE'),
					'<label>' + i18n.__('PROFILE_PASSWORD_AGAIN') + '</label>'
                    + '<input type="password" placeholder="' + i18n.__('PASSWORD') + '" class="form-control" name="password">', function(data){

						var msgData =  { password : data.password };

						ajx('DELETE', 'public/myaccount/online', msgData, function(response) {
							displayMessage('success', '', i18n.__('PROFILE_ONLINE_DELETED'));
							createCookie('mugenToken',  response.token, -1);
							createCookie('mugenTokenOnline',  response.onlineToken, -1);

							logInfos = parseJwt(response.token);
							logInfos.token = response.token;
							logInfos.onlineToken = response.onlineToken;
							initApp();
						});
					}
				);
			} else {
				getSettings();
			}
		});

		/* profil stuff END */
		/* prevent the virtual keyboard popup when on touchscreen by not focusing the search input */
		if(isTouchScreen) {
			$('#progressBarColor').addClass('cssTransition');
		}

		$(window).trigger('resize');
	});
	//Will make a request to /locales/en.json and then cache the results
	i18n = new I18n({
		//these are the default values, you can omit
		directory: '/locales',
		locale: navigator.languages[0].substring(0, 2),
		extension: '.json'
	});

	socket = io();

	isTouchScreen =  'ontouchstart' in document.documentElement || query.TOUCHSCREEN != undefined;
	if(isTouchScreen) $('body').addClass('touch');
	isSmall = $(window).width() < 1025;
	animTime = isSmall ? 200 : 300;
	refreshTime = 1000;
	mode = 'list';
	logInfos = { username : null, role : null };
	pathAvatar = '/avatars/';
	pathVideo = '/previews/';


	DEBUG =  query.DEBUG != undefined;
	SOCKETDEBUG =  query.SOCKETDEBUG != undefined;
	isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
	dragAndDrop = true;
	stopUpdate = false;

	pageSize = isTouchScreen ? 170 : 270;

	saveLastDetailsKara = [[]];
	playlistRange = {};
	ajaxSearch = {}, timer;
	oldState = {};
	oldSearchVal = '';

	addKaraHtml = '<button title="' + i18n.__('TOOLTIP_ADDKARA')
                + (scope == 'admin' ? ' - ' + i18n.__('TOOLTIP_ADDKARA_ADMIN') : '')
                + '" name="addKara" class="btn btn-sm btn-action"></button>';

	deleteKaraHtml = '<button title="' + i18n.__('TOOLTIP_DELETEKARA') + '" name="deleteKara" class="btn btn-sm btn-action"></button>';
	deleteCriteriaHtml = '<button title="' + i18n.__('TOOLTIP_DELETECRITERIA') + '" name="deleteCriteria" class="btn btn-action deleteCriteria"></button>';
	transferKaraHtml = '<button title="' + i18n.__('TOOLTIP_TRANSFERKARA') + '" name="transferKara" class="btn btn-sm btn-action"></button>';
	checkboxKaraHtml = '<span name="checkboxKara"></span>';
	infoKaraHtml = '<button title="' + i18n.__('TOOLTIP_SHOWINFO') + '" name="infoKara" class="btn btn-sm btn-action"></button>';
	likeKaraHtml = '<button class="likeKara btn btn-sm btn-action"></button>';
	likeCountHtml = '<bdg class="likeCount" title="' + i18n.__('TOOLTIP_UPVOTE') + '">upvotes <i class="glyphicon glyphicon-heart"></i></bdg>',
	closeButton = '<button title="' + i18n.__('TOOLTIP_CLOSEPARENT') + '" class="closeParent btn btn-action"></button>';
	closeButtonBottom = '<button title="' + i18n.__('TOOLTIP_CLOSEPARENT') + '" class="closeParent bottom btn btn-action"></button>';
	closePopupButton = '<button class="closePopupParent btn btn-action"></button>';
	showFullTextButton = '<button title="' + i18n.__('TOOLTIP_SHOWLYRICS') + '" class="fullLyrics ' + (isTouchScreen ? 'mobile' : '') + ' btn btn-action"></button>';
	showVideoButton = '<button title="' + i18n.__('TOOLTIP_SHOWVIDEO') + '" class="showVideo ' + (isTouchScreen ? 'mobile' : '') + ' btn btn-action"></button>';
	makeFavButton = '<button title="' + i18n.__('TOOLTIP_FAV') + '" class="makeFav ' + (isTouchScreen ? 'mobile' : '') + ' btn btn-action"></button>';
	makeFavButtonFav = makeFavButton.replace('makeFav','makeFav currentFav');
	makeFavButtonSmall = makeFavButton.replace('btn btn-action','btn btn-sm btn-action');
	makeFavButtonSmallFav = makeFavButtonFav.replace('btn btn-action','btn btn-sm btn-action');
	likeFreeButton = '<button title="' + i18n.__('TOOLTIP_UPVOTE') + '" class="likeFreeButton btn btn-action"></button>';
	dragHandleHtml =  '<span class="dragHandle"><i class="glyphicon glyphicon-option-vertical"></i></span>';
	playKaraHtml = '<button title="' + i18n.__('TOOLTIP_PLAYKARA') + '" class="btn btn-sm btn-action playKara"></btn>';
	serieMoreInfoButton = '<button class="moreInfo ' + (isTouchScreen ? 'mobile' : '') + ' btn btn-action"></button>';
	karaSuggestionHtml = '<li class="list-group-item karaSuggestion">' + i18n.__('KARA_SUGGESTION_MAIL') +	'</li>';
	buttonHtmlPublic = '';

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
		'PLAYLIST_MODE_SONG_ADDED',
		'FAV_IMPORTED'];
	hideErrorMessage = ['POLL_NOT_ACTIVE'];
	softErrorMessage = [
		'PLAYLIST_MODE_ADD_SONG_ERROR'];

	settingsNotUpdated= [];

	/* touchscreen event handling part */

	Hammer.Manager.prototype.emit = function (originalEmit) {
		return function (type, data) {
			originalEmit.call(this, type, data);
			$(this.element).trigger({
				type: type,
				gesture: data
			});
		};
	}(Hammer.Manager.prototype.emit);


	if (isTouchScreen && scope === 'public') {

		/* tap on full lyrics */

		var elem = $('.playlist-main');
		var manager2 = new Hammer.Manager(elem[0],{
			prevent_default: false
		});
		var tapper = new Hammer.Tap();
		manager2.add(tapper);
		manager2.on('tap', function (e) {
			var $this = $(e.target).closest('.moreInfo, .fullLyrics, .showVideo, .makeFav, .likeKara, [name="deleteKara"]');

			if($this.length > 0 && $this.closest('.playlistContainer').length > 0) {
				e.preventDefault();

				var liKara = $this.closest('li');
				var idKara = liKara.attr('idkara');
				if($this.hasClass('fullLyrics')) {
					$.ajax({ url: 'public/karas/' + idKara + '/lyrics' }).done(function (data) {
						if (typeof data === 'object') {
							if (mode == 'mobile') {
								$('#lyricsModalText').html(data.join('<br/>'));
								$('#lyricsModal').modal('open');
							} else {
								displayModal('alert',i18n.__('LYRICS'), '<center>' + data.join('<br/>') + '</center');
							}
						} else {
							displayMessage('warning','', i18n.__('NOLYRICS'));
						}
					});
				} else if($this.hasClass('showVideo')) {
					showVideo($this);
				} else if($this.hasClass('moreInfo')) {
					moreInfo($this);
				} else if($this.hasClass('makeFav')) {
					makeFav(idKara, !$this.hasClass('currentFav'), $this);
				} else if($this.hasClass('likeKara')) {
					likeKara(!$this.hasClass('currentLike'), $this);
				} else if($this.hasClass('likeKara')) {
					likeKara(!$this.hasClass('currentLike'), $this);
				} else if($this.attr('name') == 'deleteKara') {
					deleteKaraPublic(liKara.attr('idplaylistcontent'));
				}
			}
		});

		manager2.on('tap click', function (e) {
			e.gesture = e;
			var target = $(e.gesture.target);
			if(target.closest('.fullLyrics, .showVideo, .makeFav, .moreInfo').length > 0
								|| target.closest('.actionDiv').length > 0
								|| target.closest('.infoDiv').length > 0
								|| target.closest('[name="checkboxKara"]').length > 0
								|| target.closest('li').length == 0
								|| target.closest('.playlistContainer').length == 0) {
				return false;
			}
			var $this = target.closest('li');
			$this.toggleClass('opened');
			toggleDetailsKara($this);
			$this.removeClass('pressed');

		});


		$('.playlistContainer').on('touchstart mousedown', 'li', function (e) {
			var $this = $(e.target).closest('li');
			if($this) currentPanning = $this.get(0);

			$this.addClass('pressed');
		}).on('touchend mouseup', 'li', function (e) {
			var $this = $(e.target).closest('li');
			$this.removeClass('drag');
			$this.removeClass('pressed');
		});
	}

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
		DEBUG && console.log(side);
		var deferred = $.Deferred();
		var dashboard = $('#panel' + side + ' .plDashboard');
		var container = $('#panel' + side + ' .playlistContainer');
		var playlist = $('#playlist' + side);
		var idPlaylist = parseInt($('#selectPlaylist' + side).val());
		var filter = $('#searchPlaylist' + side).val();
		var fromTo = '';
		var url, html, canTransferKara, canAddKara, dragHandle, playKara;

		var $filter = $('#searchMenu' + side + ' li.active');
		var searchType = $filter.attr('searchType');
		var searchCriteria = $filter.attr('searchCriteria');
		var searchValue = $filter.attr('searchValue');

		/* getting all the info we need about range */
		localStorage.setItem('search' + side, filter ? filter : '');
		localStorage.setItem('playlistRange', JSON.stringify(playlistRange));

		var range = getPlaylistRange(idPlaylist);
		from = range.from;
		to = range.to;

		fromTo += '&from=' + from + '&size=' + pageSize;
		/*********************************************/

		// setup variables depending on which playlist is selected : -1 = database kara list, -2 = blacklist, -3 = whitelist, -4 = blacklist criterias

		var singlePlData = getPlData(idPlaylist);

		if(!singlePlData) return false;
		url = singlePlData.url;
		html = singlePlData.html;
		canTransferKara = singlePlData.canTransferKara;
		canAddKara = singlePlData.canAddKara;


		dragHandle = isTouchScreen && scope == 'admin' && idPlaylist > 0 ? dragHandleHtml : '';
		playKara = scope === 'admin' && idPlaylist > 0 ? playKaraHtml : '';

		// public users can add kara to one list, current or public
		canAddKara = scope === 'admin' ? canAddKara : $('#selectPlaylist' + side + ' > option:selected').data('flag_' + playlistToAdd)

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


		// ask for the kara list from given playlist
		if (ajaxSearch[url]) ajaxSearch[url].abort();
		var async = !(isTouchScreen && isChrome && scrollingType);
		ajaxSearch[url] = $.ajax({  url: urlFiltre,
			type: 'GET', async: async,
			dataType: 'json' })
			.done(function (response) {
				//DEBUG && console.log(urlFiltre + " : " + data.length + " résultats");
				//var end = window.performance.now();
				//alert(end - start);
				var htmlContent = '', data;

				if(idPlaylist != -4) {	// general case
					data = response.content;
					if(response.infos) {
						dashboard.attr('karacount', response.infos.count );
						setPlaylistRange(idPlaylist, response.infos.from,  response.infos.to);
					}

					for (var key in data) {
						// build the kara line
						if (data.hasOwnProperty(key)) {
							var kara = data[key];

							var karaDataAttributes = ' idKara="' + kara.kid + '" '
							+	(idPlaylist == -3 ? ' idwhitelist="' + kara.whitelist_id  + '"' : '')
							+	(idPlaylist > 0 || idPlaylist == -5 ? ' idplaylistcontent="' + kara.playlistcontent_id + '" pos="'
							+	kara.pos + '" data-username="' + kara.username + '"' : '')
							+	(kara.flag_playing ? 'currentlyPlaying' : '' ) + ' '
							+	(kara.flag_dejavu ? 'dejavu' : '' ) + ' '
							+	(kara.username == logInfos.username ? 'user' : '' );

							var badges = '';

							if(kara.misc_tags) {
								var tagArray = kara.misc_tags.map(e => e.name);
								tagArray.sort(function(a, b){
									return flattenedTagsGroups.indexOf(a) - flattenedTagsGroups.indexOf(b);
								  });
								tagArray.forEach(function(tag) {
									if (tag !== 'NO_TAG') {
										badges += '<bdg title="' + i18n.__(tag) + '">'  + (i18n.__(tag + '_SHORT') ? i18n.__(tag + '_SHORT') : '?') + '</bdg>';
									}
								});
							}
							if(kara.upvotes) {
								badges += likeCountHtml.replace('upvotes', kara.upvotes);
							}
							if (mode === 'list') {
								var likeKara = likeKaraHtml;
								if (kara.flag_upvoted) {
									likeKara = likeKaraHtml.replace('likeKara', 'likeKara currentLike');
								}

								// TODO add fav button next to info for public pc interface
								htmlContent += '<li class="list-group-item" ' + karaDataAttributes + '>'
								//	+ 	(scope == 'public' && isTouchScreen ? '<slide></slide>' : '')
								+   (isTouchScreen && scope !== 'admin' ? '' : '<div class="actionDiv">' + html + dragHandle + '</div>')
								+   (scope == 'admin' ? checkboxKaraHtml : '')
								+   '<div class="infoDiv">'
                                +   (scope === 'admin' || !isTouchScreen ? infoKaraHtml : '')
                                +   (scope === 'public' && logInfos.role !== 'guest' && !isTouchScreen ? (  kara['flag_favorites'] || idPlaylist === -5 ? makeFavButtonSmallFav : makeFavButtonSmall ) : '')
								+	(scope === 'admin' ? playKara : '')
								+	(scope !== 'admin' && dashboard.data('flag_public') ? likeKara : '')
								+	(scope !== 'admin' && kara.username == logInfos.username && (idPlaylist == playlistToAddId) ?  deleteKaraHtml : '')
								+	'</div>'
								+   '<div class="contentDiv">'
								+	'<div>' + buildKaraTitle(kara, {'search' : filter}) + '</div>'
								+	'<div>' + badges + '</div>'
								+   '</div>'
								+   (saveDetailsKara(idPlaylist, kara.kid) ? buildKaraDetails(kara, mode) : '')	// this line allows to keep the details opened on recreation
								+   '</li>';
							}
						}
					}
					var count = response.infos ? response.infos.count : 0;


					/* adding artificial last line */
					if(idPlaylist === -1 && count === response.infos.from + data.length) {
						// count++;
						htmlContent +=	karaSuggestionHtml;
					}



					// creating filler space for dyanmic scrolling
					var fillerTopH = Math.min(response.infos.from * 34, container.height()/1.5);
					var fillerBottomH = Math.min((count - response.infos.from - pageSize) * 34, container.height()/1.5);
                    var fillerBottomMargin = (scope !== 'admin' && idPlaylist == playlistToAddId) ? 80 : 0;
					var fillerTop = '<li class="list-group-item filler" style="height:' + fillerTopH + 'px;"><div class="loader"><div></div></div></li>';
                    var fillerBottom = '<li class="list-group-item filler"'
                                    +   'style="height:' + fillerBottomH + 'px;'
                                    +   'margin-bottom:' + fillerBottomMargin + 'px;">'
                                    +   '<div class="loader"><div></div></div></li>';

					htmlContent =	fillerTop
								+	htmlContent
								+	fillerBottom;


					if(scrollingType) {
						container.css('overflow-y','hidden');
						if(scrollingType === 'reposition') {
							var karaMarker = scrolling === "top" ? container.find('li[idkara]').first() : container.find('li[idkara]').last();
							var posKaraMarker = karaMarker.offset() ? karaMarker.offset().top : -1;
						}
					}

					window.requestAnimationFrame( function() {
						document.getElementById('playlist' + side).innerHTML = htmlContent;
						deferred.resolve();
						refreshContentInfos(side);
						//window.requestAnimationFrame( function() {
						var y = container.scrollTop();
						if(scrollingType) {

							container.css('overflow-y','auto');
							if(scrollingType === 'reposition') {
								var newkaraMarker = container.find('li[idkara="' + karaMarker.attr('idkara') + '"]');
								var newPosKaraMarker = (newkaraMarker && newkaraMarker.offset() ? newkaraMarker.offset().top : posKaraMarker);
								y = container.scrollTop() + newPosKaraMarker - posKaraMarker;
							} else if (scrollingType === 'goTo') {
								if(scrolling === 'top') {
									y = 0 + fillerTopH;
								} else if (scrolling === 'bottom') {
									y = playlist.height() + 0;
								} else if (scrolling === 'playing') {
									var currentlyPlaying = container.find('li[currentlyplaying], li[currentlyPlaying=""], li[currentlyPlaying="true"]');
									if(currentlyPlaying.length > 0) y = currentlyPlaying.offset().top - currentlyPlaying.parent().offset().top;
								}
							}
							container.scrollTop(y); // TODO un jour, tout plaquer, reprogrammer mon propre moteur de rendu natif, et mourir en paix
						}
						container.scrollTop(
							Math.min(playlist.height() - fillerBottomH - container.height(),
								Math.max(fillerTopH, y)));
						container.attr('flagScroll', false);
						//});
					});

				} else {
					data = response;
					/* Blacklist criterias build */
					var blacklistCriteriasHtml = $('<div/>');
					var regenSelect2 = false;
					if (scope === 'admin') {
						if ($('#blacklistCriteriasInputs').length > 0) {
							$('#blacklistCriteriasInputs').detach().appendTo(blacklistCriteriasHtml);
						} else {
							regenSelect2 = true;
							blacklistCriteriasHtml = $('<div><span id="blacklistCriteriasInputs" class="list-group-item" style="padding:10px">'
							+	'<select id="bcType" class="input-sm" style="color:black"/> '
							+	'<span id="bcValContainer" style="color:black"></span> '
							+	'<button id="bcAdd" class="btn btn-default btn-action addBlacklistCriteria"></button>'
							+	'</span></div>');
							$.each(listTypeBlc, function(k, v){
								if(v !== 'BLCTYPE_1001') blacklistCriteriasHtml.find('#bcType').append($('<option>', {value: v.replace('BLCTYPE_',''), text: i18n.__(v)}));
							});
						}
					}

					for (var k in data) {
						if (data.hasOwnProperty(k)) {
							if(blacklistCriteriasHtml.find('li[type="' + data[k].type + '"]').length == 0) {
								blacklistCriteriasHtml.append('<li class="list-group-item liType" type="' + data[k].type + '">' + i18n.__('BLCTYPE_' + data[k].type) + '</li>');
							}
							// build the blacklist criteria line

							tagsUpdating.done(e => {
								var tagsFiltered = jQuery.grep(tags, function(obj) {
									return obj.tag_id == data[k].value;
								});
								var tagText = tagsFiltered.length === 1 && data[k].type > 0  && data[k].type < 100 ?  tagsFiltered[0].name_i18n : data[k].value;
								var textContent = data[k].type == 1001 ? buildKaraTitle(data[k].value[0]) : tagText;

								blacklistCriteriasHtml.find('li[type="' + data[k].type + '"]').after(
									'<li class="list-group-item liTag" blcriteria_id="' + data[k].blcriteria_id + '"> '
                                +	'<div class="actionDiv">' + html + '</div>'
                                +	'<div class="typeDiv">' + i18n.__('BLCTYPE_' + data[k].type) + '</div>'
                                +	'<div class="contentDiv">' + textContent + '</div>'
                                +	'</li>');
							})

						}
					}
					//htmlContent = blacklistCriteriasHtml.html();
					$('#playlist' + side).empty().append(blacklistCriteriasHtml);
					if (regenSelect2) $('#bcType').select2({ theme: 'bootstrap', dropdownAutoWidth : true, minimumResultsForSearch: -1 });
					$('#bcType').change();
					deferred.resolve();
				}



				// depending on the playlist we're in, notify if the other playlist can add & transfer to us
				$('#panel' + non(side)).attr('canTransferKara', canTransferKara).attr('canAddKara', canAddKara);

				//var time = console.timeEnd('html'); DEBUG && console.log(data.length);

				// drag & drop part
				// TODO revoir pour bien définir le drag&drop selon les droits
				if (dragAndDrop && scope === 'public' && mode != 'mobile' && !isTouchScreen) {
					/*
					var draggableLi =  isTouchScreen  ? $('#playlist' + 1 + ' > li .dragHandle') : $('#playlist' + 1 + ' > li');
					var dropZone = $('#playlist' + non(1)).parent();
					if(draggableLi.draggable('instance') != undefined) {
						if($('#panel' + 1).attr('canaddkara') == 'true')  {
							draggableLi.draggable('enable');
							dropZone.droppable('enable');
						} else {
							draggableLi.draggable('disable');
							dropZone.droppable('disable');
						}
					} else if( $('#panel' + 1).attr('canaddkara') == 'true') {
						draggableLi.draggable({
							cursorAt: { top: 20, right: 15 },
							helper:  function(){
								var li = $(this).closest('li');
								return $('<div class="list-group-item dragged"></div>')
									.append(li.find('.dragHandle').clone(),li.find('.contentDiv').clone());
							},
							appendTo: dropZone,
							zIndex: 9999,
							delay: 0,
							distance: 0
						});
						dropZone.droppable({
							classes: {
								'ui-droppable-hover': 'highlight-hover',
								'ui-droppable-active': 'highlight-active'
							},
							drop : function(e, ui){
								$(ui.draggable).closest('li').find('.actionDiv > [name=addKara]').click();
							}
						});
					}
					*/
				} else if(dragAndDrop && scope === 'admin') {
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
					/*
                if ($('#selectPlaylist' + non(side)).val() > 0) {
                    var sortableUl2 = $("#playlist" + non(side));
                    sortableUl2.sortable({
                        appendTo: sortableUl2,
                        helper : isTouchScreen ? ".dragHandle" : false,
                        update: function(event, ui) { changeKaraPos(ui.item) },
                       // connectWith: sortableUl,
                       axis : "y"
                    });
                }
                    */
					/*
                helper: function(event, ui){
                    var li = $(ui);
                    li.find('.detailsKara, .lyricsKara').remove();
                    li.css('height', 'auto');
                    return li.clone()},
                    start: function(e, ui){
                        ui.placeholder.height(ui.item.height());
                    },
                    */

				}
			});

		return deferred.promise();
	};
	/**
     * Scroll to a kara in a playlist and highlight it
     * @param {1, 2} side - which playlist on the screen
     * @param {Int} idKara - kara to highlight & scroll
     */
	scrollToKara = function (side, idKara, lengthFactor) {
		lengthFactor = lengthFactor ? lengthFactor : 1;
		var parent = $('#playlist' + side).parent();
		var element = parent.find('li[idkara="' + idKara + '"]');

		if (element.length > 0) {
			/*var willParentSroll = parent[0].scrollTop != parent[0].clientTop|| (parent[0].clientHeight != parent[0].scrollHeight
									&& parent.scrollTop() + element.offset().top - parent.offset().top != 0);*/
			// DEBUG && console.log( parent[0].scrollTop, parent[0].clientTop, parent[0].clientHeight, parent[0].scrollHeight, parent.scrollTop() + element.offset().top - parent.offset().top);
			var willParentSroll =  element.offset().top > parent.height() + parent.offset().top || element.offset().top < parent.offset().top;
			parent.animate({
				scrollTop: willParentSroll ? parent.scrollTop() + element.offset().top - parent.offset().top : parent.scrollTop()
			}, willParentSroll ? 400 : 0 , function(){
				element = parent.find('li[idkara="' + idKara + '"]'); // element may be lost in the meantime
				element.finish();
				var hLight = $('<div class="hLight"/>');
				element.prepend(hLight);
				hLight.velocity({ opacity : 1.0 }, { duration: 100 * lengthFactor, easing: [.2,.75,.4,.8], complete: function() {
					hLight.velocity({ opacity : 0 }, { duration: 500 * lengthFactor,  easing:  [.75,.2, .8,.4], complete: function() {
						hLight.remove();
						element.focus();
					}});
				}});
			});
		}
	};

	/**
    * Generic function scrolling to an element in its parent
    * @param {Element} parent - parent of the element
    * @param {Element} element - element to scroll to
    * @param {Boolean} highlight - to highlight the element [discarded, see scrollToKara]
    */
	scrollToElement = function (parent, element, anchorElement) {
		var willParentSroll =  anchorElement.offset().top > parent.height() + parent.offset().top || anchorElement.offset().top < parent.offset().top;
		if(willParentSroll) {
			parent.animate({
				scrollTop: parent.scrollTop() + element.offset().top - parent.offset().top
			}, 400 );
		}
	};

	/**
    * refresh playlist lists
    */
	refreshPlaylistSelects = function () {
		var deferred = $.Deferred();

		var playlistList = {};

		var select1 = $('#selectPlaylist1'), select2 = $('#selectPlaylist2');
		var val1 = select1.val(), val2 = select2.val();

		$.ajax({ url: scope + '/playlists', }).done(function (data) {
			playlistList = data; // object containing all the playlists
			var shiftCount = 0;
			if(playlistList[0] && (playlistList[0].flag_current || playlistList[0].flag_public)) shiftCount++;
			if(playlistList[1] && (playlistList[1].flag_current || playlistList[1].flag_public)) shiftCount++;

			if (scope === 'admin')                                                        playlistList.splice(shiftCount, 0, { 'playlist_id': -5, 'name': 'Favs', 'flag_favorites' : true });
			if (scope === 'admin' || settings.Frontend.Permissions.AllowViewWhitelist)           playlistList.splice(shiftCount, 0, { 'playlist_id': -3, 'name': 'Whitelist', 'flag_visible' :  settings['Frontend.Permissions.AllowViewWhitelist'] == 1});
			if (scope === 'admin' || settings.Frontend.Permissions.AllowViewBlacklistCriterias)  playlistList.splice(shiftCount, 0, { 'playlist_id': -4, 'name': 'Blacklist criterias', 'flag_visible' : settings['Frontend.Permissions.AllowViewBlacklistCriterias'] == 1});
			if (scope === 'admin' || settings.Frontend.Permissions.AllowViewBlacklist)           playlistList.splice(shiftCount, 0, { 'playlist_id': -2, 'name': 'Blacklist', 'flag_visible' : settings['Frontend.Permissions.AllowViewBlacklist'] == 1});
            
            statsUpdating.done( function() {

                if (scope === 'admin') playlistList.splice(shiftCount, 0, { 'playlist_id': -1, 'name': 'Karas', 'karacount' : kmStats ? kmStats.karas : 0 });

                // for public interface only
                var searchOptionListHtml = '<option value="-1" default data-playlist_id="-1"></option>';
                searchOptionListHtml += '<option value="-6" data-playlist_id="-6"></option>';
                searchOptionListHtml += '<option value="-5" data-playlist_id="-5" data-flag_favorites="true"></option>';
    
                // building the options
                var optionListHtml = '';
                $.each(playlistList, function (key, value) {
                    var params = dataToDataAttribute(value);
                    var optionHtml = '<option ' + params + '  value=' + value.playlist_id + '> ' + value.name + '</option>';
                    optionListHtml += optionHtml;
    
                });
                $('select[type="playlist_select"]').empty().html(optionListHtml);
                if(scope === 'public') $('#selectPlaylist1').empty().html(searchOptionListHtml);
    
                // setting the right values to newly refreshed selects
                // for public interface, panel1Default to keep kara list, playlistToAddId to show the playlist where users can add
                // for admin, check cookies
                settingsUpdating.done( function() {
                    if(scope === 'public') {
                        select1.val(val1? val1 : panel1Default);
                        select2.val(val2? val2 : playlistToAddId);
                        if (webappMode == 1) {
                            var currentPlaylistId = select2.find('option[data-flag_current="true"]').attr('value');
                            select2.val(currentPlaylistId);
                        }
                    } else {
                        var plVal1Cookie = readCookie('mugenPlVal1');
                        var plVal2Cookie = readCookie('mugenPlVal2');
                        if (plVal1Cookie == plVal2Cookie) {
                            plVal2Cookie == null;
                            plVal1Cookie == null
                        }
                        select1.val(val1? val1 : plVal1Cookie ? plVal1Cookie : -1);
                        select2.val(val2? val2 : plVal2Cookie ? plVal2Cookie : playlistToAddId);
                    }
    
                    $('.plSelect .select2').select2({ theme: 'bootstrap',
                        templateResult: formatPlaylist,
                        templateSelection : formatPlaylist,
                        tags: false,
                        minimumResultsForSearch: 10
                    });
    
                    if(!select2.val() && select2.length > 0) {
                        select2[0].selectedIndex = 0;
                    }
                    deferred.resolve();
            });
            
			});
		}).fail(function (data) {
			DEBUG && console.log(data);
		});
		return deferred.promise();
	};

	/** refresh playlist dashboard infos
    * @param {1,2} side - side of the playlist to trigger the change on
	* @param {boolean} freshData (optional) - refresh playlist data recorded in the option
    */
	refreshPlaylistDashboard = function(side, freshData) {
		var dashboard = $('#panel' + side + ' .plDashboard');
		var select = dashboard.find('.plSelect select');
		var option = select.find('option:selected');
		var idPlaylist =  option.val();
		var deferred = $.Deferred();

		if(!freshData) {
			deferred.resolve();
		} else {
			$.ajax({ url: scope + '/playlists/' + idPlaylist, }).done(function (data) {
				$.each(data, function(name, value) {
					option.attr("data-" + name, value);
					option.data(name, value);
				});
				deferred.resolve();
			});
		}

		deferred.promise().done( function() {

			// managing flags
			['flag_current', 'flag_public'].forEach(function (e) {
				if (option.data(e)) dashboard.find('button[name="' + e + '"]').removeClass('btn-default').addClass('btn-primary');
				else dashboard.find('button[name="' + e + '"]').removeClass('btn-primary').addClass('btn-default');
			});

			// overcomplicated stuff to copy data about playlist from select to container
			// because storing var as data in html via jquery doesn't affect actual html attributes...
			var optionAttrList = option.prop('attributes');
			var attrList = dashboard.prop('attributes');
			if(attrList) {
				var attrListStr = Object.keys(attrList).map(function(k,v){
					return attrList[v].name.indexOf('data-') > -1 ? attrList[v].name : '';
				}).join(' ');
				dashboard.removeAttr(attrListStr);
			}


			$.each(optionAttrList, function() {
				dashboard.attr(this.name, this.value);
			});
			dashboard.data(option.data());
			if (playlistRange[idPlaylist] == undefined) {
				setPlaylistRange(idPlaylist, 0, pageSize);
			}
			if(playlistContentUpdating) {
				playlistContentUpdating.done(function() {
					refreshContentInfos(side);
				});
			}
			$(window).resize();
		});
	};

	refreshContentInfos = function(side) {
		var dashboard =  $('#panel' + side + ' .plDashboard');
		var idPlaylist = dashboard.find('.plSelect select > option:selected').val();

		var range = getPlaylistRange(idPlaylist);

		var max = range.from + $('#playlist' + side + ' > li[idkara]').length;

		var plInfos = '';
		if(idPlaylist) {
			plInfos = idPlaylist != -4? range.from + '-' + max : '';
			plInfos +=
				(idPlaylist != -4 ?
					' / ' + dashboard.attr('karacount') + (!isTouchScreen ? ' karas' : '')
					: '') +
				(idPlaylist > -1 ?
					' ~ dur. ' + secondsTimeSpanToHMS(dashboard.data('duration'), 'hm') + ' / re. ' + secondsTimeSpanToHMS(dashboard.data('time_left'), 'hm')
					: '');

			dashboard.parent().find('.plInfos').text(plInfos).data('from', range.from).data('to', max);
		}
	};

	/**
    * refresh the player infos
    * @param {Function} callback - function to call at the end of the refresh
    * @param {anything} param1 - param to give to this function
    */
	refreshPlayerInfos = function (data, callback, param1) {
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
					$('#status').attr('name','pause');
					$('#progressBarColor').addClass('cssTransform');
					break;
				case 'pause':
					$('#status').attr('name', 'play');
					$('#progressBarColor').removeClass('cssTransform');
					break;
				case 'stop':
					$('#status').attr('name', 'play');
					$('#progressBarColor').removeClass('cssTransform');
					break;
				default:
					DEBUG && console.log('ERR : Kara status unknown : ' + status);
				}
            }
            
            if($('input[name="lyrics"]').is(':checked')
                || (mode == 'mobile' || webappMode == 1)
                    && $('#switchInfoBar').hasClass('showLyrics')) {
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
					$('#karaInfo > span').text( i18n.__('KARA_PAUSED_WAITING') );
					$('#karaInfo > span').data('text',i18n.__('KARA_PAUSED_WAITING') );
				} else if ( data.currentlyPlaying === -1) {
					$('#karaInfo').attr('idKara', data.currentlyPlaying);
					$('#karaInfo').attr('length', -1);
					$('#karaInfo > span').text( i18n.__('JINGLE_TIME') );
					$('#karaInfo > span').data('text',i18n.__('JINGLE_TIME') );

				} else {
					$.ajax({ url: 'public/karas/' + data.currentlyPlaying }).done(function (dataKara) {
						var kara = dataKara[0];
						$('.karaCard').attr('idKara', kara.kid);
						$('#karaInfo').attr('idKara', kara.kid);
						$('#karaInfo').attr('length', kara.duration);
						$('#karaInfo > span').text( buildKaraTitle(kara) );
						$('#karaInfo > span').data('text', buildKaraTitle(kara) );

						if(webappMode === 1) {
							buildKaraDetails(kara, 'karaCard');
						}
					});
				}
			}
			if (data.showSubs != oldState.showSubs) {
				if (data.showSubs) {
					$('#showSubs').attr('name','hideSubs');
				} else {
					$('#showSubs').attr('name','showSubs');
				}
			}
			if (data.muteStatus != oldState.muteStatus) {
				if (!data.muteStatus) {
					$('#mutestatus').attr('name','mute');
				} else {
					$('#mutestatus').attr('name','unmute');
				}
			}
			if (data.onTop != oldState.onTop) {
				$('input[name="Player.StayOnTop"]').bootstrapSwitch('state', data.onTop, true);
			}
			if (data.fullscreen != oldState.fullscreen) {
				$('input[name="Player.FullScreen"]').bootstrapSwitch('state', data.fullscreen, true);
			}
			if (data.volume != oldState.volume) {
				var val = data.volume, base = 100, pow = .76;
				val = val / base;
				val =  base * Math.pow(val, 1/pow);
				val = parseInt(val);
				$('input[name="setVolume"]').val(val);
			}

			oldState = data;
			if (callback && typeof callback === 'function' && typeof param1 != 'undefined') {
				callback(param1);
			}
		}
	};

	/**
    * Build kara title for users depending on the data
    * @param {Object} data - data from the kara
    * @param {Object} options - (optional) [search, mode] search made by the user, special mode to render so far 'doubleline' is accepted
    * @return {String} the title
    */
	buildKaraTitle = function(data, options) {
		if(typeof options == 'undefined') {
			options = {};
		}
		var isMulti = data.languages.find(e => e.name.indexOf('mul') > -1);
		if(data.languages && isMulti) {
			data.languages = [isMulti];
		}

		var titleText = 'fillerTitle';

		var limit = isSmall ? 35 : 50;
		var serieText =  data.serie ? data.serie : data.singers.map(e => e.name).join(', ');
		serieText = serieText.length <= limit ? serieText : serieText.substring(0, limit) + '…';
		var titleArray = [
			data.languages.map(e => e.name).join(', ').toUpperCase(),
			serieText,
			i18n.__(data.songtype[0].name + '_SHORT') + (data.songorder > 0 ? ' ' + data.songorder : '')
		];
		var titleClean = titleArray.map(function (e, k) {
			return titleArray[k] ? titleArray[k] : '';
		});

		var separator = '';
		if(data.title) {
			separator = ' - ';
			if (options.mode && options.mode === 'doubleline') {
				separator = '<br/>';
			}
		}
		titleText = titleClean.join(' - ') + separator + data.title;


		if(options.search) {
			var search_regexp = new RegExp('(' + options.search + ')', 'gi');
			titleText = titleText.replace(search_regexp,'<h>$1</h>');
		}
		return titleText;
	};

	toggleDetailsKara = function (el) {
		var liKara = el.closest('li');
		var idKara = liKara.attr('idkara');
		var idPlc = parseInt(liKara.attr('idplaylistcontent'));
		var idPlaylist = parseInt( el.closest('.panel').find('.plDashboard').data('playlist_id'));
		var infoKara = liKara.find('.detailsKara');

		if(!liKara.hasClass('loading')) { // if we're already loading the div, don't do anything
			if (!infoKara.is(':visible') ) {
				var urlInfoKara = idPlaylist > 0 ? scope + '/playlists/' + idPlaylist + '/karas/' + idPlc : 'public/karas/' + idKara;
				liKara.addClass('loading');
				$.ajax({ url: urlInfoKara }).done(function (data) {
					var detailsHtml = buildKaraDetails(data[0], mode);
					detailsHtml = $(detailsHtml).hide();
					liKara.find('.contentDiv').after(detailsHtml);
					$(detailsHtml).data(data[0]);

					detailsHtml.fadeIn(animTime);
					liKara.find('[name="infoKara"]').css('border-color', '#8aa9af');
					saveDetailsKara(idPlaylist, idKara, 'add');

					liKara.removeClass('loading');

					if(introManager && introManager._currentStep) introManager.nextStep();
				}).always(function (data) {
					liKara.removeClass('loading');
				});
			} else if (infoKara.is(':visible')) {
				saveDetailsKara(idPlaylist, idKara, 'remove');
				infoKara.add(liKara.find('.lyricsKara')).fadeOut(animTime);
				liKara.find('[name="infoKara"]').css('border-color', '');
			} else {
				saveDetailsKara(idPlaylist, idKara, 'add');
				infoKara.fadeIn(animTime);
				liKara.find('[name="infoKara"]').css('border-color', '#8aa9af');
			}
		}
	};

	/**
    * Build kara details depending on the data
    * @param {Object} data - data from the kara
    * @param {String} mode - html mode
    * @return {String} the details, as html
    */
	buildKaraDetails = function(data, htmlMode) {
		var todayDate = Date.now();
		var playTime = new Date(todayDate + data['time_before_play']*1000);
		var playTimeDate = playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2);
		var beforePlayTime = secondsTimeSpanToHMS(data['time_before_play'], 'hm');

		var lastPlayed_at =  data['lastplayed_at'];
		var lastPlayed =  data['lastplayed_ago'];
		var lastPlayedStr = '';
		if(lastPlayed && !lastPlayed.days && !lastPlayed.months && !lastPlayed.years) {
            var timeAgo = (lastPlayed.seconds ? lastPlayed.seconds : 0) + (lastPlayed.minutes ? lastPlayed.minutes * 60 : 0) + (lastPlayed.hours ? lastPlayed.hours * 3600 : 0);
            var timeAgoStr = (lastPlayed.minutes || lastPlayed.hours) ?
                                secondsTimeSpanToHMS(timeAgo, 'hm') : secondsTimeSpanToHMS(timeAgo, 'ms')

            lastPlayedStr = i18n.__('DETAILS_LAST_PLAYED_2', '<span class="time">' + timeAgoStr + '</span>');
        } else if (lastPlayed_at){
            lastPlayedStr = '<span class="time">' + new Date(lastPlayed_at).toLocaleDateString() + '</span>';
        }
        
		var details = {
			  'UPVOTE_NUMBER' : data['upvotes']
			, 'DETAILS_ADDED': 		(data['created_at'] ? i18n.__('DETAILS_ADDED_2',new Date( data['created_at']).toLocaleDateString()) : '') + (data['nickname'] ? ' ' + i18n.__('DETAILS_ADDED_3', data['nickname']) : '')
			, 'DETAILS_PLAYING_IN': data['time_before_play'] ? i18n.__('DETAILS_PLAYING_IN_2', ['<span class="time">' + beforePlayTime + '</span>', playTimeDate]) : ''
			, 'DETAILS_LAST_PLAYED': lastPlayed ? lastPlayedStr : ''
			, 'BLCTYPE_6': 			data['authors'].map(e => e.name).join(', ')
			, 'DETAILS_VIEWS':		data['played']
			, 'BLCTYPE_4':			data['creators'].map(e => e.name).join(', ')
			, 'DETAILS_DURATION':	data['duration'] == 0 || isNaN(data['duration']) ? null : ~~(data['duration'] / 60) + ':' + (data['duration'] % 60 < 10 ? '0' : '') + data['duration'] % 60
			, 'DETAILS_LANGUAGE':	data['languages_i18n'].join(', ')
			, 'BLCTYPE_7':			data['misc_tags'].map(e => i18n.__(e.name)).join(', ')
			, 'DETAILS_SERIE':		data['serie']
			, 'DETAILS_SERIE_ORIG':		data['serie_orig']
			, 'BLCTYPE_2':			data['singers'].map(e => e.name).join(', ')
			, 'DETAILS_TYPE ':		i18n.__(data['songtype'][0].name) + data['songorder'] > 0 ? ' ' + data['songorder'] : ''
			, 'DETAILS_YEAR':		data['year']
			, 'BLCTYPE_8':			data['songwriters'].map(e => e.name).join(', ')
		};
		var htmlDetails = Object.keys(details).map(function (k) {
			if(details[k] && details[k] !== 'NO_TAG' && details[k] !== i18n.__('NO_TAG')) {
				var detailsLine = details[k].toString().replace(/,/g, ', ');
				return '<tr><td>' + i18n.__(k) + '</td><td>' + detailsLine + '</td><tr/>';
			} else return '';
		});
		var htmlTable = '<table>' + htmlDetails.join('') + '</table>';
		var infoKaraTemp = 'no mode specified';
		var makeFavButtonAdapt = data['flag_favorites'] ? makeFavButtonFav : makeFavButton;
        if(logInfos.role === 'guest') makeFavButtonAdapt = '';
		if (htmlMode == 'list') {
			var isPublic = $('li[idplaylistcontent="' + data['playlistcontent_id'] + '"]').closest('.panel').find('.plDashboard').data('flag_public');
			var isCurrent = $('li[idplaylistcontent="' + data['playlistcontent_id'] + '"]').closest('.panel').find('.plDashboard').data('flag_current');
			var likeFreeButtonHtml = data['flag_free'] ? likeFreeButton.replace('likeFreeButton', 'likeFreeButton free btn-primary') : likeFreeButton;

			infoKaraTemp = '<div class="detailsKara alert alert-info">'
				+ '<div class="topRightButtons">'
				+ (isTouchScreen ? '' : closeButton)
				+ (scope === 'public' && !isTouchScreen ? '' : makeFavButtonAdapt)
				+ showFullTextButton
				+ (data['previewfile'] ? showVideoButton : '')
				+ (data['serie'] ? ' ' + serieMoreInfoButton : '')
				+ (scope === 'admin' && (isCurrent || isPublic) ? likeFreeButtonHtml : '')
				+ '</div>'
				+ htmlTable
				+ '</div>';
		} else if (htmlMode == 'mobile') {
			infoKaraTemp = '<div class="detailsKara z-depth-1">'
				+ '<div class="topRightButtons">'
				+ makeFavButtonAdapt
				+ showFullTextButton
				+ (data['previewfile'] ? showVideoButton : '')
				+ '</div>'
				+ htmlTable
				+ '</div>';
		} else if (htmlMode == 'karaCard') {
			$.ajax({ url: 'public/karas/' + data.kid + '/lyrics' }).done(function (data) {
				var lyrics = i18n.__('NOLYRICS');
				if (typeof data === 'object') {
					lyrics =  data.join('<br/>');
				}
				$('.karaCard .lyricsKara').html(lyrics);
			});
			infoKaraTemp = '<div class="topRightButtons">' + makeFavButtonAdapt + '</div>' + htmlTable;
			$('.karaCard .details').html(infoKaraTemp);
			$('.karaCard > div').show();
		}
		return infoKaraTemp;
	};


	checkOnlineStats = function(settings) {

		if(settings.Online.Stats == -1) {
			if($('#onlineStatsModal').length < 1) {
				var top =		'<div class="modal modalPage fade" id="onlineStatsModal" role="dialog">'+
				'    <div class="modal-dialog modal-md">'+
				'        <div class="modal-content">';

				var bottom =	'            </div>'+
								'        </div>'+
								'    </div>'+
								'</div>';
				var content =	'<ul class="nav nav-tabs nav-justified modal-header">'+
								'<li class="modal-title stats"><a data-toggle="tab" href="#nav-stats" role="tab" aria-controls="nav-stats" aria-selected="true" aria-expanded="true">'+
									i18n.__('ONLINE_STATS.TITLE') +'</a>'+
								'</li></ul>'+
								'<div class="tab-content" id="nav-stats-tab">'+
								'   <div id="nav-stats" role="tabpanel" aria-labelledby="nav-stats-tab" class="modal-body tab-pane fade active in">'+
								'       <div class="modal-message text">'+
								'       	<p>' + i18n.__('ONLINE_STATS.INTRO') + '</p>'+
								'       </div>'+
								'<div class="accordion text" id="accordionDetails">'+
								'  <div class="card">'+
								'    <div class="card-header" id="headingOne">'+
								'      <h5 class="mb-0">'+
								'        <a class="btn-link" type="button" data-toggle="collapse" data-target="#collapseOne" aria-expanded="false" aria-controls="collapseOne">'+
											i18n.__('ONLINE_STATS.DETAILS.TITLE')+
								'        </a>'+
								'      </h5>'+
								'    </div>'+
								'    <div id="collapseOne" class="collapse" aria-labelledby="headingOne" data-parent="#accordionDetails">'+
								'      <div class="card-body">'+

											'- ' + i18n.__('ONLINE_STATS.DETAILS.1') +  '</br>'+
											'- ' + i18n.__('ONLINE_STATS.DETAILS.2') +  '</br>'+
											'- ' + i18n.__('ONLINE_STATS.DETAILS.3') +  '</br>'+
											'- ' + i18n.__('ONLINE_STATS.DETAILS.4') +  '</br>'+
											'- ' + i18n.__('ONLINE_STATS.DETAILS.5') +  '</br></br>'+

								'       <p>' + i18n.__('ONLINE_STATS.DETAILS.OUTRO') + '</p>'+
								'      </div>'+
								'    </div>'+
								'  </div>'+
								'  </div>'+
								'        <div class="modal-message text">'+
								'       	<p>' + i18n.__('ONLINE_STATS.CHANGE') + '</p>'+
								'       	<p>' + i18n.__('ONLINE_STATS.QUESTION') + '</p>'+
								'       </div>'+
								'   	<div></div>'+
								'   	<div>'+
								'		   <button type="button" value="1" class="onlineStatsBtn btn btn-default btn-primary col-xs-6">'+
												i18n.__('YES')+
								' 			</button>'+
								'  			<button type="button" value="0" class="onlineStatsBtn btn btn-default col-xs-6">'+
													i18n.__('NO')+
								'   		</button>'+
								'		</div>'+
								'	</div>'+
								'</div>';
				$('body').append($(top + content + bottom));

				$('#onlineStatsModal .onlineStatsBtn').click((e) => {
					settings.Online.Stats = '' + $(e.target).attr('value');
					ajx('PUT', 'admin/settings', settings, function(data) {
						$('#onlineStatsModal').modal('hide');
					});
				});
			}
			$('#onlineStatsModal').modal('show');
		}
	};

	/*
	*	Build the modal pool from a kara list
	*	data  {Object} : list of karas going in the poll
	*	show {Boolean} : if modal is shown once built
	*/
	buildAndShowPoll = function(data, show, timer) {
		var karaNumber = data.length;
		var $pollModal = $('#pollModal');
		var $timer = $('#pollModal .timer');
		var randArray = Array.from(Array(15).keys());

		$('#nav-poll').empty();
		$.each(data, function(index, kara) {
			var randColor = '42';
			var drawIndex = Math.floor(randArray.length * Math.random());
			var drawn = randArray.splice(drawIndex, 1);
			if(drawn) var randColor = drawn * 24;

			var karaTitle = '';
			if (isSmall) {
				karaTitle = buildKaraTitle(kara, { 'mode' : 'doubleline'});
			} else {
				karaTitle = buildKaraTitle(kara);
			}
			$('#nav-poll').append('<div class="modal-message">'
							+	'	<button class="btn btn-default tour poll" value="' + kara.playlistcontent_id + '"'
							+	'	style="background-color:hsl(' + randColor + ', 20%, 26%)">'
							+	karaTitle
							+	'	</button>'
							+	'</div>');
		});

		if(show) {
			$pollModal.modal('show');
		}
		if(!timer) timer = settings.Karaoke.Poll.Timeout*1000;
		$timer.finish().width('100%').animate({ width : '0%' }, timer, 'linear');

	};
	buildPollFromApi = function() {
		ajx('GET', 'public/songpoll', {}, function(data) {
			buildAndShowPoll(data.poll, false, data.timeLeft);
		});
	}


	/*
	*	Manage memory of opened kara details
	*	idPlaylist {Int} : id of the playlist the details are opened/closed in
	*	idKara {Int} : id of the kara having his details opened
	*	command {Int} : command to execute, "add"/"remove" to add/remove to/from the list, nothing to just know if the details are opened
	*/
	saveDetailsKara = function(idPlaylist, idKara, command) {
		if(isNaN(idPlaylist) || isNaN(idKara)) return false;
		idPlaylist = parseInt(idPlaylist);
		idKara = idKara;
		if(saveLastDetailsKara[idPlaylist + 1000] == undefined) saveLastDetailsKara[idPlaylist + 1000] = [];
		if(command == 'add') {
			saveLastDetailsKara[idPlaylist + 1000].push(idKara);
		} else if(command == 'remove') {
			saveLastDetailsKara[idPlaylist + 1000].pop(idKara);
		} else {
			return (-1 != $.inArray(idKara, saveLastDetailsKara[idPlaylist + 1000]));
		}
	};

	formatPlaylist = function (playlist) {
		if (!playlist.id) return playlist.text;
		if (!$(playlist.element).data('flag_current')
			&& !$(playlist.element).data('flag_public')
			&& $(playlist.element).data('flag_visible'))  return playlist.text;

		var icon = '';
		if ($(playlist.element).data('flag_current')) {
			icon =  '<i class="glyphicon glyphicon-facetime-video"></i>';
		} else if ($(playlist.element).data('flag_public')) {
			icon = '<i class="glyphicon glyphicon-globe"></i>';
		}
		if (!$(playlist.element).data('flag_visible')) {
			icon +=  ' <i class="glyphicon glyphicon-eye-close"></i> ';
		}

		var $option = $('<span>' + icon + ' ' + playlist.text + '</span>');

		return $option;
	};

	formatTagsPlaylist = function (playlist) {
		if (!playlist.id) return playlist.text;

		count = '<k>' + playlist.karacount + '</k>';
		var $option = $('<span>' + count + ' ' + playlist.text + '</span>') ;

		return $option;
	};

	// Some html & stats init
	initApp = function() {

        if(webappMode === 1) {
            $('#restrictedHelpModal').modal('show');
        } 
		var locPlaylistRange = localStorage.getItem('playlistRange');
		var locSearchPlaylist1 = localStorage.getItem('search1');
		var locSearchPlaylist2 = localStorage.getItem('search2');
		var locScroll1 = localStorage.getItem('scroll1');
		var locScroll2 = localStorage.getItem('scroll2');

		if(locPlaylistRange) playlistRange = JSON.parse(locPlaylistRange);
		var searchVal1 = '', searchVal2 = '';
		if(locSearchPlaylist1 && locSearchPlaylist1 != 'undefined') searchVal1 = locSearchPlaylist1;
		if(locSearchPlaylist2 && locSearchPlaylist2 != 'undefined') searchVal2 = locSearchPlaylist2;

		$('#searchPlaylist1').val(searchVal1);
		$('#searchPlaylist2').val(searchVal2);


		setupAjax();

		showedLoginAfter401 = false;

		statsUpdating = $.ajax({ url: 'public/stats' }).done(function (data) {
			kmStats = data;
			if(scope === 'public') {
				$('#selectPlaylist1 > option[value=-1]')
					.data('karacount', kmStats.karas).attr('data-karacount', kmStats.karas);
			}
		});

		if(scope === 'admin' && logInfos.role === 'admin') {
			settingsUpdating = getSettings() ;
		} else if (scope === 'public') {
			settingsUpdating = getPublicSettings();

		} else {
			$(window).trigger('resize');
			$('.plSelect .select2').select2({ theme: 'bootstrap',
				templateResult: formatPlaylist,
				templateSelection : formatPlaylist,
				tags: false,
				minimumResultsForSearch: 3
			});
		}

		if(settingsUpdating) {
			settingsUpdating.done( function() {

				if(scope === 'public' && settings.Karaoke.Poll.Enabled) {
					ajx('GET', 'public/songpoll', {}, function(data) {
						$('.showPoll').toggleClass('hidden');
					});
				}
				settingsNotUpdated = ['Player.StayOnTop', 'Player.FullScreen'];
				playlistsUpdating = refreshPlaylistSelects();
				playlistsUpdating.done(function () {
					playlistContentUpdating = $.when.apply($, [fillPlaylist(1), fillPlaylist(2)]);
					refreshPlaylistDashboard(1);
					refreshPlaylistDashboard(2);
					playlistContentUpdating.done(() => {
						DEBUG && console.log(locScroll1, locScroll2);
						if(locScroll1) $('#playlist1').parent().scrollTop(locScroll1);
						if(locScroll2) $('#playlist2').parent().scrollTop(locScroll2);
					});
					$(window).trigger('resize');
				});
			});
		}
		if(!welcomeScreen) {
			if(logInfos.role != 'guest') {
				$('.pseudoChange').show();
				$('#searchParent').css('width','');
			} else {
				$('.pseudoChange').hide();
				$('#searchParent').css('width','100%');
			}

			if(!introManager || !introManager._currentStep) initSwitchs();

			$('.bootstrap-switch').promise().then(function(){
				$(this).each(function(){
					$(this).attr('title', $(this).find('input').attr('title'));
				});
			});

			tagsUpdating = $.ajax({ url: 'public/tags', }).done(function (data) {
				tags = data.content;
				var serie, year;

				var tagList = tagsTypesList.map(function(val, ind){
					if(val === 'DETAILS_SERIE') {
						return {id: 'serie', text: i18n.__(val)}
					} else if (val === 'DETAILS_YEAR') {
						return {id: 'year', text: i18n.__(val)}
					} else {
						return {id: val.replace('BLCTYPE_',''), text: i18n.__(val)}
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

					var series = data.content;
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
				// ['serie', 'year'].forEach(function(dataType) {
				// 	$.ajax({ url: 'public/' + dataType, }).done(function (data) {
				// 		data = data.content;

				// 		data = data.map(function(val, ind){
				// 			var jsonLine;
				// 			if(dataType === 'serie') jsonLine = {id:val.serie_id, text: val.i18n_name};
				// 			if(dataType === 'year') jsonLine = {id:val.year, text: val.year};
				// 			return jsonLine;
				// 		});
				// 		$('#' + dataType).select2({ theme: 'bootstrap',
				// 			tags: false,
				// 			minimumResultsForSearch: 3,
				// 			data: data
				// 		});
				// 		$('#' + dataType).parent().find('.select2-container').addClass('value');
				// 	});

				// });

			});


		}

	};

	$(window).resize(function () {
		isSmall = $(window).width() < 1025;
		var topHeight1 = $('#panel1 .panel-heading.container-fluid').outerHeight();
		var topHeight2 = $('#panel2 .panel-heading.container-fluid').outerHeight();

		resizeModal();

		if(!isTouchScreen) {
			$('#nav-profil,#nav-userlist, #nav-poll').perfectScrollbar();
			$('.playlistContainer, #manage > .panel').perfectScrollbar();
			$('#playlist1').parent().find('.ps__scrollbar-y-rail').css('transform', 'translateY(' + topHeight1 + 'px)');
			$('#playlist2').parent().find('.ps__scrollbar-y-rail').css('transform', 'translateY(' + topHeight2 + 'px)');
		}

		if(!isSmall) {
			$('#modalBox').find('.modal-dialog').removeClass('modal-sm').addClass('modal-md');
		} else {
			$('#modalBox').find('.modal-dialog').addClass('modal-sm').removeClass('modal-md');
		}
	});

	resizeModal = function() {
		$('#profilModal,#loginModal,#modalBox, #pollModal').each( (k, modal) => {
			var $modal = $(modal);
			var shrink =	parseFloat($modal.find('.modal-dialog').css('margin-top')) + parseFloat($modal.find('.modal-dialog').css('margin-bottom'))
						+	$modal.find('.modal-header').outerHeight() + ($modal.find('.modal-footer').length > 0 ? $modal.find('.modal-footer').outerHeight() : 0);
			$modal.find('.modal-body').css('max-height', $('body').height() - shrink - 15 + 'px');
		});

	};
	/**
    * Init bootstrapSwitchs
    */
	initSwitchs = function () {
		$('input[switch="onoff"],[name="Karaoke.Private"],[name="kara_panel"],[name="lyrics"],#settings input[type="checkbox"]').bootstrapSwitch('destroy', true);

		$('input[switch="onoff"]').bootstrapSwitch({
			wrapperClass: 'btn btn-default',
			'data-size': 'normal'
		});
		$('[name="Karaoke.Private"],[name="kara_panel"],[name="lyrics"]').bootstrapSwitch({
			'wrapperClass': 'btn',
			'data-size': 'large',
			'labelWidth': '15',
			'handleWidth': '59',
			'data-inverse': 'false'
		}).each((k,el) => {
			var $el = $(el);
			var $container = $(el).closest('.bootstrap-switch-container').find('.bootstrap-switch-handle-on');
			var introLabel = $(el).data('introlabel');
			var introStep  = $(el).data('introstep');
			if(introStep) {
				$container.attr('introLabel', introLabel).attr('introStep', introStep);
			}
		});


		/* init selects & switchs */
		if(scope === 'admin') {
			$('[name="kara_panel"]').on('switchChange.bootstrapSwitch', function (event, state) {
				if (state) {
					$('#playlist').show();
					$('#manage').hide();
				} else {
					$('#playlist').hide();
					$('#manage').show();
					if(introManager && introManager._currentStep) {
						introManager.nextStep();
					}
				}
			});

			$('#settings input[type="checkbox"], input[name="Karaoke.Private"]').on('switchChange.bootstrapSwitch', function () {
				setSettings($(this));
			});

		}

		/* set the right value for switchs */
		$('input[type="checkbox"],[switch="onoff"]').on('switchChange.bootstrapSwitch', function () {
			$(this).val($(this).is(':checked') ? '1' : '0');
		});

		$('input[action="command"][switch="onoff"]').on('switchChange.bootstrapSwitch', function () {
			var val = $(this).attr('nameCommand');
			if(!val) val =  $(this).attr('name');

			$.ajax({
				url: 'admin/player',
				type: 'PUT',
				data: { command: val }
			});
		}); 
	};

	login = function(username, password) {
		var deferred = $.Deferred();
		var url = 'auth/login';
		var data = { username: username, password: password};

		if(!username) {
			url = 'auth/login/guest';
			data = { fingerprint : password };
		} else if(scope === 'admin' && typeof appFirstRun != "undefined" && appFirstRun && username !== 'admin') {
		    url = 'admin/users/login';
		}

		$.ajax({
			url: url,
			type: 'POST',
			data: data })
			.done(function (response) {
				if(scope === 'admin' && response.role !== 'admin') {
					displayMessage('warning','', i18n.__('ADMIN_PLEASE'));
					return deferred.reject();
				}
				var token;
				$('#loginModal').modal('hide');
				$('#password, #login').removeClass('redBorders');

				createCookie('mugenToken',  response.token, -1);
				if(response.onlineToken) {
					createCookie('mugenTokenOnline',  response.onlineToken, -1);
				} else if (!username.includes('@')) {
					eraseCookie('mugenTokenOnline');
				}

				logInfos = response;
				displayMessage('info','', i18n.__('LOG_SUCCESS', logInfos.username));
				initApp();

				if(introManager && typeof introManager._currentStep !== 'undefined') {
					introManager.nextStep();
				} else if(isTouchScreen && !readCookie('mugenTouchscreenHelp')) {
					$('#helpModal').modal('show');
				}

				if (welcomeScreen) {
					logInfos = parseJwt(response.token);
					$('#wlcm_login > span').text(logInfos.username);
					$('#wlcm_disconnect').show();
				}

				deferred.resolve();
			}).fail(function(response) {
				$('#loginModal').modal('show');
				$('#password').val('').focus();
				$('#password, #login').addClass('redBorders');
			});
		return deferred;
	};

	$('#helpModal .confirm').click(function(){
		createCookie('mugenTouchscreenHelp', true, -1);
	});

	/* opposite sideber of playlist : 1 or 2 */
	non = function (side) {
		return 3 - parseInt(side);
	};

	getPlaylistRange = function(idPl) {

		var side = sideOfPlaylist(idPl);
		var search = $('#searchPlaylist' + side).val();
		var $filter = $('#searchMenu' + side + ' li.active');
		var searchType = $filter.attr('searchType');
		var searchValue = $filter.attr('searchValue');
		var key = [search, searchType, searchValue].join('_');

		if(!playlistRange[idPl]) playlistRange[idPl] = {};
		return playlistRange[idPl][key] ? playlistRange[idPl][key] : { from : 0, to : pageSize };
	};

	setPlaylistRange = function(idPl, from, to) {
		var side = sideOfPlaylist(idPl);
		var search = $('#searchPlaylist' + side).val();
		var $filter = $('#searchMenu' + side + ' li.active');
		var searchType = $filter.attr('searchType');
		var searchValue = $filter.attr('searchValue');
		var key = [search, searchType, searchValue].join('_');

		if(!playlistRange[idPl]) playlistRange[idPl] = {};
		playlistRange[idPl][key] = { from : from, to : to };
	};

	getPlData = function(idPl) {
		var idPlNorm = Math.min(0, idPl);
		var singlePlData = plData[idPlNorm] ? jQuery.extend({}, plData[idPlNorm]) : null;

		if(singlePlData) singlePlData.url = singlePlData.url.replace('pl_id', idPl);

		return singlePlData;
	};

	sideOfPlaylist = function(idPlaylist) {
		var side = $('.plSelect select option:selected[value="' + idPlaylist + '"]').parent().attr('side');
		return side;
	};

	addKaraPublic = function(idKara, doneCallback, failCallback) {

		$.ajax({ url: 'public/karas/' + idKara,
			type: 'POST',
			data: { requestedby : logInfos.username },
			complete: function() {
				var side = 2;
				if(sideOfPlaylist(playlistToAddId) == side) {
					playlistContentUpdating.done( function() {
						scrollToKara(side, idKara);
					});
				}
			}
		}).done(function() {
			var idSearchList = $('#searchPlaylist1').val();
			if(doneCallback) {
				if(idSearchList == 1) doneCallback();
				else  failCallback();
			}
		}).fail(function() {
			if(failCallback) failCallback();
		});
	};

	deleteKaraPublic = function(idPlaylistContent) {

		$.ajax({ url: scope + '/playlists/' + playlistToAdd + '/karas/' + idPlaylistContent,
			type: 'DELETE'
		});
	};

	manageOnlineUsersUI = function(data) {
		$('[name="modalLoginServ"]').val(data.Online.Users ? data.Online.Host : '');
		DEBUG && console.log(logInfos);

        settingsUpdating.done(function () {
			if(!settings.Online.Users || !data.Online.Users || logInfos.onlineToken || logInfos.role == 'guest') {
				$('.profileConvert').hide();
			} else {
				$('.profileConvert').show();
			}
			if(logInfos.onlineToken) {
				$('.profileDelete').show();
			} else {
			    $('.profileDelete').hide();
			}
			if(!data.Online.Users && (Object.keys(settings).length == 0 || settings.Online.Users) && logInfos.username.includes('@')) {
				setTimeout(function() {
					displayMessage('warning',i18n.__('LOG_OFFLINE.TITLE') + '<br/>', i18n.__('LOG_OFFLINE.MESSAGE'), 8000);
				}, 500);
			}
		});
	};

	/* socket part */

	if(!welcomeScreen) {
		socket.on('playerStatus', function(data){
			refreshPlayerInfos(data);
		});

		socket.on('newSongPoll', function(data){
			buildAndShowPoll(data, true);
			$('.showPoll').toggleClass('hidden');
		});
		socket.on('songPollEnded', function(data){
			$('#pollModal').modal('hide');
			$('.showPoll').toggleClass('hidden');

		});
		socket.on('songPollResult', function(data){
			displayMessage('success', '', i18n.__('POLLENDED', [data.kara.substring(0,100), data.votes]));
		});
		socket.on('settingsUpdated', function(){
			settingsUpdating.done(function () {
				settingsUpdating = scope === 'admin' ? getSettings() : getPublicSettings();
				settingsUpdating.done(function (){
					if(!($('#selectPlaylist' + 1).data('select2') && $('#selectPlaylist' + 1).data('select2').isOpen()
																		|| $('#selectPlaylist' + 2).data('select2') && $('#selectPlaylist' + 2).data('select2').isOpen() )) {
						playlistsUpdating.done(function() {
							playlistsUpdating = refreshPlaylistSelects();
						});

						playlistsUpdating.done(function () {
							refreshPlaylistDashboard(1);
							refreshPlaylistDashboard(2);

						});
					}
				});
			});
		});

		socket.on('playlistsUpdated', function(){

			if(!(($('#selectPlaylist2').data('select2') && $('#selectPlaylist2').data('select2').isOpen())
					|| ($('#selectPlaylist1').data('select2') && $('#selectPlaylist1').data('select2').isOpen()))) {
				playlistsUpdating = refreshPlaylistSelects();
			}
		});

		socket.on('playlistInfoUpdated', function(idPlaylist){
			if (idPlaylist) {
				if(!($('#selectPlaylist' + 1).data('select2') && $('#selectPlaylist' + 1).data('select2').isOpen()
																	|| $('#selectPlaylist' + 2).data('select2') && $('#selectPlaylist' + 2).data('select2').isOpen() )) {
					playlistsUpdating = refreshPlaylistSelects();

					var side = sideOfPlaylist(idPlaylist); DEBUG && console.log('b' +side);
					if (side) {
						playlistsUpdating.done(function () {
							refreshPlaylistDashboard(side);
						});
					}

				}
			}
		});

		socket.on('playingUpdated', function(data){
			var side = sideOfPlaylist(data.playlist_id);
			DEBUG && console.log(side, data.playlist_id);

			if(side) {
				var playlist = $('#playlist' + side);
				var container = playlist.parent();
				var previousCurrentlyPlaying = playlist.find('li[currentlyplaying], li[currentlyPlaying=""], li[currentlyPlaying="true"]');
				var newCurrentlyPlaying = playlist.find('li[idplaylistcontent="' + data.plc_id + '"]');

				if(previousCurrentlyPlaying.length > 0 && newCurrentlyPlaying.length > 0 && isVisible(previousCurrentlyPlaying, container)) {
					var posKaraMarker = previousCurrentlyPlaying.offset().top;
					var newPosKaraMarker = newCurrentlyPlaying.offset().top;
					container.finish().animate({scrollTop: container.scrollTop() + newPosKaraMarker - posKaraMarker}, 1000, 'swing');
				}
				if(previousCurrentlyPlaying.length > 0) {
					var prevCP = previousCurrentlyPlaying.get(0);
					prevCP.removeAttribute('currentlyPlaying');
					prevCP.setAttribute('dejavu', '');
					// trick for IE/Edge not redrawing layout
					var ul = previousCurrentlyPlaying.closest('ul');
					ul.css('height',  ul.height());
					ul.css('height', 'auto');
				}
				if(newCurrentlyPlaying.length > 0) {
					newCurrentlyPlaying.attr('currentlyplaying', '');
				}

				refreshPlaylistDashboard(side, true);
			}
		});

		socket.on('playlistContentsUpdated', function(idPlaylist){
			var side = sideOfPlaylist(idPlaylist);
			DEBUG && console.log(side, idPlaylist);
			if(side && $('#playlist' + side + '.lyricsKara:visible').length == 0) {
				playlistContentUpdating = fillPlaylist(side);
				refreshPlaylistDashboard(side, true);
			}
		});

		socket.on('favoritesUpdated', function(){
			var side = sideOfPlaylist(-5);
			if(side && $('#playlist' + side + '.lyricsKara:visible').length == 0) {
				playlistContentUpdating = fillPlaylist(side);
			}
		});

		socket.on('quotaAvailableUpdated', function(data){
			if (logInfos.username === data.username) {
				var quota = data.quotaLeft;

				var quotaString = '';
				if(data.quotaType == 1) {
					quotaString = data.quotaLeft;
				} else if (data.quotaType == 2) {
					quotaString = secondsTimeSpanToHMS(data.quotaLeft, 'ms');
				}
				if (data.quotaLeft == -1) {
					quotaString = '\u221e';
				}

				$('#plQuota').text(i18n.__('QUOTA')+' '+quotaString);
				DEBUG && console.log(data.username, data.quotaLeft, data.quotaType);
			}
		});

		socket.on('blacklistUpdated', function(){
			var idPlaylist = -2;
			var side = sideOfPlaylist(idPlaylist);

			if(side && $('#playlist' + side + '.lyricsKara:visible').length == 0) {
				playlistContentUpdating = fillPlaylist(side);
			}

			idPlaylist = -4;
			side = sideOfPlaylist(idPlaylist);
			if(side && $('#playlist' + side + '.lyricsKara:visible').length == 0) {
				playlistContentUpdating = fillPlaylist(side);
			}

		});

		socket.on('whitelistUpdated', function(idPlaylist){
			idPlaylist = -3;
			var side = sideOfPlaylist(idPlaylist);

			if(side && $('#playlist' + side + '.lyricsKara:visible').length == 0) {
				playlistContentUpdating = fillPlaylist(side);
			}
		});

		socket.on('adminMessage', function(data){
			if( scope === 'public') displayMessage('info', i18n.__('CL_INFORMATIVE_MESSAGE')  + ' <br/>', data.message, data.duration);
		});
	}

	socket.on('disconnect', function(){
		if($('.shutdown-popup').length == 0) {

			var $shutdownPopup =$(	'<div class="shutdown-popup"><div class="noise-wrapper" style="opacity: 1;"><div class="noise"></div>'
								+	'</div><div class="shutdown-popup-text">' + i18n.__('SHUTDOWN_POPUP') + '</div>' + closeButton + '</div>');

			$('body').prepend($shutdownPopup);
			$('.noise').css('background-image', "url('data:image/png;base64,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')");
			$('.noise').animate({
				opacity: 0.38 }, 30000)
		}
	});
	socket.on('connect', function(){
		if($('.shutdown-popup').length > 0) {
			$('.shutdown-popup > .closeParent').click();
		}
	})

	var onevent = socket.onevent;
	socket.onevent = function (packet) {
		var args = packet.data || [];
		onevent.call (this, packet);
		packet.data = ['*'].concat(args);
		onevent.call(this, packet);
	};

	socket.on('*', function(e, data) {
		true && SOCKETDEBUG && DEBUG && console.log(e, data);
	});
}));