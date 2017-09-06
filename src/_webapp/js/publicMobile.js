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
  
  pseudo = "mobileUser";

});
  mode = "mobile";
  dragAndDrop = true;
  addKaraHtml = '<button class="btn btn-small waves-effect waves-light" name="addKara"><i class="material-icons">add</i></button>';  
  infoKaraHtml = '<button name="infoKara" class="btn btn-small btn-action waves-effect waves-light"><i class="material-icons">info_outline</i></button>';
  dragHandleHtml = '<button class="btn btn-small waves-effect waves-light"><i class="material-icons">drag_handle</i></button>';  

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
  
  swipSwippables = function() {
    var swipeLeft = false;
    var swipeRight = false;

    $('.swipable > li').each(function () {
      $(this).hammer({
        prevent_default: false
      }).on('touchstart', function (e) {
        $(this).addClass('dragged')
      }).on('touchend', function (e) {
        $(this).removeClass('dragged')
      }).on('pan', function (e) {
        if (e.gesture.pointerType === "touch") {
          var $this = $(this);
          var direction = e.gesture.direction;
          var x = e.gesture.deltaX;
          var velocityX = e.gesture.velocityX;
          if(direction != 4) return false;

          $this.velocity({ translateX: x
          }, { duration: 50, queue: false, easing: 'easeOutQuad' });
  
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
        // Reset if collection is moved back into original position
        if (Math.abs(e.gesture.deltaX) < $(this).innerWidth() / 2) {
          swipeRight = false;
          swipeLeft = false;
        }
  
        if (e.gesture.pointerType === "touch") {
          var $this = $(this);
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
                     /*
                      $this.css('transform','none');
                      $this.css('border', '');
                      $this.css('height', '');
                      $this.css('padding', '');
                      $this.fadeIn(100);
                      $this.effect( "highlight", {color: '#004a35'}, 700 );
                      */
                      $this.find('[name=addKara]').click();
                      $this.remove();
                  }
                });
              }
            });
          } else {
            $this.velocity({ translateX: 0
            }, { duration: 100, queue: false, easing: 'easeOutQuad' });
          }
          swipeLeft = false;
          swipeRight = false;
        }
      });
    });
  
  }