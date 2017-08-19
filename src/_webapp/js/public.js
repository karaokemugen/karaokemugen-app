$(document).ready(function () {
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


  // fillPlaylist('playlist2', 'public/playlists/public/karas', 'list', '');
  // fillPlaylist('playlist1', 'public/karas', 'list', '');

  //  alert($(window).width() + "-" + $(window).height());
});

var scope = 'public';
var settingsPublic = {}
var publicPlaylistId = 1;
refreshTime = 2000;
