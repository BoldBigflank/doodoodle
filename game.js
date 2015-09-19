var _ = require('underscore'),
  fs = require('fs');
var EventEmitter = require('events').EventEmitter;

exports.eventEmitter = new EventEmitter();

var Firebase = require("firebase");

// BOOMOIO Settings
var maxPlayers = 6;
var startHand = 7;
var startTime = 60;
var startLives = 5;

// Doodoodle Settings
// var prepTime = 2 * 1000;
var drawTime = 120 * 1000;
var voteTime = 10 * 1000;

var STATE = {
  PREP :    { value: 0, name: "prep",   title: "Preparation"},
  DRAW:     { value: 1, name: "draw",   title: "Draw Phase" },
  VOTE :    { value: 2, name: "vote",   title: "Vote Phase" },
  RESULT:   { value: 3, name: "result", title: "Results"    }
};


var newRoom = function () {
    var roomString = "";
    var validCharacters = "BCDFGHJKLMNPQRSTVWXYZ";
    // Get four random
    while (roomString.length < 4) {
        roomString += validCharacters.substr(Math.floor(Math.random()*validCharacters.length), 1);
    }
    // TODO: Check the database to prevent duplicate game rooms

    return roomString;
};

var init = function (cb) {
    fs.readFile('names.txt', function (err, data) {
        if (err) throw err;
        names = data.toString().split("\n");
    });
};

var newGame = function (host, cb) {
    var game = {
        timer:startTime,
        players:[],
        turn:null,
        state:STATE.PREP,
        round:0,
        theme:pickTheme(),
        votingRound:-1,
        room:newRoom(),
        host:host,
        begin:null,
        end:null,
        now:null
    };
    return game;
};

var getGame = function (room, cb) {
    console.log("Getting Game", room);
    var gameRef = new Firebase("https://doodoodle.firebaseio.com/games/" + room);
    gameRef.once('value', function(game){
        cb(game.val());
    });
};

var postGame = function (game) {
    var gameRef = new Firebase("https://doodoodle.firebaseio.com/games/" + game.room);
    gameRef.set(game);
};

var deleteGame = function(game) {
  var gameRef = new Firebase("https://doodoodle.firebaseio.com/games/" + game.room);
  gameRef.set(null);
};


var newRound = function (game, cb) {
    var drawings = []; // An array of Drawing objects
    // Give every active player two starting doodles

    var activePlayers = _.where(game.players, {role:'player', state: "active"});
    activePlayers = _.shuffle(activePlayers); // Randomize pairings
    _.each(game.players, function(element, index, list) {element.waiting = false;});

    // For every active person in the players
    var votingRound = 0;
    newDrawingSeeds(activePlayers.length, function(roundSeeds){
      for(var p in activePlayers){
          var player = activePlayers[p];
          
          var drawing = {
              playerId: player.id,
              seed: roundSeeds[p],
              position: 1,
              votingRound: votingRound,
              lines: null,
              votes: [player.id],
              submitted: false
          };
          drawings.push(drawing);

          partnerId = activePlayers[(p+1) % activePlayers.length ].id;
          var drawing2 = {
              playerId: partnerId,
              seed: roundSeeds[p],
              position: 2,
              votingRound: votingRound,
              lines: null,
              votes: [partnerId],
              submitted: false
          };
          drawings.push(drawing2);

          votingRound++;
      }

      game.drawings = drawings;
      cb(game);
    });
    
};

var newDrawingSeeds = function(count, cb) {
    var seedRef = new Firebase("https://doodoodle.firebaseio.com/seeds_list");
    seedRef.once("value", function(data){
      seeds = data.val();
      cb(_.sample(seeds, count));
    });
};

var pickTheme = function(){
    return _.sample(["sports", "animals", "travel", "people", "music", "events"]);
};

var updateScores = function(game){
    for(var x in game.drawings){
        var drawing = game.drawings[x];
        var player = _.find(game.players, {"id":drawing.playerId});
        player.score += drawing.votes.length-1;
    }
};

var setSocketToGame = function(socketId, playerId, gameRoom, cb){
    var playerRef = new Firebase("https://doodoodle.firebaseio.com/players/" + socketId);
    playerRef.set({playerId:playerId, gameRoom:gameRoom}, cb);
};

exports.socketToGame = function(socketId, cb){
    var playerRef = new Firebase("https://doodoodle.firebaseio.com/players/" + socketId);
    playerRef.once("value", function(data){
        console.log("Socket:", socketId, "Game:", data.val());
        cb(data.val());
    });
    // return socketToGame[playerId];
};

var pushSeed = function(seed, cb){
  var seedRef = new Firebase("https://doodoodle.firebaseio.com/seeds_list");
  seedRef.push(seed);
};

exports.host = function(playerId, cb){
    // Create a game, but do not add the player to it
    if(playerId === undefined) {
        cb("playerId not found");
        return;
    }

    game = newGame(playerId);
    setSocketToGame(playerId, null, game.room);
    postGame(game); // Export to Firebase
    cb(null, game);
};

exports.join = function(socketId, data, cb){
    var name = data.name;
    var room = data.room;
    var playerId = data.playerId;
    if(socketId === undefined) {
        cb("socketId not found");
        return;
    }
    room = room.toUpperCase();
    getGame(room, function(game){
        if(typeof game == "undefined") {
            cb("Room " + room + " not found");
            return;
        }
        if(!playerId){
            cb("playerId not found");
            return;
        }

        var player = _.findWhere( game.players, {id: playerId} );
        if(player) player.name = name;
        
        if( typeof player === 'undefined'){
            player = {
                id: playerId,
                name: name,
                state: 'active',
                score: 0,
                room: room,
                waiting: false,
                role: 'player'
            };
            
            if(_.where(game.players, {role:'player', state:'active'}).length >= maxPlayers) player.role = 'spectator';

            if(!game.players){
              game.players = [];
            }

            game.players.push(player); // Players for the game
        }
        setSocketToGame(socketId, player.id, game.room);
        player.state = "active"; // They've joined or rejoined

        // DEBUG
        if(game.room == "DRAW"){
          // Set the timer
          var now = new Date().getTime(); // Milliseconds
          game.begin = now;
          game.end = now + drawTime;
          game.now = now;
        }

        postGame(game); // Export to Firebase
        cb(null, game);
    });
    
};

exports.start = function(room, cb){
    getGame(room, function(game){
        if(!game) return cb("game not found", null);
        var activePlayers = _.pluck(_.where(game.players, {role:'player', state: "active"}), 'id');
        if(activePlayers.length < 3) return cb("Not enough players to start", null);
        if(game.state.name != STATE.PREP.name && game.state.name != STATE.RESULT.name) return cb("Now is not the time to start a new round");

        game.state = STATE.DRAW;
        if( game.round >= 3 ){
            _.each(game.players, function(player){
                player.score = 0;
            });
            game.round = 0;
        }
        game.round++;
        newRound(game, function(game){
          var now = new Date().getTime(); // Milliseconds
          game.begin = now;
          game.end = now + drawTime;
          game.now = now;
          
          postGame(game); // Export to Firebase
          cb(null, game);
        });
    });
};

exports.saveDrawing = function(playerId, room, data, cb){
    getGame(room, function(game){
        if(!game) return cb("game not found", null);
        var player = _.findWhere( game.players, {id: playerId} );
        if(!player) return cb("player not found", null);
        var drawing = _.findWhere( game.drawings, {playerId: player.id, votingRound: data.votingRound, position: data.position});
        if(!drawing) { return cb("You are not a part of this round", null); }
        drawing.lines = data.lines;
        drawing.submitted = true;

        if (_.findWhere( game.drawings, {submitted: false, playerId:player.id} ) === undefined) {
            player.waiting = true;
        }

        if (_.findWhere( game.players, {waiting: false, state:'active'} ) === undefined) {
            _.each(game.players, function(element, index, list) {element.waiting = false;});
            game.state = STATE.VOTE;
            game.votingRound = 0;
            setWaiting(game);
            // Set the timer
            var now = new Date().getTime(); // Milliseconds
            game.begin = now;
            game.end = now + voteTime;
            game.now = now;
            
        }
        // EXTRA Put a line from the drawing into the seeds
        if(drawing.lines) {
            var seedLine = _.sample(drawing.lines);
            pushSeed([seedLine.points]);
        }
        postGame(game); // Export to Firebase
        cb(null, game);
    });
    

};

var setWaiting = function(game){
    var drawingsThisRound = _.where(game.drawings, {votingRound:game.votingRound});
    var allVotes = _.flatten(_.pluck(drawingsThisRound, 'votes'));
    _.each(allVotes, function(playerId){
      var p = _.findWhere(game.players, {id:playerId});
      p.waiting = true;
    });
};

exports.vote = function(playerId, room, votingRound, position, cb){
    getGame(room, function(game){
        if(!game) return cb("game not found", null);
        if(game.votingRound != votingRound) return cb("Too late, wrong round");
        var player = _.findWhere( game.players, {id: playerId} );
        if(!player) return cb("player not found", null);
        var drawingsThisRound = _.where(game.drawings, {votingRound:votingRound});
        var allVotes = _.flatten(_.pluck(drawingsThisRound, 'votes'));
        var hasVoted = _.contains(allVotes, playerId);
        
        if(hasVoted) return cb("You've already voted this round");
        var drawing = _.findWhere(game.drawings, {votingRound:votingRound, position:position});
        
        if(drawing.votes === null) drawing.votes = [drawing.playerId];
        drawing.votes.push(playerId);
        player.waiting = true;
        // Check here to move to the next voting round/Result phase
        var activePlayers = _.pluck(_.where(game.players, {role:'player', state: "active"}), 'id');

        // If there are no active players not in the allVotes list, continue
        var votersLeft = _.difference(activePlayers, allVotes, [playerId]);
        
        if(votersLeft.length === 0) {
            _.each(game.players, function(element, index, list) {element.waiting = false;});
            game.votingRound += 1;
            setWaiting(game);

            // TODO: Reset the start/end times
            var now = new Date().getTime(); // Milliseconds
            game.begin = now;
            game.end = now + voteTime;
            game.now = now;
            
        }
        if(game.votingRound >= activePlayers.length){
            updateScores(game);
            game.state = STATE.RESULT;
        }

        postGame(game); // Export to Firebase
        cb(null, game);
    });
    
};

exports.leave = function(playerId, room, cb){
    getGame (room, function(game) {
        if(!game) return;
        // Remove their player
        var player = _.findWhere(game.players, {id:playerId});
        if(player){
            // TODO: What should we do when a person leaves?
            if(player.state == "active"){
              player.state = "disconnect";
            }
            
            postGame(game);
            cb(null, {players: game.players, state: game.state, turn: game.turn});
            setSocketToGame(playerId, null, null);
        }
        else if (game.host == playerId) {
            console.log("Host has left, deleting game", room);
            deleteGame(game);
            cb(null);
        }
        
    });
    
};

exports.getScores = function(){
    return _.map(game.players, function(val, key){ return { id:val.id, name:val.name, score:val.score }; });
};

exports.getState = function(){ return game.state; };

exports.getRound = function(){ return game.round; };

exports.reset = function(cb){
    postGame(game); // Export to Firebase
    cb(null, game);
};

// A Debug DRAW room
drawGame = newGame("12345");
drawGame.room = "DRAW";
drawGame.state = STATE.DRAW;
postGame(drawGame);