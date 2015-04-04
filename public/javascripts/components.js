angular.module('components', [])
  .directive("drawing", function($document){
    return {
      restrict: "A",
      link: function(scope, element){
        var canvas = element[0]
        var ctx = element[0].getContext('2d');

        // variable that decides if something should be drawn on mousemove
        var drawing = false;

        // the last coordinates before the current move
        var lastX;
        var lastY;

        var start = function(event){
          if(event.offsetX!==undefined){
            console.log("offsetX")
            coord = canvasCoord({"x":event.x, "y":event.y})
          } else { // Firefox compatibility
            console.log("layerX")
            coord = canvasCoord({"x":event.layerX - event.currentTarget.offsetLeft, "y":event.layerY - event.currentTarget.offsetTop})
          }

          lastX = coord.x;
          lastY = coord.y;

          // begins new line
          ctx.beginPath();
          drawing = true;
        }

        var move = function(event){
          event.preventDefault();
          if(drawing){
            // get current mouse position
            if(event.offsetX!==undefined){
              currentX = event.x;
              currentY = event.y;
            } else {
              currentX = event.layerX - event.currentTarget.offsetLeft;
              currentY = event.layerY - event.currentTarget.offsetTop;
            }

            coord = canvasCoord({"x":currentX, "y":currentY})
            
            draw(lastX, lastY, coord.x, coord.y);

            // set current coordinates to last one
            lastX = coord.x;
            lastY = coord.y;
          }

        }

        var end = function(event){
          // stop drawing
          drawing = false;
        }

        var canvasCoord = function(coord){
          // Modify it based on its scale
          coord.x -= canvas.getBoundingClientRect().left
          coord.y -= canvas.getBoundingClientRect().top
          
          // Modify it based on the canvas's scale
          coord.x *= canvas.width / parseInt(canvas.style.width, 10);
          coord.y *= canvas.height / parseInt(canvas.style.height, 10);
          return coord;
        }

        // *** Mouse Controls ***
        element.bind('mousedown', start);
        element.bind('mousemove', move);
        $document.bind('mouseup', end);

        // *** Touch Controls ***
        element.bind('touchstart', start);
        element.bind('touchmove', move);
        element.bind('touchend', end);

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
          ctx.lineCap = 'round';
          ctx.lineWidth = 5;
          // draw it
          ctx.stroke();
        }
      }
    };
  })
  .directive('resize', function ($window) {
    return function (scope, element) {
      var ctx = element[0].getContext('2d');
      scope.$watch(function () {
        return { 'h': $window.innerHeight, 'w': $window.innerWidth };
      }, function (newValue, oldValue) {
        scope.windowHeight = newValue.h;
        scope.windowWidth = newValue.w;

        scope.style = function () {
          var newHeight = newValue.h - 100
          ctx.scale(newValue.w/oldValue.w, newValue.h/oldValue.h)
        return { 
            'height': newHeight + 'px',
            'width': (0.75 * newHeight) + 'px' 
          };
        };
              
      }, true);
    
      angular.element($window).bind('resize', function () {
        scope.$apply();
      });
    }
  })