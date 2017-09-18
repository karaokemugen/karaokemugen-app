$(document).ready(function () {
  //swipSwippables();
  $('#searchNav').pushpin({
    top: 56,
    bottom: 1000,
    offset: 0
  });

  $('.button-collapse').sideNav({
      menuWidth: $(window).width()*.8 + 'px', // Default is 300
      edge: 'right', // Choose the horizontal origin
      closeOnClick: true, // Closes side-nav on <a> clicks, useful for Angular/Meteor
      draggable: true, // Choose whether you can drag to open on touch screens,
      onOpen: function(el) { /* Do Stuff */ }, // A function to be called when sideNav is opened
      onClose: function(el) { /* Do Stuff */ }, // A function to be called when sideNav is closed
  });

  $('#lyricsModal').modal({
    complete: function() {  $('#lyricsModalText').text("Chargement...") } // Callback for Modal close
  });
  
  $('#pseudoModal').modal({
    complete: function() { pseudo = $('#pseudo').val(); } // Callback for Modal close
  });
/*
  $('.carousel.carousel-slider').carousel({
    duration: 150,
    dist: -100,
    shift: 0,
    padding: 0,
    fullWidth: true,
    indicators: false,
    noWrap: true
  });
*/
  $('#switchInfoBar').click(function(){
      $(this).toggleClass('showLyrics');
  });

  $('#changePseudo').click(function(){
    $('#pseudoModal').modal('open');
  });

  pseudo = "mobileUser";
});

  mode = "mobile";
  dragAndDrop = true;
  addKaraHtml = '<button class="btn btn-small waves-effect waves-light" name="addKara"><i class="material-icons">add</i></button>';  
  infoKaraHtml = '<button name="infoKara" class="btn btn-small btn-action waves-effect waves-light"><i class="material-icons">info_outline</i></button>';
  dragHandleHtml = '<button class="btn btn-small waves-effect waves-light"><i class="material-icons">drag_handle</i></button>';  
  showFullTextButton = "<button class='fullLyricsMobile btn btn-small btn-action'><i class='material-icons'>chat</i></button>";
  
  karaParPage = 80;
  
  swipSwippables = function(side) {
    var swipeLeft = false;
    var swipeRight = false;

    swipable = $('.collection[side="' + side + '"]');
    swipable.each(function () {
      $this = $(this);
      $this.data("hammer", new Hammer($this[0], {
        prevent_default: false
      }));
    })
    if(side == 1) {
      swipable.on('touchstart', function (e) {
        var $this = $(e.target).closest('li');
        if($(e.target).hasClass('contentDiv')) { $this.addClass('pressed'); }
        $('#panel1').addClass('noTransform');
      }).on('touchend', function (e) {
          var $this = $(e.target).closest('li');
          $this.removeClass('dragged');
          $this.removeClass('pressed');
      }).on('tap', function (e) {
        var $this = $(e.gesture.target).closest('li');
          if($this.hasClass('pressed')) { toggleDetailsKara($this); }
          $this.toggleClass('z-depth-3').toggleClass('active');
      }).on('pan', function (e) {
        console.log(e);
        if (e.gesture.pointerType === "touch") {
          var $this = $(e.gesture.target).closest('li');
          var direction = e.gesture.direction;
          var x = e.gesture.deltaX;
          var velocityX = e.gesture.velocityX;
          // console.log($(this),e,direction,x , $this, $this.innerWidth());
          if(direction != 4) {
            if(direction == 2) {
              $('#panel1').removeClass('noTransform');  
            }
            return false;
          }
          
          $this.addClass('dragged');
    
          if(x > $this.innerWidth() * .2) {
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
        var $this = $(e.gesture.target).closest('li');
          // Reset if collection is moved back into original position
          if (Math.abs(e.gesture.deltaX) < $this.innerWidth() / 2) {
            swipeRight = false;
            swipeLeft = false;
          }
    
          if (e.gesture.pointerType === "touch") {
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
                        if( $this.is(':visible') ) { $this.find('[name=addKara]').click(); }
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
    } else {
      swipable.on('touchstart', function (e) {
        if($(e.target).hasClass('contentDiv')) { $(this).addClass('pressed'); }
      }).on('touchend', function (e) {
        $(this).removeClass('dragged');
        $(this).removeClass('pressed');
      }).on('tap', function (e) {
          if($(this).hasClass('pressed')) { toggleDetailsKara($(this)); }
          $(this).toggleClass('z-depth-3').toggleClass('active');
      })
    }
  
  }

  // Dismissible Collections
  dragDraggables = function() {
    draggableLi = $("#playlist" + 1 + " > li");
    draggableLi.sortable({
        axis: 'x',
        helper:  function(){
          var li = $(this).closest('li');
          var width = li.width();
          var clone = li.clone();
          clone.addClass('dragged').width(width).find('.infoDiv').remove();
          return clone},
        scroll: false,
        revert: true,
        beforeStop: function(e) {
            
        }
    });
  }
