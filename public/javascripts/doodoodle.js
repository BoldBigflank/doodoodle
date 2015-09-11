// Socket.io
// var socket = io.connect('http://localhost:3000');
// var socket = io.connect('http://192.168.29.235:3000');
// Angular
var app = angular.module('doodoodleApp', []);

app.factory('socket', function ($rootScope) {
  var socket = io.connect(); // Production
  // var socket = io.connect('http://localhost:3000'); // Local
  // var socket = io.connect('http://192.168.29.235:3000');

  return {
    on: function (eventName, data, callback) {
      if (typeof (callback) === 'undefined') callback = data;

      socket.on(eventName, function () {
        var args = arguments;
        callback.apply(socket, args);
      });
    },
    emit: function (eventName, data, callback) {
      if (typeof (callback) === 'function') {
        socket.emit(eventName, data, function () {
          var args = arguments;
          if (callback) {
            callback.apply(socket, args);
          }
        });
      } else {
        socket.emit(eventName, function () {
          var args = arguments;
          if (callback) {
            callback.apply(socket, args);
          }
        });
      }
    }
  };
});

app.controller('GameCtrl', function ($scope, $timeout, socket) {
  $scope.playerId = 0;
  $scope.joinData = {"name":"Alex", "room":"TEST"};
  $scope.isPlayer = isPlayer;
  $scope.playerName = "";
  $scope.room = "";
  $scope.errors = [];
  $scope.drawingData = "drawingData";

  var popError = function(){
    $scope.errors.shift();
    $scope.$digest();
  };

  $scope.loadGame = function (gameData) {
    $scope.game = gameData;
    console.log("Game is now", $scope.game);
    for (var x in $scope.game.players) {
      p = $scope.game.players[x];
    }
    $scope.$digest();
  };

  $scope.startHost = function () {
    $scope.player = false;
    socket.emit('host', function (data) {
      // Join the game, get our player id back
      console.log("host", data);
      // $scope.playerId = data.player.id;
      $scope.loadGame(data.game);
    });
  };

  $scope.startPlayer = function () {
    $scope.player = true;
    console.log("Name " + $scope.joinData.name);
    console.log("room " + $scope.joinData.room);
    socket.emit('join', $scope.joinData, function (err, data) {
      if (!err) {
        console.log("joined", data);
        $scope.loadGame(data.game);
      }
      $scope.$digest();
    });
  };

  $scope.action = function (action) {
    $scope.processing = true;
    console.log("Control action: " + action);
    socket.emit(action, {}, function (err) {
      if (err) {
        console.log("Callback error: ", err);
      }
      $scope.processing = false;
      $scope.$digest();
    });
  };

  if (!$scope.isPlayer) {
    $scope.startHost();
  }

  socket.on('game', function (gameData) {
    console.log("GameCtrl -> game received");
    $scope.loadGame(gameData);
  });

  socket.on('alert', function(data){
      console.log("Alert", data.level, ":", data.message);
      $scope.errors.push(data);
      $scope.$digest();
      $timeout(popError, 3500);
  });


  $scope.$on('$destroy', function (event) {
    socket.removeAllListeners();
    // or something like
    // socket.removeListener(this);
  });

});

app.directive("drawing", function ($document, socket) {
  return {
    template: "<canvas width={{width}}px height={{height}}px scale={{scale}} resize ng-style='style()' class='drawing'></canvas>" +
      "<button ng-show='{{position}} <= 0' class='btn btn-block btn-default text-uppercase' ng-click='submitPicture()' type='submit'>Submit</button>",
    restrict: "A",
    transclude: true,
    scope: {
      "scale": "=scale",
      "width": "=width",
      "height": "=height",
      "position": "=position"
    },
    link: function (scope, element, attrs) {
      if (!position) position = -1;
      // The canvas
      console.log("element", element);
      var canvas = element[0].firstChild;
      var ctx = element[0].firstChild.getContext('2d');

      // The stored lines
      var drawing = {
          lines: null,
          seed: [],
          player: -1,
          position: -1,
          votingRound: -1,
          votes: null
        };

      // Drawing variables
      var position = (attrs.position !== undefined) ? parseInt(attrs.position) : -1;
      var editable = (position <= 0);
      var isDrawing = false;
      var submitted = false;


      var canvasCoord = function (coord) {
        // Modify it based on its scale
        // coord.x -= canvas.getBoundingClientRect().left
        // coord.y -= canvas.getBoundingClientRect().top

        // Modify it based on the canvas's scale
        coord.x *= (canvas.width / parseInt(canvas.style.width, 10));
        coord.y *= (canvas.height / parseInt(canvas.style.height, 10));

        // Clean it up
        coord.x = coord.x.toFixed(2);
        coord.y = coord.y.toFixed(2);
        return coord;
      };

      // Drawing functions
      var startLine = function (coord) {
        // line style
        ctx.strokeStyle = "#df4b26";
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
          if ( line[0] === undefined ) return;
          startLine(line[0]);
          for (var y in line) {
            var point = line[y];
            drawLine(point);
          }
        }
      };

      var clearCanvas = function () {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawing.lines = [];
        drawing.seed = [];
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
        startLine(coord);

        // start a new line for saving
        currentLine = [coord];
        isDrawing = true;
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
            coord = canvasCoord({
              "x": event.layerX,
              "y": event.layerY
            });
          }
          drawLine(coord);
          // Add to line for saving
          // TODO: Only save when the distance is > 3px
          currentLine.push(coord);
        }

      };

      var end = function (event) {
        if (isDrawing) {
          // Push the line for saving
          // $scope.linesArray.push(currentLine);
          if (!drawing.lines) drawing.lines = [];
          drawing.lines.push(currentLine);
          // console.log(JSON.stringify(linesArray));
          // $scope.$digest();
        }
        // stop drawing
        isDrawing = false;
      };

      var vote = function (event) {
        socket.emit('vote', {
          "votingRound": drawing.votingRound,
          position: drawing.position
        }, function (err, game) {
          console.log("Vote callback:", err, game);
        });
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
      if (position > 0) {
        canvas.addEventListener('touchend', vote);
        canvas.addEventListener('mouseup', vote);
      }

      scope.submitPicture = function () {
        console.log("sending", drawing);
        socket.emit('drawing', drawing, function (err, game) {
          console.log(err, game);
          scope.error = err;
          // If there are more to do, replace this with them.
          clearCanvas();
          scope.updatePictures(game);
        });
      };

      scope.votePicture = function () {
        var data = {};
        // data.player = $scope.linesArray;
        console.log("sending", scope.linesArray);
        socket.emit('vote', data, function (err, game) {
          console.log(err, game);
          // TODO: Make the error display

        });
      };

      scope.updatePictures = function (gameData) {
        var gameDrawing = null;

        // Update the player seed
        if (position == -1) {
          console.log("Updating the main drawing");
          gameDrawing = _.findWhere(gameData.round, {
            playerId: io().id,
            lines: null
          });
          if (!gameDrawing){
            console.log("No gameDrawing");
            return;
          }

          var newLines = _.without(gameDrawing.seed, drawing.seed);
          if (newLines) {
            draw(newLines);
            drawing.seed = gameDrawing.seed;
          }

          // console.log("Doing a full update");
          // // draw(gameDrawing.seed);
          // // draw(gameDrawing.lines);
          // drawing = gameDrawing;
        
          drawing.seed = gameDrawing.seed;
          drawing.player = gameDrawing.player;
          drawing.position = gameDrawing.position;
          drawing.votingRound = gameDrawing.votingRound;
          drawing.votes = gameDrawing.votes;
        
        }

        // Draw the pictures to be voted on
        else if (gameData.state.name == "vote") {
          if (gameData.votingRound != drawing.votingRound) { // Voting round has changed
            console.log("Updating the voting one");
            votingRound = gameData.votingRound;
            gameDrawing = _.findWhere(gameData.round, {
              position: position,
              votingRound: votingRound
            });
            if (!gameDrawing) return;
            clearCanvas();
            draw(gameDrawing.seed);
            draw(gameDrawing.lines);
            drawing = gameDrawing;
          }
        }

      };

      socket.on('game', function (gameData) {
        console.log("Drawing -> game received");
        if(gameData.state.name in ['prep', 'result']) clearCanvas();
        scope.updatePictures(gameData);
      });
    }
  };
});

app.directive('resize', function ($window) {
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
});