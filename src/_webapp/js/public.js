$(document).ready(function () {


  $('#choixPseudo').focus(function(){
    //this.setSelectionRange(0, this.value.length);
    this.value = "";
  });
  $('#choixPseudo').blur(function(){
    if(settingsPublic['EngineAllowNicknameChange'] == "1") {
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

  $.ajax({ url: 'public/player' }).done(function (data) {
      playlistToAdd = data['private'] == 1 ? "current" : "public";
      $.ajax({ url: 'public/playlists/' + playlistToAdd, }).done(function (data) {
          playlistAjoutId = data.playlist_id;
          $("#selectPlaylist2").val(playlistAjoutId).change();
      });
  });

  $('#showSettings').click(function(){
    popup('#settingsPublic');
  });

  $('input[name="kara_panel"]').on('switchChange.bootstrapSwitch', function (event) {
    if ($(this).val() == 0) {
      $('#playlist1').parent().show();
      $('#playlist2').parent().css('width', '');
    } else {
      $('#playlist1').parent().hide();
      $('#playlist2').parent().css('width', '100%');
    }

  });

  //  alert($(window).width() + "-" + $(window).height());
});

var date = new Date();
date.setFullYear(date.getFullYear() + 10);
var scope = 'public';
var settingsPublic = {}
var playlistToAdd;
pseudo ="Anonymous";
refreshTime = 2000;
panel1Default = -1;


getPublicSettings = function(trigger) {
  $.ajax({ url: 'public/settings', }).done(function (data) {
    settingsPublic = data;
    fillPlaylistSelects(trigger);
      
    if(settingsPublic['EngineAllowNicknameChange'] == "1") {
      $('#pseudo').parent().show();
      $('#searchParent').css("width","");
    }

    $('#version').text(settingsPublic['VersionName'] + " " + settingsPublic['VersionNo']);
    $('#mode').text(settingsPublic['private'] == "1" ? "Privé" : "Public");
  }); 
}
