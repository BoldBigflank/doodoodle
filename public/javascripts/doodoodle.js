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

  function GameCtrl ($scope, $document, $timeout, $interval, $cookies, SocketFactory) {
    var vm = this;
    this.playerId = 0;
    this.joinData = {"name":"", "room":""};
    this.player = null;
    this.isPlayer = isPlayer;
    this.errors = [];
    this.drawingData = "drawingData";
    this.timeDifference = 0;
    
    if($cookies.get("name")){
      this.joinData.name = $cookies.get("name");
    }
    if($cookies.get("room")){
      this.joinData.room = $cookies.get("room");
    }
    
    // FIX: Business logic should be in a Service
    var generatePlayerId = function(){
      var id = '_' + Math.random().toString(36).substr(2, 9);
      $cookies.put("playerId", id);
      return id;
    };

    this.playerId = ($cookies.get("playerId") !== undefined) ? $cookies.get("playerId") : generatePlayerId();

    this.pushError = function(err){
      vm.errors.push(err);
      $timeout(popError, 3500);
      $scope.$digest();
    };

    var popError = function(){
      vm.errors.shift();
      $scope.$digest();
    };

    var updateTime = function(){
      if(!vm.game) return;
      var now = new Date().getTime();
      var shiftedBegin = vm.game.begin - vm.timeDifference;
      var shiftedEnd = vm.game.end - vm.timeDifference;

      var percentage =  100 * (shiftedEnd - now) / (shiftedEnd - shiftedBegin);
      vm.progressStyle = "width: " + percentage + "%;";
      
    };

    this.socketReturn = function (err) {
      if (err) {
        console.log("Callback error: ", err);
        vm.pushError(err);
      }
      vm.processing = false;
      $scope.$digest();
    };

    $interval(updateTime, 1000);

    this.loadGame = function (gameData) {
      vm.game = gameData;
      console.log("Game is now", vm.game);
      for (var x in vm.game.players) {
        var p = vm.game.players[x];
        if(p.id == vm.playerId){
          vm.player = p;
          break;
        }
      }

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
        "<button ng-show='{{position}} <= 0' class='btn btn-block btn-default text-uppercase' ng-click='submitPicture()' type='submit'>Submit</button>"
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
            seed: [],
            playerId: scope.$parent.vm.playerId,
            position: -1,
            votingRound: -1,
            votes: null
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

        scope.submitPicture = function () {
          scope.drawing.playerId = scope.$parent.vm.playerId;
          console.log("sending", scope.drawing);
          SocketFactory.emit('drawing', scope.drawing, scope.$parent.vm.socketReturn);
        };

        scope.updatePictures = function (gameData) {
          var gameDrawing = null;

          // Update the player seed
          if (position == -1) {
            gameDrawing = _.findWhere(gameData.drawings, {
              playerId: scope.$parent.vm.playerId,
              submitted: false
            });
            if (!gameDrawing){
              console.log("No gameDrawing");
              return;
            }

            if(scope.drawing.votingRound != gameDrawing.votingRound){
              // We must display a new picture to draw
              clearCanvas();
              draw(gameDrawing.seed);
            }
            // var newLines = _.without(gameDrawing.seed, scope.drawing.seed);
            // if (newLines) {
            //   draw(newLines);
            //   scope.drawing.seed = gameDrawing.seed;
            // }

            scope.drawing.seed = gameDrawing.seed;
            scope.drawing.playerId = gameDrawing.player;
            scope.drawing.position = gameDrawing.position;
            scope.drawing.votingRound = gameDrawing.votingRound;
            scope.drawing.votes = gameDrawing.votes;
          
          }

          // Draw the pictures to be voted on
          else if (gameData.state.name == "vote") {
            if (gameData.votingRound != scope.drawing.votingRound) { // Voting round has changed
              console.log("Updating the voting one");
              scope.drawing.votingRound = gameData.votingRound;
              gameDrawing = _.findWhere(gameData.drawings, {
                position: position,
                votingRound: scope.drawing.votingRound
              });
              if (!gameDrawing) return;
              clearCanvas();
              draw(gameDrawing.seed);
              draw(gameDrawing.lines);
              scope.drawing = gameDrawing;
            }
          }

        };

        scope.$parent.$watch('state', function(oldState, newState){
          console.log("Caught the state change", newState);
        });

        SocketFactory.on('game', function (gameData) {
          console.log("Drawing -> game received");
          if(gameData.state.name in ['prep', 'result']) clearCanvas();
          scope.updatePictures(gameData);
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
    .controller('GameCtrl', GameCtrl)
    .directive("drawing", DrawingDirective)
    .directive('resize', ResizeDirective);
})();