
// Socket.io
// var socket = io.connect('http://localhost:3000');
// var socket = io.connect('http://192.168.29.235:3000');

// Angular
var app = angular.module('doodoodleApp', [])

app.factory('socket', function ($rootScope) {
      // var socket = io.connect();
      var socket = io.connect('http://localhost:3000');
      // var socket = io.connect('http://192.168.29.235:3000');

      return {
        on: function (eventName, data, callback) {
          if(typeof(callback) === 'undefined') callback = data;

          socket.on(eventName, function () {  
            var args = arguments;
            callback.apply(socket, args);
          });
        },
        emit: function (eventName, data, callback) {
          if(typeof(callback) === 'function' ){
            socket.emit(eventName, data, function () {
              var args = arguments;
              if (callback) {
                callback.apply(socket, args);
              }
            })  
          } else {
            socket.emit(eventName, function () {
              var args = arguments;
              if (callback) {
                callback.apply(socket, args);
              }
            })  
          }
        }
      };
    });

app.controller('GameCtrl', function($scope, socket) {
        $scope.playerId = 0;
        $scope.joinData = {};
        $scope.isPlayer = isPlayer;
        $scope.playerName = "";
        $scope.room = "";
        $scope.error = null;
        $scope.drawingData = "drawingData";
        $scope.currentSeed = []

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
            socket.emit('start', function(err){
                    console.log(err);
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
            console.log("sending", $scope.linesArray);
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

        $scope.$on('$destroy', function (event) {
            socket.removeAllListeners();
            // or something like
            // socket.removeListener(this);
        });
        
    });

app.directive("drawing", function ($document, socket) {
      return {
        restrict: "A",
        link: function ($scope, element, attrs) {
          var canvas = element[0];
          var ctx = element[0].getContext('2d');
          $scope.linesArray = []; // An array of lines
          var currentLine;
          // variable that decides if something should be drawn on mousemove
          var drawing = false;
          var position = (attrs["position"] !== undefined) ? parseInt(attrs["position"]) : -1;
          var editable = (position <= 0);
          

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
          var startLine = function(coord){
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
          }

          var drawLine = function(coord){
            ctx.lineTo(coord.x, coord.y);
            ctx.stroke();
          }

          var clearCanvas = function(){
            ctx.clearRect ( 0 , 0 , canvas.width, canvas.height );
            $scope.linesArray = [];
            $scope.drawingData = "";
          }

          // Event functions
          var start = function (event) {
            console.log("Editable", editable)
            if(!editable) return;
            // Mouse and touch input
            var coord;
            if (event.offsetX !== undefined) {
              coord = canvasCoord({"x": event.offsetX, "y": event.offsetY});
            } else { // Firefox compatibility
              coord = canvasCoord({"x": event.layerX, "y": event.layerY });
            }
            startLine(coord);

            // start a new line for saving
            currentLine = [coord];
            drawing = true;
          };

          var move = function (event) {
            if(!editable) return;
            event.preventDefault();
            if (drawing) {
              var coord;
              // get current mouse position
              if (event.offsetX !== undefined) {
                coord = canvasCoord({"x": event.offsetX, "y": event.offsetY});
              } else {
                coord = canvasCoord({"x": event.layerX, "y": event.layerY});
              }
              drawLine(coord);
              // Add to line for saving
              // TODO: Only save when the distance is > 3px
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

          socket.on('drawing', function(data){
            console.log("drawing received", drawingData)
            if(position != data.position) return;
            var drawingData = data.drawingData
            clearCanvas();
            // Draw the seed
            for (var x in $scope.player.seedLine){
                var line = drawingData[x];
                startLine(line[0]);
                for (var y in line){
                    var point = line[y];
                    drawLine(point);
                }
            }

            // Draw the picture on the canvas, why not?
            for (var x in drawingData){
                var line = drawingData[x];
                startLine(line[0]);
                for (var y in line){
                    var point = line[y];
                    drawLine(point);
                }
            }
          })
        }
      };
    });

app.directive('resize', function ($window) {
      return function ($scope, element, attrs) {
        var scale = (attrs["scale"] !== undefined) ? attrs["scale"] : "1.0";
        $scope.$watch(function () {
          return { 'h': $window.innerHeight, 'w': $window.innerWidth };
        }, function (newValue, oldValue) {
          $scope.windowHeight = newValue.h;
          $scope.windowWidth = newValue.w;

          $scope.style = function () {
            var newHeight = newValue.h * scale;
            return {
              'height': newHeight + 'px',
              'width': (3/4 * newHeight) + 'px'
            };
          };

        }, true);

        angular.element($window).bind('resize', function () {
          $scope.$apply();
        });
      };
    });