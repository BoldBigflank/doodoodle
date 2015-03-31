var _ = require('underscore')
  , fs = require('fs')
var EventEmitter = require('events').EventEmitter;

exports.eventEmitter = new EventEmitter();


var games=[];
var rooms=[];
var players = [];
var playerToGame = {};

// BOOMOIO Settings
var maxPlayers = 6;
var startHand = 7;
var startTime = 60;
var startLives = 5;

var STATE = {
  PREP :    { value: 0, name:"prep", title: "Preparation", controls:["prep-buttons"]},
  DRAW:     { value: 1, name:"draw", title: "Draw Phase", controls:["draw", "reset", "submit"]},
  VOTE :    { value: 2, name:"vote", title: "Vote Phase", controls:["vote1", "vote2"]},
  RESULT:   { value: 3, name:"result", title: "Results", controls:["next"]}
};



var newRoom = function(){
    roomString = "";
    // 
    validCharacters = "BCDFGHJKLMNPQRSTVWXYZ";
    // Get four random
    while(roomString.length < 4){
        roomString += validCharacters.substr(Math.floor(Math.random()*validCharacters.length), 1);
    }
    return roomString;
};

var init = function(cb){
    fs.readFile('names.txt', function(err, data) {
        if(err) throw err;
        names = data.toString().split("\n");
    });
};

var newGame = function(host, cb){
    var game = {
        id:games.length,
        timer:startTime,
        discard:[],
        players:[],
        turn:null,
        direction:1,
        state:STATE.PREP,
        room:newRoom(),
        host:host
    };
    games.push(game);
    return game;
};

var getGame = function(room){
    return _.find(games, function(game){ return game.room == room });
}

var newRound = function(game){
    // Deal everyone up to 7 cards
    for(var p in game.players){
        var player = game.players[p];
        // while(player.hand.length < startHand) drawCards(game, player, 1);
    }
    game.timer = startTime;
};

// var nextPlayer = function(gameId){
//     var game = games[gameId];
//     console.log("game", game);
//     // Find the current player index
//     var currentPlayer = game.players[game.turn];
//     // var currentPlayer = _.findWhere(game.players, {id:game.turn});
//     var playerIndex = game.players.indexOf(currentPlayer);
//     for(var i = 0; i < game.players.length; i++){
//         game.turn = (game.turn + game.direction) % game.players.length;
//         while (game.turn < 0) game.turn += game.players.length; // How do I loop the number?
//         console.log("game.turn",game.turn);
//         if(game.players[game.turn].state == 'active') {
//             games[gameId] = game;
//             return;
//         }
//     }
    
// };

exports.playerToGame = function(playerId, cb){
    console.log("playerToGame", playerId, playerToGame[playerId]);
    return playerToGame[playerId];
};

exports.host = function(uuid, cb){
    // Create a game, but do not add the player to it
    if(uuid === undefined) {
        cb("UUID not found");
        return;
    }
    var game = _.find(games, function(game){ return game.host == uuid });
    if(typeof game == "undefined") {
        game = newGame(uuid);
        // games.push(game);
    }
    cb(null, game)
}

exports.join = function(uuid, name, room, cb){
    if(uuid === undefined) {
        cb("UUID not found");
        return;
    }
    room = room.toUpperCase()
    var game = getGame(room);
    if(typeof game == "undefined") {
        cb("Room " + room + " not found")
        // console.log("Room " + room + " not found, creating")
        // game = newGame(room);
        return;
    }
    // game.now = new Date().getTime()
    var player = _.findWhere( game.players, {id: uuid} )
    if( typeof player === 'undefined'){
        var player = {
            id: uuid
            , name: name
            , lives: startLives
            , state: 'active'
            , position:-1
            , score: 0
            , room: room
        }
        // Take a hand of cards from the deck
        playerToGame[player.id] = game.room;
    }
    if(_.where(game.players, {state:'active'}).length >= maxPlayers) player.state = 'spectating';

    players.push(player); // All players
    game.players.push(player); // Players for the game
    
    cb(null, game);
};

exports.start = function(room, cb){
    var game = getGame(room);
    if(!game) return cb("game not found", null);
    // var activePlayers = _.find(game.players, function(player){(player.state=="active")});
    // if(!activePlayers || activePlayers.length < 2) return cb("Not enough players to start", null);
    if(game.players.length < 2) return cb("Not enough players to start", null);
    
    game.state = STATE.DRAW;
    for( var i in game.players){
        var player = game.players[i];
        if(player.state == 'active'){
            game.turn = parseInt(i);
            break;
        }
    }
    cb(null, game);
};

exports.leave = function(room, uuid, cb){
    var game = getGame(room)
    if(!game) return;
    // Remove their player
    var player = _.findWith(game.players, {id:uuid});
    if(player){
        if(player.state != "spectating") player.state = "disconnect";
        // If only one active player left, end the round
        if(game.state == "active"){
            if(_.where(game.players, {state:'active'}).length <= 1)
                game.state = "ended";
            else {
                while(_.findWhere(game.players, {position:game.turn}).state != 'active'){
                    game.turn = (game.turn + game.direction) % game.players.length;
                }
            }
        } else if(game.state == "prep") {
            // Remove players from games that haven't started
            game.players = _.without(game.players, player);
        }
        cb(null, {players: game.players, state: game.state, turn: game.turn});
    }
    // game.players = _.without(game.players, player)
};

exports.getScores = function(){
    return _.map(game.players, function(val, key){ return { id:val.id, name:val.name, score:val.score }; })
}

exports.getPlayers = function(){ return players }

exports.getPlayer = function(uuid){ return _.find(players, function(player){ return player.id == uuid })}

exports.getState = function(){ return game.state }

exports.getTitle = function(){ return game.title }

exports.getRound = function(){ return game.round }


exports.getWinner = function(){ return game.winner }

exports.getScoreboard = function(){
    return {
        title: game.title
        , scores: _.map(game.players, function(val, key){ return { id:val.id, name:val.name, score:val.score }; })
        , players: game.players.length
    }

}

exports.setName = function(id, name, cb){
    var p = _.find(game.players, function(player){ return player.id == id })
    if(p) p.name = name
    cb(null, { players: game.players })
}

exports.reset = function(cb){
    init()
    cb(null, game)
}

init()