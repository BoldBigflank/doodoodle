// Socket.io
// var socket = io.connect('http://localhost:3000');
// var socket = io.connect('http://192.168.29.235:3000');
// Angular
var app = angular.module('doodoodleApp', ['ngCookies']);

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

app.controller('GameCtrl', function ($scope, $timeout, $interval, $cookies, socket) {
  $scope.playerId = 0;
  $scope.joinData = {"name":"Alex", "room":"DRAW"}; // DEBUG DATA
  $scope.player = null;
  $scope.isPlayer = isPlayer;
  $scope.playerName = "";
  $scope.room = "";
  $scope.errors = [];
  $scope.drawingData = "drawingData";
  $scope.timeDifference = 0;
  
  if($cookies.get("name")){
    $scope.joinData.name = $cookies.get("name");
  }
  if($cookies.get("room")){
    $scope.joinData.room = $cookies.get("room");
  }
  
  var generatePlayerId = function(){
    var id = '_' + Math.random().toString(36).substr(2, 9);
    $cookies.put("playerId", id);
    return id;
  };

  $scope.playerId = ($cookies.get("playerId") !== undefined) ? $cookies.get("playerId") : generatePlayerId();
  
  var popError = function(){
    $scope.errors.shift();
    $scope.$digest();
  };

  var updateTime = function(){
    if(!$scope.game) return;
    var now = new Date().getTime();
    var shiftedBegin = $scope.game.begin - $scope.timeDifference;
    var shiftedEnd = $scope.game.end - $scope.timeDifference;

    var percentage =  100 * (shiftedEnd - now) / (shiftedEnd - shiftedBegin);
    $scope.progressStyle = "width: " + percentage + "%;";
    
  };

  

  $interval(updateTime, 1000);

  $scope.loadGame = function (gameData) {
    $scope.game = gameData;
    console.log("Game is now", $scope.game);
    for (var x in $scope.game.players) {
      var p = $scope.game.players[x];
      if(p.id == $scope.playerId){
        $scope.player = p;
        break;
      }
    }

    // Check the time difference
    $scope.timeDifference = gameData.now - new Date().getTime();

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
    $scope.joinData.playerId = $scope.playerId; // Old ID if we have it
    socket.emit('join', $scope.joinData, function (err, game) {
      if (!err) {
        console.log($scope.joinData.name, "joined", game.room);
        $scope.loadGame(game);

        // Set the cookies
        $cookies.put("name", $scope.joinData.name);
        $cookies.put("room", $scope.joinData.room);
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
  } else {
    var inputRoom = document.getElementById("inputRoom");
    inputRoom.focus();
    setTimeout(function () { inputRoom.select(); }, 10);

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

app.directive("drawing", function ($document, $cookies, socket) {
  return {
    template: "<table ng-show='{{position}} <= 0' style='margin:auto;' class=''> <tr style='height:25px'> <td ng-repeat='c in colors' bgcolor='{{c}}' ng-class='{\"colorPicked\": c == color }' width=25px ng-click='changeColor(c)'> </tr> </table>" +
      "<canvas width={{width}}px height={{height}}px scale={{scale}} resize ng-style='style()' class='drawing'></canvas>" +
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
        console.log("Parent says playerId is", scope.$parent.playerId);
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

      if (!position) position = -1;
      // The canvas
      var canvas = element[0].getElementsByTagName('canvas')[0];
      var ctx = element[0].getElementsByTagName('canvas')[0].getContext('2d');

      // The stored lines
      scope.drawing = {
          lines: null,
          seed: [],
          playerId: scope.$parent.playerId,
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
      };

      var vote = function (event) {
        console.log("Voting", scope.drawing.votingRound, scope.drawing.position);
        socket.emit('vote', {
          "votingRound": scope.drawing.votingRound,
          position: scope.drawing.position
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
        scope.drawing.playerId = scope.$parent.playerId;
        console.log("sending", scope.drawing);
        socket.emit('drawing', scope.drawing, function (err, game) {
          console.log(err, game);
          scope.error = err;
          if(game){
            // If there are more to do, replace this with them.
            clearCanvas();
            scope.updatePictures(game);
          }
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
          console.log("Updating the main drawing", gameData);
          gameDrawing = _.findWhere(gameData.drawings, {
            playerId: scope.$parent.playerId,
            submitted: false
          });
          if (!gameDrawing){
            console.log("No gameDrawing");
            return;
          }

          var newLines = _.without(gameDrawing.seed, scope.drawing.seed);
          if (newLines) {
            draw(newLines);
            scope.drawing.seed = gameDrawing.seed;
          }

          // console.log("Doing a full update");
          // // draw(gameDrawing.seed);
          // // draw(gameDrawing.lines);
          // drawing = gameDrawing;
        
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