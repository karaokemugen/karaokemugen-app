$(document).ready(function () {

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

  $('#choixPseudo').val(pseudo).blur();

  $.ajax({ url: 'public/settings', }).done(function (data) {
    settingsPublic = data;
    fillPlaylistSelects('public');
  });

  $.ajax({ url: 'public/playlists/current', }).done(function (data) {
    publicPlaylistId = data.id_playlist;
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

  if(settingsPublic['EngineAllowNicknameChange'] == "0") {
    $('#pseudo').parent().hide();
    $('#searchParent').css("width","100%");
  }
  $('#choixPseudo').focus(function(){
    //this.setSelectionRange(0, this.value.length);
    this.value = "";
  });
  $('#choixPseudo').blur(function(){
    pseudo = $(this).val();
    $('#choixPseudo').val(pseudo);
    if($('#pseudo > option[value="' + pseudo +'"]').length == 0) {
      $('#pseudo').append($('<option>', {value: pseudo}));
    }
    document.cookie = 'mugenPseudo=' + pseudo + ';expires=' +  date.toUTCString();
    document.cookie = 'mugenPseudoList=' + JSON.stringify($('#pseudo > option').map(function(i,e){return e.value})) + ';expires=' +  date.toUTCString();
  });
  // fillPlaylist('playlist2', 'public/playlists/public/karas', 'list', '');
  // fillPlaylist('playlist1', 'public/karas', 'list', '');

  //  alert($(window).width() + "-" + $(window).height());
});

var date = new Date();
date.setFullYear(date.getFullYear + 10);
var scope = 'public';
var settingsPublic = {}
var publicPlaylistId = 1;
pseudo ="Anonymous";
refreshTime = 2000;
