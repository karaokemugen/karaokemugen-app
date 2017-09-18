$(document).ready(function () {

  $('#choixPseudo').focus(function(){
    //this.setSelectionRange(0, this.value.length);
    this.value = "";
  });
  $('#choixPseudo').blur(function(){
    if(settings['EngineAllowNicknameChange'] == "1") {
      pseudo = $(this).val();
      $('#choixPseudo').val(pseudo);
      if($('#pseudo > option[value="' + pseudo +'"]').length == 0) {
        $('#pseudo').append($('<option>', {value: pseudo}));
      }
    } 
    document.cookie = 'mugenPseudo=' + pseudo + ';expires=' +  date.toUTCString();
    document.cookie = 'mugenPseudoList=' + JSON.stringify($('#pseudo > option').map(function(i,e){return e.value})) + ';expires=' +  date.toUTCString();
  });

  var mugenPseudo = document.cookie.match('(^|;) ?' + 'mugenPseudo' + '=([^;]*)(;|$)');
  
  if(mugenPseudo) {
    pseudo = mugenPseudo[2];
  } else {
    pseudo = prompt('Pseudo');
  }  
  var mugenPseudoList = document.cookie.match('(^|;) ?' + 'mugenPseudoList' + '=([^;]*)(;|$)');
  if(mugenPseudoList) { 
    mugenPseudoListObject = JSON.parse(mugenPseudoList[2]);
    $.each(mugenPseudoListObject, function(k, v){
      $('#pseudo').append($('<option>', {value: v}));
    });
  }
  $('#choixPseudo').val(pseudo).trigger('blur');

  getPublicSettings(true);

  $('.showSettings').click(function(){
    displayModal("alert", $('#settingsPublicTitle').text(), $('#settingsPublicContent').html());
  });

  $('input[name="lyrics"]').on('switchChange.bootstrapSwitch', function (event) {
    if(!$(this).is(':checked')) {   
      $('#karaInfo > span').text( $('#karaInfo > span').data('text') );
    }
  });

  $('input[name="kara_panel"]').on('switchChange.bootstrapSwitch', function (event) {
    if ($(this).val() == 0) {
      $('#searchPlaylist1').fadeIn(animTime);
      // $('#searchPlaylist2').fadeOut(animTime);      
      $('#playlist1').closest('.panel').show();
      $('#playlist2').closest('.panel').css('width', '');
    } else {
      $('#searchPlaylist1').fadeOut(animTime);
      // $('#searchPlaylist2').fadeIn(animTime); 
      $('#playlist1').closest('.panel').hide();
      $('#playlist2').closest('.panel').css('width', '100%');
    }

  });

  $('#menuMobile').click(function(){
    var opened = $(this).data('opened');
    opened = !opened;

    $(this).parent().find('ul').css('opacity', opened ? '1' : '0');
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

  $('#changePseudo').click( function() {
    displayModal("prompt","Pseudo","", function(newPseudo){
      pseudo = newPseudo;
    }, pseudo);
  });
  
});

var date = new Date();
date.setFullYear(date.getFullYear() + 10);

var scope = 'public';
var settings = {}
pseudo ="Anonymous";
refreshTime = 2000;
panel1Default = -1;


getPublicSettings = function(trigger) {
  var promise = $.Deferred();
  $.ajax({ url: 'public/settings', }).done(function (data) {
    
    playlistToAdd = data['private'] == 1 ? "current" : "public";
    $.ajax({ url: 'public/playlists/' + playlistToAdd, }).done(function (data) {
        playlistToAddId = data.playlist_id;
    });

    settings = data;
    fillPlaylistSelects(trigger);
      
    if(settings['EngineAllowNicknameChange'] == "1") {
      $('#pseudo').parent().show();
      $('#searchParent').css("width","");
    }

    $('#version').text(settings['VersionName'] + " " + settings['VersionNo']);
    $('#mode').text(settings['private'] == "1" ? "Privé" : "Public");
    promise.resolve();
  }); 
  return promise.promise();
}


endOfTheWorldAsWeKnowIt = function() {
  var things = $('body *');

  displayMessage('danger', "", '<center>Oh no</center>');
  $('html').attr('style', 'background-color: hsla(39, 100%, 34%, 0.86); opacity: .1;z-index: 99999;transition: all 5s linear');
   
  setTimeout(function(){
    $('html').attr('style', 'background-color: hsla(39, 100%, 34%, 0.96); opacity: 0.95;  z-index: 99999;transition: all 5s linear');
   }, 3000);

  setInterval(function () {
   
        endOfTheWorldAsWeKnowItloop();
     
  }, 50);
}

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

  el.draggable({
    container: 'body',
    appendTo: 'body',
    
  });

}


if (isTouchScreen) {
  
Hammer.Manager.prototype.emit = function (originalEmit) {
  return function (type, data) {
    originalEmit.call(this, type, data);
    $(this.element).trigger({
      type: type,
      gesture: data
    });
  };
}(Hammer.Manager.prototype.emit);


var elem = $('.playlist-main');
var swipeManager = new Hammer.Manager(elem[0],{
  prevent_default: false
});

var swipe = new Hammer.Swipe({'threshold' : 20});
swipeManager.add(swipe);
swipeManager.on('swipe', function (e) {
  
  panelWidth =  $('#panel1').width();
  var elem = $('#panel1, #panel2')
  elem.css({transition: 'transform 1s ease'});
  if(e.direction == 2 ) {
    elem.css({transform: 'translateX('+ -1 * panelWidth+'px)'});
  } else if (e.direction == 4) {
    elem.css({transform: 'translateX(0)'});
  }
});

  /* tap on full lyrics */

  var elem = $('.playlist-main');
  var managerLyrics = new Hammer.Manager(elem[0],{
    prevent_default: false
  });
  var tapper = new Hammer.Tap();
  managerLyrics.add(tapper);
  managerLyrics.on('tap', function (e) {

      $this = $(e.target).closest('.fullLyrics');
      if($this.length > 0) {
        e.preventDefault();
        
        var liKara = $this.closest('li');
        var playlist = liKara.closest('ul');
        var idKara = liKara.attr('idkara');
        var detailsKara = liKara.find('.detailsKara');
    
        $.ajax({ url: 'public/karas/' + idKara + '/lyrics' }).done(function (data) {
            if (mode == "mobile") {
              $('#lyricsModalText').html(data.join('<br/>'));
              $('#lyricsModal').modal('open');
            } else {
              displayModal("alert","Lyrics", "<center>" + data.join('<br/>') + "</center");
            }
        });
      }
    });


  swipSwippables = function(side) {
    var swipeLeft = false;
    var swipeRight = false;

    swipable = $('.collection[side="' + side + '"]');
    
      
      var manager = new Hammer.Manager(swipable[0],{
        prevent_default: false
      });
      
      var panner = new Hammer.Pan({ direction: Hammer.DIRECTION_HORIZONTAL, threshold: 100 });
      var tapper = new Hammer.Tap();
      
      manager.add(panner);
      manager.add(tapper);

      
      swipable.on('touchstart', function (e) {
        var $this = $(e.target).closest('li');
        $this.addClass('pressed');
      }).on('touchend', function (e) {
          var $this = $(e.target).closest('li');
          $this.removeClass('drag');
          $this.removeClass('pressed');
      })

      manager.on('tap', function (e) {
        e.gesture = e;
        
        if($(e.gesture.target).closest('.fullLyrics').length > 0) {
          return false;
        }
        var $this = $(e.gesture.target).closest('li');
      
        if($this.hasClass('pressed')) { toggleDetailsKara($this); }   
        $this.removeClass('pressed');
        $this.toggleClass('z-depth-3').toggleClass('active');

      })
      
    if(side == 1) {
        manager.on('pan', function (e) {
        e.gesture = e;
      
        if (e.gesture.pointerType === "touch" || e.gesture.pointerType === "mouse") {
          var $this = $(e.gesture.target).closest('li');
          var direction = e.gesture.direction;
          var x = e.gesture.deltaX;
          var velocityX = e.gesture.velocityX;
           console.log(e,direction,x );
          if(direction != 4) {
            return false;
          }
          
          $this.addClass('drag');
          if(x > $this.innerWidth() * .10) {
          $this.velocity({ translateX: x
          }, { duration: 50, queue: false, easing: 'easeOutQuad' });

          }
    
          // Swipe Left
          if (direction === 4 && (x > $this.innerWidth() / 2 || velocityX < -0.75)) {
            swipeLeft = true;
          }
          // Swipe Right
          if (direction === 2 && (x < -1 * $this.innerWidth() / 2 || velocityX > 0.75)) {
            swipeRight = true;
          }
        }
      }).on('panend', function (e) {
        e.gesture = e;
        var $this = $(e.gesture.target).closest('li');
          // Reset if collection is moved back into original position
          if (Math.abs(e.gesture.deltaX) < $this.innerWidth() / 2) {
            swipeRight = false;
            swipeLeft = false;
          }
    
          if (e.gesture.pointerType === "touch" || e.gesture.pointerType === "mouse") {
            if (swipeLeft || swipeRight) {
              var fullWidth;
              if (swipeLeft) {
                fullWidth = $this.innerWidth();
              } else {
                fullWidth = -1 * $this.innerWidth();
              }
    
              $this.velocity({ translateX: fullWidth
              }, { duration: 100, queue: false, easing: 'easeOutQuad', complete: function () {
                  $this.css('border', 'none');
                  $this.velocity({ height: 0, padding: 0
                  }, { duration: 200, queue: false, easing: 'easeOutQuad', complete: function () {
                        if( $this.is(':visible') ) {
                            var idKara = $this.attr('idkara');

                            ajx( "POST", "public/karas/" + idKara, { requestedby : pseudo }, function() {
                              playlistContentUpdating.done( function() {
                                scrollToKara(2, idKara); 
                              });
                              displayMessage('success', 'Succès', "Kara ajouté à la playlist <i>" + playlistToAdd + "</i>.");
                            });
                        }
                        
                        $this.remove();
                    }
                  });
                }
              });
              
            } else {
              $this.velocity({ translateX: 0
              }, { duration: 100, queue: false, easing: 'easeOutQuad',  complete: function () {
              }
            });
            }
            swipeLeft = false;
            swipeRight = false;
          }
      });
    } 

  }
  swipSwippables(1);
  swipSwippables(2);

}