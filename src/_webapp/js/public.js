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

  $('#showSettings').click(function(){
    popup('#settingsPublic');
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

  alert($(window).width() + "-" + $(window).height());
});

var date = new Date();
date.setFullYear(date.getFullYear() + 10);
var scope = 'public';
var settingsPublic = {}
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
