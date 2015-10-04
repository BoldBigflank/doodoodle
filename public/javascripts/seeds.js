// Socket.io
// var socket = io.connect('http://localhost:3000');
// var socket = io.connect('http://192.168.29.235:3000');
// Angular
(function () {
  function SocketFactory ($rootScope) {
    var SocketFactory = {};
    var socket = io.connect(); // Production
    // var socket = io.connect('http://localhost:3000'); // Local
    // var socket = io.connect('http://192.168.29.235:3000');
    SocketFactory.on = function (eventName, data, callback) {
      if (typeof (callback) === 'undefined') callback = data;

      socket.on(eventName, function () {
        var args = arguments;
        callback.apply(socket, args);
      });
    };
    SocketFactory.emit = function (eventName, data, callback) {
      if (typeof (callback) === 'function') {
        socket.emit(eventName, data, callback);
      } else {
        callback = data;
        socket.emit(eventName, callback);
      }
    };
    return SocketFactory;
  }

  function SeedsCtrl ($scope, $document, $timeout, $interval, $cookies, SocketFactory) {
    var vm = this;
    this.seeds = [];



    // Input data
    this.playerId = 0;
    this.joinData = {"name":"", "room":""};

    if($cookies.get("name")){
      this.joinData.name = $cookies.get("name");
    }
    if($cookies.get("room")){
      this.joinData.room = $cookies.get("room");
    }
    

    // Computed data
    this.player = null;
    this.errors = [];
    this.drawingData = "drawingData";

    this.pushError = function(err){
      vm.errors.push(err);
      $timeout(popError, 3500);
      $scope.$digest();
    };

    var popError = function(){
      vm.errors.shift();
      $scope.$digest();
    };

    this.socketReturn = function (err) {
      if (err) {
        console.log("Callback error: ", err);
        vm.pushError(err);
      }
      vm.processing = false;
      $scope.$digest();
    };

    this.loadGame = function (gameData) {
      vm.game = gameData;
      console.log("Game is now", vm.game);
      vm.player = vm.game.players[vm.playerId];
      // for (var x in vm.game.players) {
      //   var p = vm.game.players[x];
      //   if(p.id == vm.playerId){
      //     vm.player = p;
      //     break;
      //   }
      // }

      // Check the time difference
      vm.timeDifference = gameData.now - new Date().getTime();

      $scope.$digest();
    };

    this.startHost = function () {
      console.log("startHost");
      vm.player = false;
      SocketFactory.emit('host', vm.playerId,  vm.socketReturn);
    };

    this.startPlayer = function () {
      console.log("startPlayer");
      vm.player = true;
      vm.joinData.playerId = vm.playerId; // Old ID if we have it
      SocketFactory.emit('join', vm.joinData, function (err, game) {
        if(err) vm.pushError(err);
        if (!err) {
          console.log(vm.joinData.name, "joined", game.room);
          vm.loadGame(game);

          // Set the cookies
          $cookies.put("name", vm.joinData.name);
          $cookies.put("room", vm.joinData.room);
        }
        $scope.$digest();
      });
    };

    this.action = function (action) {
      vm.processing = true;
      console.log("Control action: " + action);
      SocketFactory.emit(action, vm.socketReturn);
    };

    if (!vm.isPlayer) {
      vm.startHost();
    } else {
      var inputRoom = document.getElementById("inputRoom");
      inputRoom.focus();
      $timeout(function () { inputRoom.select(); }, 10);

    }

    SocketFactory.on('game', function (gameData) {
      console.log("GameCtrl -> game received");
      console.log(JSON.stringify(gameData));
      vm.loadGame(gameData);
    });

    // Special case to use $scope
    $scope.$on('$destroy', function (event) {
      SocketFactory.removeAllListeners();
      // or something like
      // socket.removeListener(this);
    });

  }

  function DrawingDirective ($document, SocketFactory) {
    return {
      template: [
        "<table ng-show='{{position}} <= 0' style='margin:auto;' class=''> <tr style='height:25px'> <td ng-repeat='c in colors' bgcolor='{{c}}' ng-class='{\"colorPicked\": c == color }' width=25px ng-click='changeColor(c)'> </tr> </table>",
        "<canvas width={{width}}px height={{height}}px scale={{scale}} resize ng-style='style()' class='drawing'></canvas>",
        "<div class='btn-group btn-block'>",
        "<button class='btn btn-default text-uppercase' ng-click='clearCanvas()' type='submit'>X</button>",
        "<button class='btn btn-default text-uppercase' ng-click='updateSeed(\"approve\")' type='submit'>Approve</button>",
        "<button class='btn btn-error text-uppercase' ng-click='updateSeed(\"reject\")' type='submit'>Reject</button>",
        "</div>",
      ].join(''),
      restrict: "EA",
      transclude: true,
      scope: {
        "scale": "=scale",
        "width": "=width",
        "height": "=height",
        "position": "=position"
      },
      link: function (scope, element, attrs) {
        scope.colors = [
          '#1F75FE',
          '#1CAC78',
          '#EE204D',
          '#FCE883',
          '#B4674D',
          '#FF7538',
          '#926EAE',
          '#0D98BA',
          '#FFAACC',
          '#C5E384',
          '#FFAE42',
          '#FFFFFF',
          ];
        scope.color = "#1F75FE";

        // The canvas
        var canvas = element[0].getElementsByTagName('canvas')[0];
        var ctx = element[0].getElementsByTagName('canvas')[0].getContext('2d');

        // The stored lines
        scope.drawing = {
            lines: null,
            seed: []
          };

        // Drawing variables
        var position = (attrs.position !== undefined) ? parseInt(attrs.position, 10) : -1;
        var editable = (position <= 0);
        var isDrawing = false;
        var submitted = false;
        

        scope.changeColor = function(newColor){
          scope.color = newColor;
        };

        var canvasCoord = function (coord) {
          // Modify it based on the canvas's scale
          coord.x *= (canvas.width / parseInt(canvas.style.width, 10));
          coord.y *= (canvas.height / parseInt(canvas.style.height, 10));

          // Clean it up
          coord.x = coord.x.toFixed(2);
          coord.y = coord.y.toFixed(2);
          return coord;
        };

        // Drawing functions
        var startLine = function (coord, color) {
          // line style
          ctx.strokeStyle = (color) ? color : scope.color;
          ctx.lineJoin = "round";
          ctx.lineCap = 'round';
          ctx.lineWidth = 5;

          // start the line
          ctx.beginPath();

          // Put a dot at the beginning
          ctx.arc(coord.x, coord.y, 1, 0, 2 * Math.PI, false);
          ctx.stroke();

          ctx.moveTo(coord.x, coord.y);
        };

        var drawLine = function (coord) {
          ctx.lineTo(coord.x, coord.y);
          ctx.stroke();
        };

        var draw = function (lines) {
          if(typeof lines == "string") lines = JSON.parse(LZString.decompressFromUTF16( compressedLines ));
          for (var x in lines) {
            var line = lines[x];
            var color = "#000"; // Start with black
            if('color' in line){
              // If we have color data
              color = line.color;
              line = line.points;
            }
            if ( line[0] === undefined ) return;
            startLine(line[0], color);
            for (var y in line) {
              var point = line[y];
              drawLine(point);
            }
          }
        };

        var clearCanvas = function () {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          scope.drawing.lines = [];
          scope.drawing.seed = [];
        };

        // Event functions
        var start = function (event) {
          if (!editable) return;
          // Mouse and touch input
          var coord;
          if (event.offsetX !== undefined) {
            coord = canvasCoord({
              "x": event.offsetX,
              "y": event.offsetY
            });
          } else { // Firefox compatibility
            coord = canvasCoord({
              "x": event.layerX,
              "y": event.layerY
            });
          }
          startLine(coord, null);

          // start a new line for saving
          currentLine = [coord];
          isDrawing = true;
          return false;
        };

        var move = function (event) {
          if (!editable) return;
          event.preventDefault();
          if (isDrawing) {
            var coord;
            // get current mouse position
            if (event.offsetX !== undefined) {
              coord = canvasCoord({
                "x": event.offsetX,
                "y": event.offsetY
              });
            } else {
              var touch = event.touches[0];
              if(!touch) console.log("Touch not found!");
              coord = canvasCoord({
                "x": touch.clientX - event.srcElement.offsetLeft,
                "y": touch.clientY- event.srcElement.offsetTop
              });
            }
            drawLine(coord);
            // Add to line for saving
            // TODO: Only save when the distance is > 3px
            currentLine.push(coord);
          }
          return false;
        };

        var end = function (event) {
          if (isDrawing) {
            // Push the line for saving
            if (!scope.drawing.lines) scope.drawing.lines = [];
            scope.drawing.lines.push({"color":scope.color, "points":currentLine});
            // Put the seedline on top
            draw(scope.drawing.seed);
          }
          // stop drawing
          isDrawing = false;
          return false;
        };

        var vote = function (event) {
          console.log("Voting", scope.drawing.votingRound, scope.drawing.position);
          SocketFactory.emit('vote', {
            "votingRound": scope.drawing.votingRound,
            position: scope.drawing.position
          }, scope.$parent.vm.socketReturn);
        };

        // *** Mouse Controls ***
        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        $document.bind('mouseup', end);

        // *** Touch Controls ***
        canvas.addEventListener('touchstart', start);
        canvas.addEventListener('touchmove', move);
        canvas.addEventListener('touchend', end);

        // *** Vote Controls ***
        if (scope.position > 0) {
          console.log("My position is", scope.position);
          canvas.addEventListener('touchend', vote);
          canvas.addEventListener('mouseup', vote);
        }

        scope.clearCanvas = clearCanvas;

        var updateReturn = function(data){
          console.log("updateReturn", data);
        };

        scope.updateSeed = function (action) {
          console.log("updateSeed", action);
          var submission = {
            seedId: scope.drawing.seedId,
            action:action
          };
          
          SocketFactory.emit('seed', submission, scope.updatePictures);
        };

        scope.updatePictures = function (seedData) {
          console.log("updatePictures", JSON.stringify(seedData));
          var gameDrawing = null;
          scope.drawing.seedId = seedData.seedId;
          scope.drawing.seed = seedData.seed;
          scope.drawing.lines = null;
          clearCanvas();
          draw(seedData.seed);

        };

        scope.$parent.$watch('state', function(oldState, newState){
          console.log("Caught the state change", newState);
        });

        SocketFactory.on('seed', function (seedData) {
          console.log("Received a seed");
          clearCanvas();
          scope.updatePictures(seedData);
        });
      }
    };
  }

  function ResizeDirective ($window) {
    return function ($scope, element, attrs) {
      var scale = (attrs.scale !== undefined) ? attrs.scale : "1.0";
      $scope.$watch(function () {
        return {
          'h': $window.innerHeight,
          'w': $window.innerWidth
        };
      }, function (newValue, oldValue) {
        $scope.windowHeight = newValue.h;
        $scope.windowWidth = newValue.w;

        $scope.style = function () {
          var newHeight = newValue.h * scale;
          return {
            'height': newHeight + 'px',
            'width': (3 / 4 * newHeight) + 'px'
          };
        };

      }, true);

      angular.element($window).bind('resize', function () {
        $scope.$apply();
      });
    };
  }

  angular
    .module('doodoodleApp', ['ngCookies'])
    .factory('SocketFactory', SocketFactory)
    .controller('SeedsCtrl', SeedsCtrl)
    .directive("drawing", DrawingDirective)
    .directive('resize', ResizeDirective);
})();