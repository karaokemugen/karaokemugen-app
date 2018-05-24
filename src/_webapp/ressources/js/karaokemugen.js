var panel1Default;      // Int : default id of the playlist of the 1st panel (-1 means kara list)
var status;             // String : status of the player
var mode;               // String : way the kara list is constructed, atm "list" supported
var scope;              // String : way the kara list is constructed, atm "list" supported
var welcomeScreen;              // String : if we're in public or admin interface
var refreshTime;        // Int (ms) : time unit between every call
var stopUpdate;         // Boolean : allow to stop any automatic ajax update
var oldState;           // Object : last player state saved
var ajaxSearch, timer;  // 2 variables used to optimize the search, preventing a flood of search
var bcTags;             // Object : list of blacklist criterias tags
var showInfoMessage;	// Object : list of info codes to show as a toast
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
var scrollUpdating;
var playlistsUpdating;
var playlistContentUpdating;
var settingsUpdating;

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
var dragHandleHtml;
var playKaraHtml;

var listTypeBlc;
var plData;
var settingsNotUpdated;

(function (yourcode) {
	yourcode(window.jQuery, window, document);
}(function ($, window, document) {
	$(function () {

		initSwitchs();

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
				html : '',
				canTransferKara : true,
				canAddKara : true,
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
						//var args = res.args;
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
						// var args = res.responseJSON.args;
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
					//var code = softErrorMessage.indexOf(res.responseJSON.code) === -1 ? res.responseJSON.code + ' :' : '';
					displayMessage('warning', code, errMessage);
				}
			}
		});

		setupAjax = function () {
			$.ajaxSetup({
				cache: false,
				headers: { 'Authorization': logInfos.token }
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

		if(!welcomeScreen) {
			if(query.admpwd && scope === 'admin') { // app first run admin;
				login('admin', query.admpwd).done(() => {
					startIntro('admin');
					var privateMode = $('input[name="EnginePrivateMode"]');
					privateMode.val(1);
					setSettings(privateMode);
				});
			} else if(mugenToken) {
				logInfos = parseJwt(mugenToken);
				logInfos.token = mugenToken;
				if(scope === 'admin' && logInfos.role !== 'admin') {
					$('#loginModal').modal('show');
				} else {			
					initApp();
				}
			} else {
				$('#loginModal').modal('show');
			}
		} else if (mugenToken) { 
			logInfos = parseJwt(mugenToken);
			logInfos.token = mugenToken;
			initApp();
			$('#wlcm_login > span').text(logInfos.username);
			$('#wlcm_disconnect').show();
		} else {
			$('#wlcm_login > span').text(i18n.__('NOT_LOGGED'));
			$('#wlcm_disconnect').hide();
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

			} else {
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
						return a.kara_id;
					}).join();
					var urlPost = getPlData(idPlaylistTo).url;

					$.ajax({
						url: urlPost,
						type: 'POST',
						data: { kara_id : karaList, requestedby : logInfos.username }
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
			}
		});

		if(mode != 'mobile' && !isTouchScreen) {
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

		}

		makeFav = function(idKara, make, $el) {
			var type = make ? 'POST' : 'DELETE';
			$.ajax({
				url: 'public/favorites',
				type: type,
				data: { 'kara_id' : idKara } })
				.done(function (response) {
					if($el) {
						if(make) {
							$el.addClass('currentFav');
						} else {
							$el.removeClass('currentFav');
							if($('#panel1 .plDashboard').data('playlist_id') == -5) {
								fillPlaylist(1);
							}
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

			$.ajax({ url: 'public/karas/random?filter=' + filter }).done(function (data) {
				var chosenOne = data;
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
							//displayMessage('success', '', 'Kara ajouté à la playlist <i>' + playlistToAdd + '</i>.');
						});
					},'lucky');
				});
			});
		});
		$('.favorites').on('click', function() {
			var $this = $(this);
			var newOptionVal;
			$this.toggleClass('on');
			if($this.hasClass('on')) {
				newOptionVal = $('#selectPlaylist1 > option[data-flag_favorites=1]').val();
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
			var num_karas = dashboard.attr('karacount');
			var side = panel.attr('side');
			var playlist = $('#playlist' + side);

			if($this.attr('action') === 'goTo') {
				var from, scrollHeight;

				if($this.attr('value') === 'top') {
					from = 0;
				} else if ($this.attr('value') === 'bottom') {
					from =  Math.max(0, num_karas - pageSize);
				} else if ($this.attr('value') === 'playing') {
					from = -1;
				}
				playlist.parent().attr('flagScroll', true);
				setPlaylistRange(idPlaylist, from, from + pageSize);
				fillPlaylist(side, 'goTo', $this.attr('value'));
			}
		});

		// generic close button
		$('.playlist-main').on('click', '.closeParent', function () {
			var el = $(this);
			var container = el.closest('.alert');
			
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
			if(container.attr('flagScroll') == true || container.attr('flagScroll') == 'true' )  {
				//container.attr('flagScroll', false);
			} else {
				var playlist = container.find('ul').first();
				var side = playlist.attr('side');
				var dashboard = container.prev('.plDashboard');
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

		$('#profilModal,#loginModal,#modalBox').on('shown.bs.modal', function (e) {
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
			var username = $('#login').val();
			var password = $('#password').val();
			login(username, password);

		});
		$('#nav-login .guest').click( function() {
			new Fingerprint2( { excludeUserAgent: true }).get(function(result, components) {
				login('', result);
				// console.log(components);
			});
		});
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
			var username = $('#signupLogin').val();
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
						//displayMessage('info','', i18n.__('LOG_ERROR'));
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
							var users = [response.filter(a => a.flag_online==1)] //, response.filter(a => a.flag_online==0)];
							var $userlist = $('.userlist');
							var userlistStr = '';
							users.forEach( (userList) => {
								$.each(userList, function(i, k) {
									userlistStr +=
										'<li ' + dataToDataAttribute(k) + ' class="list-group-item' + (k.flag_online==1 ? ' online' : '') + '">'
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

		/* profil stuff END */
		/* prevent the virtual keyboard popup when on touchscreen by not focusing the search input */
		if(isTouchScreen) {
			$('select').on('select2:open', function() {
				$('.select2-search input').prop('focus', 0);
			});
			$('#progressBarColor').addClass('cssTransition');
		}

		$(window).trigger('resize');
	});
	//Will make a request to /locales/en.json and then cache the results
	i18n = new I18n({
		//these are the default values, you can omit
		directory: '/locales',
		locale: 'fr',
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

	pageSize = isTouchScreen ? 108 : 132;
	if (!isNaN(query.PAGELENGTH)) pageSize = parseInt(query.PAGELENGTH);

	saveLastDetailsKara = [[]];
	playlistRange = {};
	ajaxSearch = {}, timer;
	oldState = {};
	oldSearchVal = '';

	addKaraHtml = '<button name="addKara" class="btn btn-sm btn-action"></button>';
	deleteKaraHtml = '<button name="deleteKara" class="btn btn-sm btn-action"></button>';
	deleteCriteriaHtml = '<button name="deleteCriteria" class="btn btn-action deleteCriteria"></button>';
	transferKaraHtml = '<button name="transferKara" class="btn btn-sm btn-action"></button>';
	checkboxKaraHtml = '<span name="checkboxKara"></span>';
	infoKaraHtml = '<button name="infoKara" class="btn btn-sm btn-action"></button>';
	likeKaraHtml = '<button class="likeKara btn btn-sm btn-action"></button>';
	closeButton = '<button class="closeParent btn btn-action"></button>';
	closeButtonBottom = '<button class="closeParent bottom btn btn-action"></button>';
	closePopupButton = '<button class="closePopupParent btn btn-action"></button>';
	showFullTextButton = '<button class="fullLyrics ' + (isTouchScreen ? 'mobile' : '') + ' btn btn-action"></button>';
	showVideoButton = '<button class="showVideo ' + (isTouchScreen ? 'mobile' : '') + ' btn btn-action"></button>';
	makeFavButton = '<button class="makeFav ' + (isTouchScreen ? 'mobile' : '') + ' btn btn-action"></button>';
	dragHandleHtml =  '<span class="dragHandle"><i class="glyphicon glyphicon-option-vertical"></i></span>';
	playKaraHtml = '<button class="btn btn-sm btn-action playKara"></btn>';
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
		'BLCTYPE_8'];

	/* list of error code allowing an info popup message on screen */
	showInfoMessage = [
		'USER_CREATED',
		'PL_SONG_ADDED',
		'PL_SONG_DELETED',
		'PLAYLIST_MODE_SONG_ADDED',
		'FAV_IMPORTED'];

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


	if (isTouchScreen || scope == 'public') {

		/* tap on full lyrics */

		var elem = $('.playlist-main');
		var manager2 = new Hammer.Manager(elem[0],{
			prevent_default: false
		});
		var tapper = new Hammer.Tap();
		manager2.add(tapper);
		manager2.on('tap', function (e) {
			var $this = $(e.target).closest('.fullLyrics, .showVideo, .makeFav, .likeKara, [name="deleteKara"]');

			if($this.length > 0) {
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
			if(target.closest('.fullLyrics, .showVideo, .makeFav').length > 0
								|| target.closest('.actionDiv').length > 0
								|| target.closest('.infoDiv').length > 0
								|| target.closest('[name="checkboxKara"]').length > 0
								|| target.closest('li').length == 0 ) {
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
		options.url = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + '/api/v1/' + options.url;
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

		var range = getPlaylistRange(idPlaylist);
		from = range.from;
		to = range.to;

		fromTo += '&from=' + from + '&size=' + pageSize;

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
		canAddKara = scope === 'admin' ? canAddKara : $('#selectPlaylist' + side + ' > option:selected').data('flag_' + playlistToAdd) == '1';

		urlFiltre = url + '?filter=' + filter + fromTo;

		// ask for the kara list from given playlist
		if (ajaxSearch[url]) ajaxSearch[url].abort();
		//var start = window.performance.now();
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
							if (kara.language === null) kara.language = '';

							var karaDataAttributes = ' idKara="' + kara.kara_id + '" '
							+	(idPlaylist == -3 ? ' idwhitelist="' + kara.whitelist_id  + '"' : '')
							+	(idPlaylist > 0 || idPlaylist == -5 ? ' idplaylistcontent="' + kara.playlistcontent_id + '" pos="'
							+	kara.pos + '" data-username="' + kara.username + '"' : '')
							+	(kara.flag_playing ? 'currentlyPlaying' : '' ) + ' '
							+	(kara.flag_dejavu ? 'dejavu' : '' ) + ' '
							+	(kara.username == logInfos.username ? 'user' : '' );

							var badges = '';
							if(kara.misc) {
								kara.misc.split(',').forEach(function(tag) {
									badges += '<bdg title="' + i18n.__(tag) + '">'  + (i18n.__(tag + '_SHORT') ? i18n.__(tag + '_SHORT') : '?') + '</bdg>';
								});
							}
							if (mode === 'list') {
								var likeKara = likeKaraHtml;
								if (kara.flag_upvoted === 1) {
									likeKara = likeKaraHtml.replace('likeKara', 'likeKara currentLike');
								}

								htmlContent += '<li class="list-group-item" ' + karaDataAttributes + '>'
								//	+ 	(scope == 'public' && isTouchScreen ? '<slide></slide>' : '')
								+   (isTouchScreen && scope !== 'admin' ? '' : '<div class="actionDiv">' + html + dragHandle + '</div>')
								+   (scope == 'admin' ? checkboxKaraHtml : '')
								+   '<div class="infoDiv">'
								+   (scope === 'admin' || !isTouchScreen ? infoKaraHtml : '')
								+	(scope === 'admin' ? playKara : '')
								+	(scope !== 'admin' && dashboard.data('flag_public') == 1 ? likeKara : '')
								+	(scope !== 'admin' && kara.username == logInfos.username && (idPlaylist == playlistToAddId) ?  deleteKaraHtml : '')
								+	'</div>'
								+   '<div class="contentDiv">'
								+	'<div>' + buildKaraTitle(kara, {'search' : filter}) + '</div>'
								+	'<div>' + badges + '</div>'
								+   '</div>'
								+   (saveDetailsKara(idPlaylist, kara.kara_id) ? buildKaraDetails(kara, mode) : '')	// this line allows to keep the details opened on recreation
								+   '</li>';
							}
						}
					}
					var count = response.infos ? response.infos.count : 0;
					// creating filler space for dyanmic scrolling
					var fillerTopH = Math.min(response.infos.from * 34, container.height()/1.5);
					var fillerBottomH = Math.min((count - response.infos.from - pageSize) * 34, container.height()/1.5);

					var fillerTop = '<li class="list-group-item filler" style="height:' + fillerTopH + 'px"><div class="loader"><div></div></div></li>';
					var fillerBottom = '<li class="list-group-item filler" style="height:' + fillerBottomH + 'px"><div class="loader"><div></div></div></li>';

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
							var bcTagsFiltered = jQuery.grep(bcTags, function(obj) {
								return obj.tag_id == data[k].value;
							});
							var tagText = bcTagsFiltered.length === 1 && data[k].type > 0  && data[k].type < 100 ?  bcTagsFiltered[0].name_i18n : data[k].value;
							var textContent = data[k].type == 1001 ? buildKaraTitle(data[k].value[0]) : tagText;

							blacklistCriteriasHtml.find('li[type="' + data[k].type + '"]').after(
								'<li class="list-group-item liTag" blcriteria_id="' + data[k].blcriteria_id + '"> '
							+	'<div class="actionDiv">' + html + '</div>'
							+	'<div class="typeDiv">' + i18n.__('BLCTYPE_' + data[k].type) + '</div>'
							+	'<div class="contentDiv">' + textContent + '</div>'
							+	'</li>');
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
			if(playlistList[0] && (playlistList[0].flag_current == 1 || playlistList[0].flag_public == 1)) shiftCount++;
			if(playlistList[1] && (playlistList[1].flag_current == 1 || playlistList[1].flag_public == 1)) shiftCount++;
			if (scope === 'admin' || settings['EngineAllowViewWhitelist'] == 1)           playlistList.splice(shiftCount, 0, { 'playlist_id': -3, 'name': 'Whitelist', 'flag_visible' :  settings['EngineAllowViewWhitelist']});
			if (scope === 'admin' || settings['EngineAllowViewBlacklistCriterias'] == 1)  playlistList.splice(shiftCount, 0, { 'playlist_id': -4, 'name': 'Blacklist criterias', 'flag_visible' : settings['EngineAllowViewBlacklistCriterias']});
			if (scope === 'admin' || settings['EngineAllowViewBlacklist'] == 1)           playlistList.splice(shiftCount, 0, { 'playlist_id': -2, 'name': 'Blacklist', 'flag_visible' : settings['EngineAllowViewBlacklist'] });
			if (scope === 'admin')                                                        playlistList.splice(shiftCount, 0, { 'playlist_id': -1, 'name': 'Karas', 'num_karas' : kmStats.totalcount });

			var searchOptionListHtml = '<option value="-1" default data-playlist_id="-1"></option>';
			searchOptionListHtml += '<option value="-5" data-playlist_id="-5" data-flag_favorites="1"></option>';
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
						var currentPlaylistId = select2.find('option[data-flag_current="1"]').attr('value');
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
					minimumResultsForSearch: 3
				});

				if(!select2.val() && select2.length > 0) {
					select2[0].selectedIndex = 0;
				}
				deferred.resolve();
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
				if (option.data(e) == '1') dashboard.find('button[name="' + e + '"]').removeClass('btn-default').addClass('btn-primary');
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
					' ~ dur. ' + secondsTimeSpanToHMS(dashboard.data('length'), 'hm') + ' / re. ' + secondsTimeSpanToHMS(dashboard.data('time_left'), 'hm')
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
				//DEBUG && console.log("status : " + status + " enginestatus : " + data.status  + " playerStatus : " + data.playerStatus );
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
			if($('input[name="lyrics"]').is(':checked') || (mode == 'mobile' || webappMode == 1) && $('#switchInfoBar').hasClass('showLyrics')) {
				var text = data['subText'];
				/* if(oldState['subText'] != null && text != null && text.indexOf(oldState['subText']) > -1 && text != oldState['subText']) {
                    text.replace(oldState['subText'], "<span style='color:red;'>" + oldState['subText'] + "</span>");
                }*/
				if (text) text = text.indexOf('\n') == -1 ? text:  text.substring(0, text.indexOf('\n') );
				$('#karaInfo > span').html(text);
			}
			if (data.currentlyPlaying !== oldState.currentlyPlaying) {
				var barCss = $('#progressBarColor.cssTransform');
				barCss.removeClass('cssTransform');
				$('#progressBarColor').stop().css({transform : 'translateX(0)'});
				barCss.addClass('cssTransform');

				if( data.currentlyPlaying === -1 ) {
					$('#karaInfo').attr('idKara', data.currentlyPlaying);
					$('#karaInfo').attr('length', -1);
					$('#karaInfo > span').text( i18n.__('JINGLE_TIME') );
					$('#karaInfo > span').data('text',i18n.__('JINGLE_TIME') );

				} else if ( data.currentlyPlaying > 0 ) {
					$.ajax({ url: 'public/karas/' + data.currentlyPlaying }).done(function (dataKara) {
						var kara = dataKara[0];
						$('#karaInfo').attr('idKara', kara.kara_id);
						$('#karaInfo').attr('length', kara.duration);
						$('#karaInfo > span').text( buildKaraTitle(kara) );
						$('#karaInfo > span').data('text', buildKaraTitle(kara) );
						
						if(webappMode === 1) {
							buildKaraDetails(kara, 'karaCard');
						}
					});
				} else {
					console.log('ER: currentlyPlaying is bogus : ' + data.currentlyPlaying);
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
				$('input[name="PlayerStayOnTop"]').bootstrapSwitch('state', data.onTop, true);
				//if(scope === 'admin') setSettings($('input[name="PlayerStayOnTop"]'));
			}
			if (data.fullscreen != oldState.fullscreen) {
				$('input[name="PlayerFullscreen"]').bootstrapSwitch('state', data.fullscreen, true);
				//if(scope === 'admin') setSettings($('input[name="PlayerFullscreen"]'));
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
		if (typeof options == 'undefined') {
			options = {};
		}

		if(data.language && data.language.indexOf('mul') > -1) {
			data.language = 'mul';
		} else if (!data.language) {
			data.language = '';
		}
		var titleText = 'fillerTitle';
		if (options.mode && options.mode === 'doubleline') {
			var titleArray = $.grep([data.language.toUpperCase(), data.serie ? data.serie : data.singer.replace(/,/g, ', '),
				data.songtype_i18n_short + (data.songorder > 0 ? ' ' + data.songorder : '')], Boolean);
			var titleClean = Object.keys(titleArray).map(function (k) {
				return titleArray[k] ? titleArray[k] : '';
			});
			titleText = titleClean.join(' - ') + '<br/>' + data.title;
			
		} else {
			var titleArray = $.grep([data.language.toUpperCase(), data.serie ? data.serie : data.singer.replace(/,/g, ', '),
				data.songtype_i18n_short + (data.songorder > 0 ? ' ' + data.songorder : ''), data.title], Boolean);
			var titleClean = Object.keys(titleArray).map(function (k) {
				return titleArray[k] ? titleArray[k] : '';
			});
			titleText = titleClean.join(' - ');
		}
		
	
		if(options.search) {
			var search_regexp = new RegExp('(' + options.search + ')', 'gi');
			titleText = titleText.replace(search_regexp,'<h>$1</h>');
		}
		return titleText;
	};

	toggleDetailsKara = function (el) {
		var liKara = el.closest('li');
		var idKara = parseInt(liKara.attr('idkara'));
		var idPlc = parseInt(liKara.attr('idplaylistcontent'));
		var idPlaylist = parseInt( el.closest('.panel').find('.plDashboard').data('playlist_id'));
		var infoKara = liKara.find('.detailsKara');

		if(!liKara.hasClass('loading')) { // if we're already loading the div, don't do anything
			if (!infoKara.is(':visible') ) { // || infoKara.length == 0
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

		var lastPlayed = data['lastplayed_at'];
		var lastPlayedStr = '';
		if(lastPlayed) {
			lastPlayed = 1000 * lastPlayed;
			var difference = (todayDate - lastPlayed)/1000;
			if(difference < 60 * 60 * 24) { // more than 24h ago
				lastPlayedStr = i18n.__('DETAILS_LAST_PLAYED_2', '<span class="time">' + secondsTimeSpanToHMS(difference, 'hm') + '</span>');
			} else {
				lastPlayedStr = '<span class="time">' + new Date(lastPlayed).toLocaleDateString() + '</span>';
			}
		}
		var details = {
			'DETAILS_ADDED': 		(data['date_add'] ? i18n.__('DETAILS_ADDED_2', data['date_add']) : '') + (data['pseudo_add'] ? i18n.__('DETAILS_ADDED_3', data['pseudo_add']) : '')
			, 'DETAILS_PLAYING_IN': data['time_before_play'] ? i18n.__('DETAILS_PLAYING_IN_2', ['<span class="time">' + beforePlayTime + '</span>', playTimeDate]) : ''
			, 'DETAILS_LAST_PLAYED': lastPlayed ? lastPlayedStr : ''
			, 'BLCTYPE_6': 			data['author']
			, 'DETAILS_VIEWS':		data['viewcount']
			, 'BLCTYPE_4':				data['creator']
			, 'DETAILS_DURATION':	data['duration'] == 0 || isNaN(data['duration']) ? null : ~~(data['duration'] / 60) + ':' + (data['duration'] % 60 < 10 ? '0' : '') + data['duration'] % 60
			, 'DETAILS_LANGUAGE':	data['language_i18n']
			, 'BLCTYPE_7':				data['misc_i18n']
			, 'DETAILS_SERIE':		data['serie']
			, 'DETAILS_SERIE_ALT':	data['serie_altname']
			, 'BLCTYPE_2':				data['singer']
			, 'DETAILS_TYPE ':		data['songtype_i18n'] + data['songorder'] > 0 ? ' ' + data['songorder'] : ''
			, 'DETAILS_YEAR':		data['year']
			, 'BLCTYPE_8':				data['songwriter']
		};
		var htmlDetails = Object.keys(details).map(function (k) {
			if(details[k]) {
				var detailsLine = details[k].toString().replace(/,/g, ', ');
				return '<tr><td>' + i18n.__(k) + '</td><td>' + detailsLine + '</td><tr/>';
			} else return '';
		});
		var htmlTable = '<table>' + htmlDetails.join('') + '</table>';
		var infoKaraTemp = 'no mode specified';
		var makeFavButtonAdapt = data['flag_favorites'] ? makeFavButton.replace('makeFav','makeFav currentFav') : makeFavButton;

		if (htmlMode == 'list') {
			infoKaraTemp = '<div class="detailsKara alert alert-info">'
				+ '<div class="topRightButtons">'
				+ (isTouchScreen ? '' : closeButton)
				+ makeFavButtonAdapt
				+ showFullTextButton
				+ (data['previewfile'] ? showVideoButton : '')
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
			$.ajax({ url: 'public/karas/' + data.kara_id + '/lyrics' }).done(function (data) {
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

	/*
	*	Build the modal pool from a kara list
	*	data  {Object} : list of karas going in the poll
	*	show {Boolean} : if modal is shown once built
	*/
	buildAndShowPoll = function(data, show) {
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
			$timer.width('100%').finish().animate({ width : '0%' }, settings.EngineSongPollTimeout*1000);
		}

	};
	buildPollFromApi = function() {
		ajx('GET', 'public/songpoll', {}, function(data) {
			buildAndShowPoll(data, false);
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
		idKara = parseInt(idKara);
		if(saveLastDetailsKara[idPlaylist + 1000] == undefined) saveLastDetailsKara[idPlaylist + 1000] = [];
		if(command == 'add') {
			saveLastDetailsKara[idPlaylist + 1000].push(idKara);
		} else if(command == 'remove') {
			saveLastDetailsKara[idPlaylist + 1000].pop(idKara);
		} else {
		//DEBUG && console.log("ah",(-1 != $.inArray(idKara, saveLastDetailsKara[idPlaylist + 1000])));
			return (-1 != $.inArray(idKara, saveLastDetailsKara[idPlaylist + 1000]));
		}
	};

	formatPlaylist = function (playlist) {
		if (!playlist.id) return playlist.text;
		if (!$(playlist.element).data('flag_current') == '1'
			&& !$(playlist.element).data('flag_public') == '1'
			&& !$(playlist.element).data('flag_visible') == '0')  return playlist.text;

		var icon = '';
		if ($(playlist.element).data('flag_current') == '1') {
			icon =  '<i class="glyphicon glyphicon-facetime-video"></i>';
		} else if ($(playlist.element).data('flag_public') == '1') {
			icon = '<i class="glyphicon glyphicon-globe"></i>';
		}
		if ($(playlist.element).data('flag_visible') == '0') {
			icon +=  ' <i class="glyphicon glyphicon-eye-close"></i> ';
		}

		var $option = $('<span>' + icon + ' ' + playlist.text + '</span>');

		return $option;
	};

	// Some html & stats init
	initApp = function() {

		setupAjax();

		showedLoginAfter401 = false;

		$.ajax({ url: 'public/stats' }).done(function (data) {
			kmStats = data;
			if(scope === 'public') {
				$('#selectPlaylist1 > option[value=-1]')
					.data('num_karas', kmStats.totalcount).attr('data-num_karas', kmStats.totalcount);
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
				if(scope === 'public' && settings.EngineSongPoll) {
					buildPollFromApi();
					$('.showPoll').show();
				}
				settingsNotUpdated = ['PlayerStayOnTop', 'PlayerFullscreen'];
				playlistsUpdating = refreshPlaylistSelects();
				playlistsUpdating.done(function () {
					playlistContentUpdating = $.when.apply($, [fillPlaylist(1), fillPlaylist(2)]);
					refreshPlaylistDashboard(1);
					refreshPlaylistDashboard(2);
	
					$(window).trigger('resize');
				});
			});
		}
		
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

		$.ajax({ url: 'public/tags', }).done(function (data) {
			bcTags = data;
		});
	};

	$(window).resize(function () {
		//  initSwitchs();
		isSmall = $(window).width() < 1025;
		var topHeight1 = $('#panel1 .panel-heading.container-fluid').outerHeight();
		var topHeight2 = $('#panel2 .panel-heading.container-fluid').outerHeight();
		$('#playlist1').parent().css('height', 'calc(100% - ' + (scope === 'public' ? 0 : topHeight1) + 'px ');
		$('#playlist2').parent().css('height', 'calc(100% - ' + topHeight2 + 'px  ');

		resizeModal();

		if(!isTouchScreen) {
			$('#nav-profil,#nav-userlist').perfectScrollbar();
			$('.playlistContainer, #manage > .panel').perfectScrollbar();
			$('#playlist1').parent().find('.ps__scrollbar-y-rail').css('transform', 'translateY(' + topHeight1 + 'px)');
			$('#playlist2').parent().find('.ps__scrollbar-y-rail').css('transform', 'translateY(' + topHeight2 + 'px)');
		}
	});

	resizeModal = function() {
		$('#profilModal,#loginModal,#modalBox').each( (k, modal) => {
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
		$('input[switch="onoff"],[name="EnginePrivateMode"],[name="kara_panel"],[name="lyrics"],#settings input[type="checkbox"]').bootstrapSwitch('destroy', true);

		$('input[switch="onoff"]').bootstrapSwitch({
			wrapperClass: 'btn btn-default',
			'data-size': 'normal'
		});
		$('[name="EnginePrivateMode"],[name="kara_panel"],[name="lyrics"]').bootstrapSwitch({
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
			
			$('#settings input[type="checkbox"], input[name="EnginePrivateMode"]').on('switchChange.bootstrapSwitch', function () {
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
			}).done(function () {
				// refreshPlayerInfos();
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
		}
		$.ajax({
			url: url,
			type: 'POST',
			data: data })
			.done(function (response) {

				$('#loginModal').modal('hide');
				$('#password, #login').removeClass('redBorders');
				createCookie('mugenToken', response.token, -1);
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
				//displayMessage('info','', i18n.__('LOG_ERROR'));
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
		var search = $('#searchPlaylist' + sideOfPlaylist(idPl)).val();

		if(!playlistRange[idPl]) playlistRange[idPl] = {};
		return playlistRange[idPl][search] ? playlistRange[idPl][search] : { from : 0, to : pageSize };
	};

	setPlaylistRange = function(idPl, from, to) {
		var search = $('#searchPlaylist' + sideOfPlaylist(idPl)).val();
		if(!playlistRange[idPl]) playlistRange[idPl] = {};
		playlistRange[idPl][search] = { from : from, to : to };
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
		//var karaName = $('li[idkara="' + idKara + '"]').first().find('.contentDiv').text();

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
			//displayMessage('success', '"' + (karaName ? karaName : 'kara') + '"', ' ajouté à la playlist <i>' + playlistToAddName + '</i>');
		}).fail(function() {
			if(failCallback) failCallback();
		});
	};

	deleteKaraPublic = function(idPlaylistContent) {
		
		$.ajax({ url: scope + '/playlists/' + playlistToAdd + '/karas/' + idPlaylistContent,
			type: 'DELETE'
		}).done(function() {
	
			//displayMessage('success', '"' + (karaName ? karaName : 'kara') + '"', ' ajouté à la playlist <i>' + playlistToAddName + '</i>');
		});
	};

	if(!welcomeScreen) {
		/* partie socket */
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