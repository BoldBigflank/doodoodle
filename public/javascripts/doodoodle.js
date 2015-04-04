
// Socket.io
var socket = io.connect('http://localhost:3000');
// var socket = io.connect('http://192.168.29.134:3000');
console.log("id", socket);

// Angular
angular.module('doodoodleApp', ['components'])
    .controller('GameCtrl', ['$scope', function($scope) {
        $scope.playerId = 0;
        $scope.joinData = {};
        $scope.isPlayer = isPlayer;
        $scope.playerName = "";
        $scope.room = "";
        $scope.error = null;

        $scope.loadGame = function(gameData){
            $scope.game = gameData;
            console.log("Game is now", $scope.game);
            for( var x in $scope.game.players){
                p = $scope.game.players[x];
                // if(p.id == $scope.playerId){
                //     $scope.player = p;
                //     // Shift players at the current player
                //     $scope.otherPlayers = $scope.game.players.slice(x+1).concat( $scope.game.players.slice(0,x) );
                //     break;
                // }
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

        }

        if(!$scope.isPlayer){
            $scope.startHost();
        }
    
        socket.on('game', function(gameData){
            console.log("gameData received");
            $scope.loadGame(gameData);
        });
    }]);