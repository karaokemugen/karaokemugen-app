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

  $('#showSettings').click(function(){
    popup('#settingsPublic');
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

  //alert($(window).width() + "-" + $(window).height());
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
  $('html').attr('style', 'background-color: hsla(39, 100%, 34%, 0.9); opacity: .85; z-index: 99999;');


  setInterval(function () {
   
        endOfTheWorldAsWeKnowItloop();
     
  }, 50);
}

function endOfTheWorldAsWeKnowItloop(){
  var things = $('body *');
  var randomColor = Math.floor(Math.random()*16777215).toString(16);
  var random = Math.floor(Math.random()*things.length);
  el = things.eq(random);
  el.css('transition','all 5s linear');
  el.css('width', Math.floor(Math.random()*400));
  el.css('height', Math.floor(Math.random()*400));
  el.css('position', 'fixed');
  el.css('top', Math.floor(Math.random()*$(window).height() ));
  el.css('left', Math.floor(Math.random()*$(window).width() ));
  if(Math.random() > .85) el.css('background-color', '#' + randomColor );
  el.css('opacity',Math.random()/2 + .4);
  el.draggable({
    container: 'body',
    appendTo: 'body',
    
  });

 
}
