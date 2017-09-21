$(document).ready(function () {

  $('#choixPseudo').focus(function(){
    //this.setSelectionRange(0, this.value.length);
    this.value = "";
  });
  
  $('#changePseudo').click( function() {
    displayModal("prompt","Pseudo","", function(newPseudo){
      pseudo = newPseudo;
      document.cookie = 'mugenPseudo=' + pseudo + ';expires=' +  date.toUTCString();
      document.cookie = 'mugenPseudoList=' + JSON.stringify($('#pseudo > option').map(function(i,e){return e.value})) + ';expires=' +  date.toUTCString();
    }, pseudo);
  });

  $('#choixPseudo').blur(function(){
    if(settings['EngineAllowNicknameChange'] == "1") {
      if($(this).val()) pseudo = $(this).val();
      $('#choixPseudo').val(pseudo);
      if($('#pseudo > option[value="' + pseudo +'"]').length == 0) {
        $('#pseudo').append($('<option>', {value: pseudo}));
      }
    } 
    document.cookie = 'mugenPseudo=' + pseudo + ';expires=' +  date.toUTCString();
    document.cookie = 'mugenPseudoList=' + JSON.stringify($('#pseudo > option').map(function(i,e){return e.value})) + ';expires=' +  date.toUTCString();
  });

  var mugenPseudo = document.cookie.match('(^|;) ?' + 'mugenPseudo' + '=([^;]*)(;|$)');

  if(mugenPseudo && mugenPseudo[2]) {
    pseudo = mugenPseudo[2];
  } else {
    $('#changePseudo').click();
  }  
  var mugenPseudoList = document.cookie.match('(^|;) ?' + 'mugenPseudoList' + '=([^;]*)(;|$)');
  if(mugenPseudoList) { 
    mugenPseudoListObject = JSON.parse(mugenPseudoList[2]);
    $.each(mugenPseudoListObject, function(k, v){
      $('#pseudo').append($('<option>', {value: v}));
    });
  }
  $('#choixPseudo').val(pseudo).trigger('blur');

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

    ul = $(this).parent().find('ul');
    if(opened) ul.show();
    ul.css('opacity', opened ? '1' : '0');
    setTimeout(function() {if(!opened) ul.hide(); }, 500);    
    
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

var date = new Date();
date.setFullYear(date.getFullYear() + 10);

var scope = 'public';
var settings = {};
refreshTime = 2000;
panel1Default = -1;



getPublicSettings = function() {
  var promise = $.Deferred();
  $.ajax({ url: 'public/settings', }).done(function (data) {
    playlistToAdd = data['EnginePrivateMode'] == 1 ? "current" : "public";

    $.ajax({ url: 'public/playlists/' + playlistToAdd, }).done(function (data) {
        playlistToAddId = data.playlist_id;
        promise.resolve();
    });

   // Init with player infos, set the playlist's id where users can add their karas
    settings = data;

    if(settings['EngineAllowNicknameChange'] == "1") {
      $('.pseudoChange').show();
      $('#searchParent').css("width","");
    } else {
      $('.pseudoChange').hide();
      $('#searchParent').css("width","100%");
    }

    $('#version').text(settings['VersionName'] + " " + settings['VersionNo']);
    $('#mode').text(settings['private'] == "1" ? "Privé" : "Public");
  }); 
  return promise.promise();
}

/* touchscreen event handling part */
if (isTouchScreen) {

  var swipeLeft = false;
  var swipeRight = false;
  var sensibility = .28;

  var elem = $('.playlist-main');
  var swipeManager = new Hammer.Manager(elem[0],{
    prevent_default: true
  });

  var swipe = new Hammer.Swipe({'threshold' : 10,  direction : Hammer.DIRECTION_HORIZONTAL });

  swipeManager.add(swipe);

  swipeManager.on('swipe', function (e) {
    if(isSmall) {
      
      panelWidth =  $('#panel1').width();
      var elem = $('#panel1, #panel2')
      elem.css({transition: 'transform 1s ease'});
      if(e.direction == 2 ) {
        elem.css({transform: 'translateX('+ -1 * panelWidth+'px)'});
      } else if (e.direction == 4) {
        elem.css({transform: 'translateX(0)'});
      }
    }
  });


  [1,2].forEach(function(side){
      
    swipable = $('.collection[side="' + side + '"]');
    
      
      var manager = new Hammer.Manager(swipable[0],{
        prevent_default: false
      });
      
      var panner = new Hammer.Pan({ direction: Hammer.DIRECTION_HORIZONTAL, threshold: 50 });
      var tapper = new Hammer.Tap();
      
      manager.add(panner);
      manager.add(tapper);

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
          DEBUG && console.log(e,direction,x );
          if(direction != 4) {
            return false;
          }
          
          $this.addClass('drag');
          if(x > $this.innerWidth() * .10) {
          $this.velocity({ translateX: x
          }, { duration: 50, queue: false, easing: 'easeOutQuad' });

          }
    
          // Swipe Left
          if (direction === 4 && (x > $this.innerWidth()  * sensibility || velocityX < -0.75)) {
            swipeLeft = true;
          }
          // Swipe Right
          if (direction === 2 && (x < -1 * $this.innerWidth()  * sensibility  || velocityX > 0.75)) {
            swipeRight = true;
          }
        }
      }).on('panend', function (e) {
        e.gesture = e;
        var $this = $(e.gesture.target).closest('li');
          // Reset if collection is moved back into original position
          if (Math.abs(e.gesture.deltaX) < $this.innerWidth() * sensibility) {
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
                              displayMessage('success', "'" + $this.find('.contentDiv').text() + "'", " ajouté à la playlist <i>" + playlistToAdd + "</i>.");
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

  });

}
