
// Socket.io
// var socket = io.connect('http://localhost:3000');
var socket = io.connect('http://192.168.29.235:3000');
console.log("id", socket);

// Angular
angular.module('doodoodleApp', [])
    .controller('GameCtrl', ['$scope', function($scope) {
        $scope.playerId = 0;
        $scope.joinData = {};
        $scope.isPlayer = isPlayer;
        $scope.playerName = "";
        $scope.room = "";
        $scope.error = null;
        $scope.drawingData = "drawingData";

        $scope.loadGame = function(gameData){
            $scope.game = gameData;
            console.log("Game is now", $scope.game);
            for( var x in $scope.game.players){
                p = $scope.game.players[x];
            }
            $scope.$digest();
        };

        $scope.loadPlayer = function(playerData){
            $scope.player = playerData;
            console.log("Player is now", $scope.player);
            $scope.$digest();
        };
    
        // Used to iterate each life
        $scope.range = function(n) {
            return new Array(n);
        };

        $scope.startGame = function(){
            console.log("startGame");
            socket.emit('start', function(err, game){
                    console.log(err, game);

            });
        };

        $scope.startHost = function(){
            $scope.player = false;
            socket.emit('host', function(data){
                // Join the game, get our player id back
                console.log("host", data);
                // $scope.playerId = data.player.id;
                $scope.loadGame(data.game);
                // $scope.loadPlayer(data.player);
            });
        };

        $scope.startPlayer = function(){
            $scope.player = true;
            console.log("Name " + $scope.joinData.name );
            console.log("room " + $scope.joinData.room);
            socket.emit('join', $scope.joinData, function(err, data){
                $scope.error = err;
                if(err) {
                    $scope.error = "Error:" + err;
                }
                else {
                    console.log("joined", data);
                    $scope.loadGame(data.game);
                }
                $scope.$digest();
            });
        };

        $scope.action = function(action){
            $scope.processing = true;
            console.log("Control action: " + action);
            socket.emit(action, function(err, data){
                if(err) console.log(err)
                $scope.processing = false;
            })
        }

        $scope.submitPicture = function(){
            var data = {}
            data.drawingData = $scope.linesArray;

            socket.emit('drawing', data, function(err, game){
                console.log(err, game);

            });
        }

        if(!$scope.isPlayer){
            $scope.startHost();
        }
    
        socket.on('game', function(gameData){
            console.log("gameData received");
            $scope.loadGame(gameData);
        });

        socket.on('drawing', function(drawingData){
            console.log("drawingData received", drawingData);
            // Draw the picture on the canvas, why not?
        })
    }])
    .directive("drawing", function ($document) {
      return {
        restrict: "A",
        link: function ($scope, element, attrs, GameCtrl) {
          var canvas = element[0];
          var ctx = element[0].getContext('2d');
          $scope.linesArray = []; // An array of lines
          var currentLine;
          // variable that decides if something should be drawn on mousemove
          var drawing = false;

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

          var start = function (event) {
            // Mouse and touch input
            var coord;
            if (event.offsetX !== undefined) {
              coord = canvasCoord({"x": event.offsetX, "y": event.offsetY});
            } else { // Firefox compatibility
              coord = canvasCoord({"x": event.layerX, "y": event.layerY });
            }

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
            drawing = true;

            // start a new line for saving
            currentLine = [coord];

          };

          var move = function (event) {
            event.preventDefault();
            if (drawing) {
              var coord;
              // get current mouse position
              if (event.offsetX !== undefined) {
                coord = canvasCoord({"x": event.offsetX, "y": event.offsetY});
              } else {
                coord = canvasCoord({"x": event.layerX, "y": event.layerY});
              }

              ctx.lineTo(coord.x, coord.y);
              ctx.stroke();

              // Add to line for saving
              currentLine.push(coord);
            }

          };

          var end = function (event) {
            if (drawing) {
              // Push the line for saving
              $scope.linesArray.push(currentLine);
              // console.log(JSON.stringify(linesArray));
              $scope.drawingData = JSON.stringify($scope.linesArray);
              $scope.$digest();
            }

            // stop drawing
            drawing = false;
          };

          // *** Mouse Controls ***
          element.bind('mousedown', start);
          element.bind('mousemove', move);
          $document.bind('mouseup', end);

          // *** Touch Controls ***
          element.bind('touchstart', start);
          element.bind('touchmove', move);
          element.bind('touchend', end);

        }
      };
    })
    .directive('resize', function ($window) {
      return function ($scope, element) {
        $scope.$watch(function () {
          return { 'h': $window.innerHeight, 'w': $window.innerWidth };
        }, function (newValue, oldValue) {
          $scope.windowHeight = newValue.h;
          $scope.windowWidth = newValue.w;

          $scope.style = function () {
            var newHeight = newValue.h - 100;
            return {
              'height': newHeight + 'px',
              'width': (0.75 * newHeight) + 'px'
            };
          };

        }, true);

        angular.element($window).bind('resize', function () {
          $scope.$apply();
        });
      };
    });