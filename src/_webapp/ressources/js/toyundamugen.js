var panel1Default;      // Int : default id of the playlist of the 1st panel (-1 means kara list)
var status;             // String : status of the player
var mode;               // String : way the kara list is constructed, atm "list" supported
var scope;              // String : if we're in public or admin interface
var refreshTime;        // Int (ms) : time unit between every call
var stopUpdate;         // Boolean : allow to stop any automatic ajax update
var oldState;           // Object : last player state saved
var ajaxSearch, timer;  // 2 variables used to optimize the search, preventing a flood of search
var pseudo;             // String : pseudo of the user
var bcTags;             // Object : list of blacklist criterias tags

var DEBUG;
var SOCKETDEBUG;

var dragAndDrop;        // Boolean : allowing drag&drop
var karaParPage;        // Int : number of karas disaplyed per "page" (per chunk)
var saveLastDetailsKara;    // Matrice saving the differents opened kara details to display them again when needed
var playlistToAdd;          // Int : id of playlist users are adding their kara to

var socket;
var settings;
var kmStats;

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
var closeButton;
var closeButtonBottom;
var showFullTextButton;
var dragHandleHtml;
var playKaraHtml;

var tabTradToDelete;
var tagAcrList;
var plData;

(function (yourcode) {
	yourcode(window.jQuery, window, document);
}(function ($, window, document) {
	$(function () {
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
			error: function (jqXHR, textStatus, errorThrown) {
				DEBUG && console.log(jqXHR.status + '  - ' + textStatus + '  - ' + errorThrown + ' : ' + jqXHR.responseText);
				if(jqXHR.status != 0) {
					displayMessage('warning','Error', jqXHR.responseText);
				}
			}
		});

		// Some html init

		$.ajax({ url: 'public/stats' }).done(function (data) {
			kmStats = data;
			if(scope === "public") {
				$('#selectPlaylist1 > option[value=-1]')
					.data('num_karas', kmStats.totalcount).attr('data-num_karas', kmStats.totalcount);
			}
		});

		settingsUpdating = scope ===  'admin' ?  getSettings() : getPublicSettings();
        
		settingsUpdating.done( function() {
			playlistsUpdating = refreshPlaylistSelects();
			playlistsUpdating.done(function () {
				playlistContentUpdating = $.when.apply($, [fillPlaylist(1), fillPlaylist(2)]);
				refreshPlaylistDashboard(1);
				refreshPlaylistDashboard(2);
                
				$(window).trigger('resize');
			});
		});

		initSwitchs();
		$('.bootstrap-switch').promise().then(function(){
			$(this).each(function(){
				$(this).attr('title', $(this).find('input').attr('title'));
			});
		});
        
		// Méthode standard on attend 100ms après que la personne ait arrêté d'écrire, on abort toute requete de recherche en cours, et on lance la recherche
		$('#searchPlaylist1, #searchPlaylist2').on('input', function () {
			var side = $(this).attr('side');

			clearTimeout(timer);
			timer = setTimeout(function () {
				fillPlaylist(side);
			}, 100);
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
					createCookie('plVal' + side, val, 365);
    
					$('#playlist' + side).empty();
					$('#searchPlaylist' + side).val('');
    
					playlistContentUpdating = fillPlaylist(side);
					refreshPlaylistDashboard(side);
				}
			}
          
		});
		
		$('body[scope="public"] .playlist-main').on('click', '.actionDiv > button[name="addKara"]', function() {
			var idKara = $(this).closest('li').attr('idkara');
			addKaraPublic(idKara);
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
				$.ajax({ url: url }).done(function (response) {
					var data = response.content;
					displayMessage('info', 'Info', 'Ajout de ' + response.infos.count + ' karas à la playlist ' + $('#panel' + non(side) + ' .plDashboard').data('name'));
					var karaList = data.map(function(a) {
						return a.kara_id;
					}).join();
					var urlPost = getPlData(idPlaylistTo).url;
                   
					$.ajax({
						url: urlPost,
						type: 'POST',
						data: { kara_id : karaList, requestedby : pseudo }
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
				}
				$.ajax({ url: 'public/karas/' + idKara + '/lyrics' }).done(function (data) {
					liKara.find('.lyricsKaraLoad').html(data.join('<br/>'));
					scrollToElement(playlist.parent(), detailsKara,  liKara.find('.lyricsKara'));
				});
			});
		}

		// pick a random kara & add it after (not) asking user's confirmation
		$('.getLucky').on('click', function () {
			var filter = $('#searchPlaylist' + 1).val();
            
			$.ajax({ url: 'public/karas/random?filter=' + filter }).done(function (data) {
				var chosenOne = data;
				$.ajax({ url: 'public/karas/' + chosenOne }).done(function (data) {
					data = data[0];
					displayModal('confirm','Félicitations','Vous allez ajouter <i>' + buildKaraTitle(data)
						+ (pseudo ? '</i> sous le pseudo <b>' + pseudo : '</b>') + '.', function(){
						$.ajax({
							url: 'public/karas/' + chosenOne,
							type: 'POST',
							data: { requestedby : pseudo }
						}).done(function () {
							playlistContentUpdating.done( function() {
								scrollToKara(2, chosenOne); 
							});
							displayMessage('success', '', 'Kara ajouté à la playlist <i>' + playlistToAdd + '</i>.');
						});
					},'lucky');
				});
			});
		});

		// generic close button
		$('.playlist-main').on('click', '.closeParent', function () {
			var el = $(this);
			el.parent().fadeOut(animTime, function(){
				el.parent().remove();
			});
		});

		/* set the right value for switchs */
		$('input[type="checkbox"],[switch="onoff"]').on('switchChange.bootstrapSwitch', function () {
			$(this).val($(this).is(':checked') ? 1 : 0);
		});
     
        
		/* handling dynamic loading */
		$('.playlistContainer').scroll(function() {
			var container = $(this);
			if(container.attr('flagScroll') == true || container.attr('flagScroll') == "true" )  { 
				//container.attr('flagScroll', false);
			} else {
				var playlist = container.find('ul').first();
				var side = playlist.attr('side');
				var dashboard = container.prev('.plDashboard');
				var idPlaylist = dashboard.find('select').val();
				var from =  getPlaylistRange(idPlaylist).from;
				var to = getPlaylistRange(idPlaylist).to;
				var nbKaraInPlaylist = parseInt(dashboard.parent().find('.plInfos').data('to')) - parseInt(dashboard.parent().find('.plInfos').data('from'));
				var shift = 2 * parseInt(karaParPage/10);
				var fillerBottom = playlist.find('.filler').last();
				var fillerTop = playlist.find('.filler').first();
				
				if (fillerTop.length > 0 && fillerBottom.length > 0) {
					var scrollDown = container.offset().top + container.innerHeight() >= fillerBottom.offset().top && nbKaraInPlaylist >= karaParPage * 2;
					var scrollUp = fillerTop.offset().top + fillerTop.innerHeight() > container.offset().top + 10 && from > 0;
				
					DEBUG && console.log(scrollUpdating, (!scrollUpdating || scrollUpdating.state() == 'resolved') , scrollDown, scrollUp);
					if (  (!scrollUpdating || scrollUpdating.state() == 'resolved')  && (scrollDown || scrollUp)) {


						container.attr('flagScroll', true);

						if(scrollDown) {
							from += karaParPage + shift;
							to = from + karaParPage * 2;
						} else if( scrollUp ) {
							from = Math.max(0, from - karaParPage - shift);
							to = from + karaParPage * 2;
						}
						
						DEBUG && console.log('Affichage des karas de ' + from + ' à ' + to);
						
						setPlaylistRange(idPlaylist, from, to);
						scrollUpdating = fillPlaylist(side, scrollUp ? "top" : "bottom");
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

		$.ajax({ url: 'public/tags', }).done(function (data) {
			bcTags = data;
		});
		/* prevent the virtual keyboard popup when on touchscreen by not focusing the search input */
		if(isTouchScreen) {
			$('select').on('select2:open', function() {
				$('.select2-search input').prop('focus', 0);
			});
			$('#progressBarColor').addClass('cssTransition');
		}
        
		$(window).trigger('resize');
	});

	socket = io( window.location.protocol + '//' + window.location.hostname + ':1340');
    
	isTouchScreen =  'ontouchstart' in document.documentElement || query.TOUCHSCREEN != undefined;
	if(isTouchScreen) $('body').addClass('touch');
	isSmall = $(window).width() < 1025;
	animTime = isSmall ? 200 : 300;
	refreshTime = 1000;
	mode = 'list';
	pseudo = 'Anonymous';

	DEBUG =  query.DEBUG != undefined;
	SOCKETDEBUG =  query.SOCKETDEBUG != undefined;
	dragAndDrop = true;
	stopUpdate = false;
    
	karaParPage = isTouchScreen ? 54 : 60;
	if (!isNaN(query.PAGELENGTH)) karaParPage = parseInt(query.PAGELENGTH);
	
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
	closeButton = '<button class="closeParent btn btn-action"></button>';
	closeButtonBottom = '<button class="closeParent bottom btn btn-action"></button>';
	closePopupButton = '<button class="closePopupParent btn btn-action"></button>';
	showFullTextButton = '<button class="fullLyrics ' + (isTouchScreen ? 'mobile' : '') + ' btn btn-action"></button>';
	dragHandleHtml =  '<span class="dragHandle"><i class="glyphicon glyphicon-option-vertical"></i></span>';
	playKaraHtml = '<button class="btn btn-sm btn-action playKara"></btn>';
	buttonHtmlPublic = '';

	tabTradToDelete = {
		'TYPE_1002' : 'Plus long que (sec)',
		'TYPE_1003' : 'Plus court que (sec)',
		'TYPE_1000' : 'Titre contenant',
		'TYPE_0'    : 'Tags',
		'TYPE_2'    : 'Chanteur',
		'TYPE_3'    : 'Type',
		'TYPE_4'    : 'Créateur',
		'TYPE_5'    : 'Language',
		'TYPE_6'    : 'Auteur du kara',
		'TYPE_7'    : 'Divers',
		'TYPE_8'    : 'Compositeur',
		'TYPE_1001' : 'Kara'
	};
	tagAcrList = {  'TAG_SPECIAL': 'SPE',
		'TAG_GAMECUBE': 'GCN',
		'TAG_TOKU': 'TKU',
		'TAG_OVA': 'OVA',
		'TAG_CONCERT': 'CON',
		'TAG_PARODY': 'PAR',
		'TAG_HUMOR': 'HUM',
		'TAG_ANIME': 'ANI',
		'TAG_MECHA': 'MCH',
		'TAG_REAL': 'IRL',
		'TAG_VIDEOGAME': 'VG',
		'TAG_MOVIE': 'MOV',
		'TAG_TVSHOW': 'TV',
		'TAG_SPOIL': 'SPL',
		'TAG_LONG': 'LON',
		'TAG_PS2': 'PS2',
		'TAG_PS3': 'PS3',
		'TAG_PSV': 'PSV',
		'TAG_PSX': 'PSX',
		'TAG_PSP': 'PSP',
		'TAG_R18': 'R18',
		'TAG_VOCALOID': 'VCA',
		'TAG_XBOX360': 'XBX',
		'TAG_PC': 'PC',
		'TAG_SEGACD': 'SCD',
		'TAG_REMIX': 'RMX',
		'TAG_VOICELESS': 'NOV',
		'TAG_ROMANCE': 'ROM' };
    

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
			$this = $(e.target).closest('.fullLyrics');
            
			if($this.length > 0) {
				e.preventDefault();
            
				var liKara = $this.closest('li');
				var idKara = liKara.attr('idkara');
        
				$.ajax({ url: 'public/karas/' + idKara + '/lyrics' }).done(function (data) {
					if (mode == 'mobile') {
						$('#lyricsModalText').html(data.join('<br/>'));
						$('#lyricsModal').modal('open');
					} else {
						displayModal('alert','Lyrics', '<center>' + data.join('<br/>') + '</center');
					}
				});
			}
		});
    
		manager2.on('tap click', function (e) {
			e.gesture = e;
			var target = $(e.gesture.target);
			if(target.closest('.fullLyrics').length > 0
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
		options.url = window.location.protocol + '//' + window.location.hostname + ':1339/api/v1/' + options.url;
	});

	/**
     * Fill a playlist on screen with karas
     * @param {1, 2} side - which playlist on the screen
     * @param {'top','bottom'} scrollTo (optional) - filling the playlist after  a scroll, allow to keep the scroll position on the same data
     */
	// TODO if list is updated from another source (socket ?) keep the size of the playlist
	fillPlaylist = function (side, scrollTo) {
		DEBUG && console.log(side);
		var deferred = $.Deferred();
		var dashboard = $('#panel' + side + ' .plDashboard');
		var container = $('#panel' + side + ' .playlistContainer');
		var idPlaylist = parseInt($('#selectPlaylist' + side).val());
		var filter = $('#searchPlaylist' + side).val();
		var fromTo = '';
		var url, html, canTransferKara, canAddKara, dragHandle, playKara;

		var range = getPlaylistRange(idPlaylist);
		from = range.from;
		to = range.to;

		fromTo += '&from=' + from + '&to=' + to;

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
		ajaxSearch[url] = $.ajax({  url: urlFiltre,
			type: 'GET',
			dataType: 'json' })
			.done(function (response) {
				var data = response.content;
				dashboard.attr('data-karaCount', response.infos.count);
				//DEBUG && console.log(urlFiltre + " : " + data.length + " résultats");
				//var end = window.performance.now();
				//alert(end - start);
				var htmlContent = '';
            
				if(idPlaylist != -4) {
					for (var key in data) {
						// build the kara line
						if (data.hasOwnProperty(key)) {
							var kara = data[key];
							if (kara.language === null) kara.language = '';
                            
							var karaDataAttributes = ' idKara="' + kara.kara_id + '" '
							+	(idPlaylist == -3 ? ' idwhitelist="' + kara.whitelist_id  + '"' : '')
							+	(idPlaylist > 0 ? ' idplaylistcontent="' + kara.playlistcontent_id + '" pos="'
							+	kara.pos + '" data-pseudo_add="' + kara.pseudo_add + '"' : '')
							+	(kara.flag_playing ? 'currentlyPlaying' : '' ) + ' '
							+	(kara.pseudo_add == pseudo ? 'user' : '' );

							var badges = '';
							if(kara.misc) {
								kara.misc.split(',').forEach(function(tag) {
									badges += '<bdg>'  + tagAcrList[tag] + '</bdg>';
								});
							}
							if (mode === 'list') {
								htmlContent += '<li class="list-group-item" ' + karaDataAttributes + '>'
								//	+ 	(scope == 'public' && isTouchScreen ? '<slide></slide>' : '')
								+   (isTouchScreen && scope !== 'admin' ? '' : '<div class="actionDiv">' + html + dragHandle + '</div>')
								+   (scope == 'admin' ? checkboxKaraHtml : '')
								+   (isTouchScreen && scope !== 'admin' ? '' : '<div class="infoDiv">'
								+   (isTouchScreen ? '' : infoKaraHtml) + playKara + '</div>')
								+   '<div class="contentDiv"">' + buildKaraTitle(kara, filter)
								+	badges
								+   '</div>'
								+   (saveDetailsKara(idPlaylist, kara.kara_id) ? buildKaraDetails(kara, mode) : '')
								+   '</li>'; 
							}
						}
					}

					// creating filler space for dyanmic scrolling
					var fillerTopH = Math.min(from * 34, container.height()/1.5);
					var fillerBottomH = Math.min((response.infos.count - to) * 34, container.height()/1.5);
					
					var fillerTop = '<li class="list-group-item filler" style="height:' + fillerTopH + 'px"><div class="loader"><div></div></div></li>';
					var fillerBottom = '<li class="list-group-item filler" style="height:' + fillerBottomH + 'px"><div class="loader"><div></div></div></li>';
					
					htmlContent =	fillerTop
								+	htmlContent
								+	fillerBottom;
					

					if(scrollTo) {
						container.css('overflow-y','hidden');
						var karaMarker = scrollTo === "top" ? container.find('li[idkara]').first() : container.find('li[idkara]').last();
						var posKaraMarker = karaMarker.offset() ? karaMarker.offset().top : -1;
					}
		
					window.requestAnimationFrame( function() {
						document.getElementById('playlist' + side).innerHTML = htmlContent;
						deferred.resolve();
						refreshContentInfos(side);
						//window.requestAnimationFrame( function() {
						if(scrollTo) {
							
							container.css('overflow-y','auto');
							var newkaraMarker = container.find('li[idkara="' + karaMarker.attr('idkara') + '"]');
							var newPosKaraMarker = (newkaraMarker && newkaraMarker.offset() ? newkaraMarker.offset().top : posKaraMarker);
							var y = container.scrollTop() + newPosKaraMarker - posKaraMarker;
							container.scrollTop(y);
							container.scrollTop(y); // TODO un jour, tout plaquer, reprogrammer mon propre moteur de rendu natif, et mourir en paix							
										
							container.attr('flagScroll', false);
						} 
						//});
					});

				} else {
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
							$.each(tabTradToDelete, function(k, v){
								if(k !== 'TYPE_1001') blacklistCriteriasHtml.find('#bcType').append($('<option>', {value: k.replace('TYPE_',''), text: v}));                        
							});
						}
					}
                   
					for (var k in data) {
						if (data.hasOwnProperty(k)) {
							if(blacklistCriteriasHtml.find('li[type="' + data[k].type + '"]').length == 0) {
								blacklistCriteriasHtml.append('<li class="list-group-item liType" type="' + data[k].type + '">' + tabTradToDelete['TYPE_' + data[k].type] + '</li>');
							}
							// build the blacklist criteria line
							var bcTagsFiltered = jQuery.grep(bcTags, function(obj) {
								return obj.tag_id == data[k].value;
							});
							var tagText = bcTagsFiltered.length == 1 ?  bcTagsFiltered[0].name_i18n : data[k].value;
							var textContent = data[k].type == 1001 ? buildKaraTitle(data[k].value[0]) : tagText;

							blacklistCriteriasHtml.find('li[type="' + data[k].type + '"]').after(
								'<li class="list-group-item liTag" blcriteria_id="' + data[k].blcriteria_id + '"> '
							+	'<div class="actionDiv">' + html + '</div>'
							+	'<div class="typeDiv">' + tabTradToDelete['TYPE_' + data[k].type] + '</div>'
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
			
			// building the options
			var optionHtml = '';
			$.each(playlistList, function (key, value) {
				var params = Object.keys(value).map(function (k) {
					return 'data-' + k + '="' +  value[k] + '"';
				}).join(' ');
				optionHtml += '<option ' + params + '  value=' + value.playlist_id + '> ' + value.name + '</option>';
			});
			$('select[type="playlist_select"]').empty().html(optionHtml);

			// setting the right values to newly refreshed selects
			// for public interface, panel1Default to keep kara list, playlistToAddId to show the playlist where users can add
			// for admin, check cookies
			settingsUpdating.done( function() {
				if(scope === 'public') {
					select1.val(val1? val1 : panel1Default);
					select2.val(val2? val2 : playlistToAddId);
				} else {
					var plVal1Cookie = readCookie('plVal1');
					var plVal2Cookie = readCookie('plVal2');
					select1.val(val1? val1 : plVal1Cookie ? plVal1Cookie : -1);
					select2.val(val2? val2 : plVal2Cookie ? plVal2Cookie : playlistToAddId);
				}
			
				$('.select2').select2({ theme: 'bootstrap',
					templateResult: formatPlaylist,
					templateSelection : formatPlaylist,
					tags: false,
					minimumResultsForSearch: 3
				});

				if(!select2.val()) {
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
			var attrListStr = Object.keys(attrList).map(function(k,v){
				return attrList[v].name.indexOf('data-') > -1 ? attrList[v].name : '';
			}).join(' ');
			dashboard.removeAttr(attrListStr);
			playlistContentUpdating.done(function() {
				refreshContentInfos(side);
			});
			$.each(optionAttrList, function() {
				dashboard.attr(this.name, this.value);
			});
			dashboard.data(option.data());
			if (playlistRange[idPlaylist] == undefined) {
				setPlaylistRange(idPlaylist, 0, karaParPage * 2);
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
			plInfos = range.from + '-' + max;
			plInfos +=
				(idPlaylist > -2 ?
					' / ' + dashboard.attr('data-karacount') + ' karas'
					: '') +
				(idPlaylist > -1 ?
					' ~ dur. ' + secondsTimeSpanToHMS(dashboard.data('length')) + ' / re. ' + secondsTimeSpanToHMS(dashboard.data('time_left'))
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
		if (oldState != data) {
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
			if($('input[name="lyrics"]').is(':checked') || mode == 'mobile' && $('#switchInfoBar').hasClass('showLyrics')) {
				var text = data['subText'];
				/* if(oldState['subText'] != null && text != null && text.indexOf(oldState['subText']) > -1 && text != oldState['subText']) {
                    text.replace(oldState['subText'], "<span style='color:red;'>" + oldState['subText'] + "</span>");
                }*/
				if (text) text = text.indexOf('\n') == -1 ? text:  text.substring(0, text.indexOf('\n') );
				$('#karaInfo > span').html(text);
			}
			if (data.currentlyPlaying !== oldState.currentlyPlaying && data.currentlyPlaying > 0) {
                
				var barCss = $('#progressBarColor.cssTransform');
				barCss.removeClass('cssTransform');
				$('#progressBarColor').stop().css({transform : 'translateX(0)'});
				barCss.addClass('cssTransform');

				$.ajax({ url: 'public/karas/' + data.currentlyPlaying }).done(function (dataKara) {
					$('#karaInfo').attr('idKara', dataKara[0].kara_id);
					$('#karaInfo').attr('length', dataKara[0].duration);
					$('#karaInfo > span').text( buildKaraTitle(dataKara[0]) );
					$('#karaInfo > span').data('text', buildKaraTitle(dataKara[0]) );
				});
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
				$('input[name="toggleAlwaysOnTop"]').bootstrapSwitch('state', data.ontop, true);
			}
			if (data.fullscreen != oldState.fullscreen) {
				$('input[name="toggleFullscreen"]').bootstrapSwitch('state', data.fullscreen, true);
			}
			if (data.volume != oldState.volume) {
				var val = data.volume, base = 100;
				val = val / 100;
				val = Math.pow(base, val);
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
    * @param {String} search - (optional) search made by the user
    * @return {String} the title
    */
	buildKaraTitle = function(data, search) {
		var titleArray = $.grep([data.language.toUpperCase(), data.serie ? data.serie : data.singer,
			data.songtype_i18n_short + (data.songorder > 0 ? ' ' + data.songorder : ''), data.title], Boolean);
		var titleClean = Object.keys(titleArray).map(function (k) {
			return titleArray[k] ? titleArray[k] : '';
		});
		var titleText = titleClean.join(' - ');

		if(search) {
			var search_regexp = new RegExp('(' + search + ')', 'gi');
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
		if (infoKara.length == 0) {
			var urlInfoKara = idPlaylist > 0 ? scope + '/playlists/' + idPlaylist + '/karas/' + idPlc : 'public/karas/' + idKara;

			$.ajax({ url: urlInfoKara }).done(function (data) {
				var detailsHtml = buildKaraDetails(data[0], mode);
				detailsHtml = $(detailsHtml).hide();
				liKara.find('.contentDiv').after(detailsHtml);

				detailsHtml.fadeIn(animTime);
				liKara.find('[name="infoKara"]').css('border-color', '#8aa9af');
				saveDetailsKara(idPlaylist, idKara, 'add');
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
	};

	/** 
    * Build kara details depending on the data
    * @param {Object} data - data from the kara
    * @param {String} mode - html mode
    * @return {String} the details, as html
    */
	buildKaraDetails = function(data, htmlMode) {
		var details = {
			'Ajouté ': (data['date_add'] ? data['date_add'] : '') + (data['pseudo_add'] ? ' par ' + data['pseudo_add'] : '')
			, 'Auteur': data['author']
			, 'Vues': data['viewcount']
			, 'Créateur': data['creator']
			, 'Durée': data['duration'] == 0 || isNaN(data['duration']) ? null : ~~(data['duration'] / 60) + ':' + (data['duration'] % 60 < 10 ? '0' : '') + data['duration'] % 60
			, 'Langue': data['language_i18n']
			, 'Divers': data['misc_i18n']
			, 'Série': data['serie']
			, 'Série alt': data['serie_altname']
			, 'Chanteur': data['singer']
			, 'Type ': data['songtype_i18n'] + data['songorder'] > 0 ? ' ' + data['songorder'] : ''
			, 'Année': data['year']
			, 'Compositeur': data['songwriter']
		};
		var htmlDetails = Object.keys(details).map(function (k) {
			if(details[k]) {
				var detailsLine = details[k].toString().replace(/,/g, ', ');
				return '<tr><td>' + k + '</td><td>' + detailsLine + '</td><tr/>';
			} else return '';
		});
		var htmlTable = '<table>' + htmlDetails.join('') + '</table>';

		infoKaraTemp = 'no mode specified';
		if (htmlMode == 'list') {
			infoKaraTemp = '<div class="detailsKara alert alert-info">' + (isTouchScreen ? '' : closeButton) + showFullTextButton + htmlTable + '</div>';
		} else if (htmlMode == 'mobile') {
			infoKaraTemp = '<div class="detailsKara z-depth-1">' + showFullTextButton + htmlTable + '</div>';
		}
		return infoKaraTemp;
	};
	
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

	$(window).resize(function () {
		//  initSwitchs();
		isSmall = $(window).width() < 1025;        
		var topHeight1 = $('#panel1 .panel-heading.container-fluid').outerHeight();
		var topHeight2 = $('#panel2 .panel-heading.container-fluid').outerHeight();
		$('#playlist1').parent().css('height', 'calc(100% - ' + (scope === 'public' ? 0 : topHeight1) + 'px ');
		$('#playlist2').parent().css('height', 'calc(100% - ' + topHeight2 + 'px  ');

		if(!isTouchScreen) $('.playlistContainer').perfectScrollbar();
	});

	/** 
    * Init bootstrapSwitchs
    */
	initSwitchs = function () {
		$('input[switch="onoff"],[name="EnginePrivateMode"],[name="kara_panel"],[name="lyrics"]').bootstrapSwitch('destroy', true);

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
		});
	};

	/* opposite sideber of playlist : 1 or 2 */
	non = function (side) {
		return 3 - parseInt(side);
	};


	getPlaylistRange = function(idPl) {
		var search = $('#searchPlaylist' + sideOfPlaylist(idPl)).val();
        
		if(!playlistRange[idPl]) playlistRange[idPl] = {};
		return playlistRange[idPl][search] ? playlistRange[idPl][search] : { from : 0, to : karaParPage * 2 };
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
		var karaName = $('li[idkara="' + idKara + '"]').first().find('.contentDiv').text();
		
		$.ajax({ url: 'public/karas/' + idKara,
			type: 'POST',
			data: { requestedby : pseudo },
			complete: function() {
				var side = 2;
				if(sideOfPlaylist(playlistToAddId) == side) {
					playlistContentUpdating.done( function() {
						scrollToKara(side, idKara); 
					});
				}
			}
		}).done(function() {
			if(doneCallback) doneCallback();
			displayMessage('success', '"' + (karaName ? karaName : 'kara') + '"', ' ajouté à la playlist <i>' + playlistToAddName + '</i>');
		}).fail(function() {
			if(failCallback) failCallback();
		});
	};


	/* partie socket */
	socket.on('playerStatus', function(data){
		refreshPlayerInfos(data);
	});
    
	socket.on('settingsUpdated', function(){
		settingsUpdating = scope === 'admin' ? getSettings() : getPublicSettings();

		settingsUpdating.done(function (){
			if(!($('#selectPlaylist' + 1).data('select2') && $('#selectPlaylist' + 1).data('select2').isOpen() 
																|| $('#selectPlaylist' + 2).data('select2') && $('#selectPlaylist' + 2).data('select2').isOpen() )) {
				playlistsUpdating = refreshPlaylistSelects();
    
				playlistsUpdating.done(function () {
					refreshPlaylistDashboard(1);
					refreshPlaylistDashboard(2);
            
				});
			}
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
			var liKara = playlist.find('li[currentlyplaying], li[currentlyPlaying=""], li[currentlyPlaying="true"]').get(0);
			
			if(liKara) {
				liKara.removeAttribute('currentlyPlaying');
				// trick for IE/Edge not redrawing layout
				var ul = $(liKara).closest('ul');
				ul.css('height',  ul.height());
				ul.css('height', 'auto');
			}
			$('#playlist' + side + ' > li[idplaylistcontent="' + data.plc_id + '"]').attr('currentlyplaying', '');
			
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
		if( scope === 'public') displayMessage('info','Message à caractère informatif <br/>', data.message, data.duration);
	});


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