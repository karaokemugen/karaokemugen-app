$(document).ready(function () {
  $.ajax({ url: 'public/settings', }).done(function (data) {
    settingsPublic = data;
    fillPlaylistSelects();
      
    if(settingsPublic['EngineAllowNicknameChange'] == "1") {
      $('#pseudo').parent().show();
      $('#searchParent').css("width","");
    }
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

      document.cookie = 'mugenPseudo=' + pseudo + ';expires=' +  date.toUTCString();
      document.cookie = 'mugenPseudoList=' + JSON.stringify($('#pseudo > option').map(function(i,e){return e.value})) + ';expires=' +  date.toUTCString();
    }
  });

  //  alert($(window).width() + "-" + $(window).height());
});

var scope = 'public';
var settingsPublic = {}
var publicPlaylistId = 1;
refreshTime = 2000;
