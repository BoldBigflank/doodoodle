angular.module('components', [])
  .directive("drawing", function(){
    return {
      restrict: "A",
      link: function(scope, element){
        var ctx = element[0].getContext('2d');

        // variable that decides if something should be drawn on mousemove
        var drawing = false;

        // the last coordinates before the current move
        var lastX;
        var lastY;

        // drawing.setAttribute('width', element[0].parent().width());
        // drawing.setAttribute('height', element[0].parent().height());
        // drawing.setAttribute('id', 'canvas');
        
        // *** Mouse Controls ***
        element.bind('mousedown', function(event){
          if(event.offsetX!==undefined){
            lastX = event.offsetX;
            lastY = event.offsetY;
          } else { // Firefox compatibility
            lastX = event.layerX - event.currentTarget.offsetLeft;
            lastY = event.layerY - event.currentTarget.offsetTop;
          }

          // begins new line
          ctx.beginPath();

          drawing = true;
        });
        element.bind('mousemove', function(event){
          event.preventDefault();
          if(drawing){
            // get current mouse position
            if(event.offsetX!==undefined){
              currentX = event.offsetX;
              currentY = event.offsetY;
            } else {
              currentX = event.layerX - event.currentTarget.offsetLeft;
              currentY = event.layerY - event.currentTarget.offsetTop;
            }

            draw(lastX, lastY, currentX, currentY);

            // set current coordinates to last one
            lastX = currentX;
            lastY = currentY;
          }

        });
        element.bind('mouseup', function(event){
          // stop drawing
          drawing = false;
        });

        // *** Touch Controls ***
        element.bind('touchstart', function(event){
          if(event.offsetX!==undefined){
            lastX = event.offsetX;
            lastY = event.offsetY;
          } else { // Firefox compatibility
            lastX = event.touches[0].pageX - event.currentTarget.offsetLeft;
            lastY = event.touches[0].pageY - event.currentTarget.offsetTop;
          }

          // begins new line
          ctx.beginPath();

          drawing = true;
        });
        element.bind('touchmove', function(event){
          event.preventDefault();
          if(drawing){
            // get current mouse position
            if(event.offsetX!==undefined){
              currentX = event.touches[0].pageX;
              currentY = event.touches[0].pageY;
            } else {
              currentX = event.touches[0].pageX - event.currentTarget.offsetLeft;
              currentY = event.touches[0].pageY - event.currentTarget.offsetTop;
            }

            draw(lastX, lastY, currentX, currentY);

            // set current coordinates to last one
            lastX = currentX;
            lastY = currentY;
          }

        });
        element.bind('touchend', function(event){
          // stop drawing
          drawing = false;
        });

        // canvas reset
        function reset(){
         element[0].width = element[0].width; 
        }

        function draw(lX, lY, cX, cY){
          // line from
          ctx.moveTo(lX,lY);
          // to
          ctx.lineTo(cX,cY);
          // color
          ctx.strokeStyle = "#df4b26";
          ctx.lineJoin = "round";
          ctx.lineWidth = 5;
          // draw it
          ctx.stroke();
        }
      }
    };
  });