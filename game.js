var _ = require('underscore');
var fs = require('fs');
var LZString = require('lz-string');
var EventEmitter = require('events').EventEmitter;

exports.eventEmitter = new EventEmitter();

var Firebase = require("firebase");
var firebaseUrl = "https://doodoodle.firebaseio.com/";

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
        votingRound:0,
        room:newRoom(),
        host:host,
        begin:null,
        end:null,
        now:null
    };
    return game;
};

var getGame = function (room, cb) {
    // console.log("Getting Game", room);
    var gameRef = new Firebase("https://doodoodle.firebaseio.com/games/" + room);
    gameRef.once('value', function(game){
        cb(game.val());
    });
};

var postGame = function (game) {
    var gameRef = new Firebase(firebaseUrl + "games/" + game.room);
    gameRef.set(game);
};

var deleteGame = function(game) {
  var gameRef = new Firebase(firebaseUrl + "games/" + game.room);
  gameRef.set(null);
};

var deleteGames = function() {
  var gamesRef = new Firebase(firebaseUrl + "games");
  gamesRef.set(null);
};

var approveSeed = function(seedId, cb){
  var oldSeedRef = new Firebase(firebaseUrl + "seeds_list/" + seedId);
  oldSeedRef.once('value', function(seed){
    var newSeedRef = new Firebase(firebaseUrl + "seeds");
    newSeedRef.push(seed.val());
    oldSeedRef.set(null);
    cb();
  });
};

var deleteSeed = function(seedId, cb){
  var seedRef = new Firebase(firebaseUrl + "seeds_list/" + seedId);
  seedRef.set(null);
  cb();
};

var getNextSeed = function(cb){
    // Get a new seed to test
    var seedsListRef = new Firebase(firebaseUrl + "seeds_list/");
    seedsListRef.limitToFirst(1).once('value', function(seedsRef){
        seedsRef.forEach(function(seed){
            console.log(seed.key());
            cb ({"seedId":seed.key(), "seed":seed.val()});
        });
    });
};

exports.updateSeed = function (data, cb){
    console.log("updateSeed", data.action, data.seedId);
    if(data.seedId && data.action == "approve"){
        approveSeed(data.seedId, function(){
            getNextSeed(cb);
        });
    }
    else if(data.seedId && data.action == "reject"){
        deleteSeed(data.seedId, function(){
            getNextSeed(cb);
        });
    } else {
        getNextSeed(cb);
    }
    
};

var newRound = function (game, cb) {
    var drawings = {}; // An array of Drawing objects
    // Give every active player two starting doodles

    var activePlayers = _.where(game.players, {role:'player', state: "active"});
    activePlayers = _.shuffle(activePlayers); // Randomize pairings
    _.each(game.players, function(element, index, list) {element.waiting = false;});

    // For every active person in the players
    var votingRound = 0;
    var drawingKey = "";
    newDrawingSeeds(activePlayers.length, function(roundSeeds){
      for(var p in activePlayers){
          var player = activePlayers[p];
          var compressedSeed = LZString.compressToUTF16(JSON.stringify(roundSeeds[p]));
          var drawing = {
              playerId: player.id,
              seed: compressedSeed,
              position: 1,
              votingRound: votingRound,
              lines: null,
              submitted: false
          };
          drawingKey = "r" + votingRound + "p" + 1;
          drawings[drawingKey] = drawing;

          partnerId = activePlayers[(p+1) % activePlayers.length ].id;
          var drawing2 = {
              playerId: partnerId,
              seed: compressedSeed,
              position: 2,
              votingRound: votingRound,
              lines: null,
              submitted: false
          };
          drawingKey = "r" + votingRound + "p" + 2;
          drawings[drawingKey] = drawing2;

          votingRound++;
      }

      game.drawings = drawings;
      game.votes = [];
      game.votingRound = 0;
      cb(game);
    });
    
};

var newDrawingSeeds = function(count, cb) {
    var seedRef = new Firebase(firebaseUrl + "seeds");
    seedRef.once("value", function(data){
      seeds = data.val();
      cb(_.sample(seeds, count));
    });
};

var pickTheme = function(){
    return _.sample(["sports", "animals", "travel", "people", "music", "events"]);
};

var setState = function(game, state, cb){
    game.state = state;
    if(state == STATE.PREP){
        cb(game);
    } else if (state == STATE.DRAW) {
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
            cb(game);
        });
    } else if (state == STATE.VOTE) {
        _.each(game.players, function(player, index, list) {
            player.waiting = false;
            // The creators
            if(_.findWhere(game.drawings, {votingRound:game.votingRound, playerId:player.id}) !== undefined){
                player.waiting = true;
            }
            // The voters
            if(_.findWhere(game.votes, {votingRound:game.votingRound, playerId:player.id}) !== undefined){
                player.waiting = true;
            }
        });
        // game.votingRound = 0;
        // Set the timer
        var now = new Date().getTime(); // Milliseconds
        game.begin = now;
        game.end = now + voteTime;
        game.now = now;
        cb(game);
    } else if (state == STATE.RESULT) {
        var scores = _.groupBy(game.votes, function(vote){return vote.ownerId;});
        _.each(scores, function(value, key, list){
            // var player = _.find(game.players, {"id":key});
            var player = game.players[key];
            player.score += value.length;
        });
        cb(game);
    }
};

var setSocketToGame = function(socketId, playerId, gameRoom, cb){
    var playerRef = new Firebase(firebaseUrl + "players/" + socketId);
    playerRef.set({playerId:playerId, gameRoom:gameRoom}, cb);
};

exports.socketToGame = function(socketId, cb){
    var playerRef = new Firebase(firebaseUrl + "players/" + socketId);
    playerRef.once("value", function(data){
        console.log("Socket:", socketId, "Game:", data.val());
        cb(data.val());
    });
    // return socketToGame[playerId];
};

var pushSeed = function(seed, cb){
  var seedRef = new Firebase(firebaseUrl + "seeds_list");
  seedRef.push(seed);
};

exports.host = function(socketId, playerId, cb){
    // Create a game, but do not add the player to it
    if(socketId === undefined) {
        cb("socketId not found");
        return;
    }

    game = newGame(playerId);
    setSocketToGame(socketId, playerId, game.room);
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
        if(!game) {
            cb("Room " + room + " not found");
            return;
        }
        if(!playerId){
            cb("playerId not found");
            return;
        }

        // var player = _.findWhere( game.players, {id: playerId} );
        if(!game.players) game.players = [];
        var player = game.players[playerId];
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

            game.players[player.id] = player; // Players for the game
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

        setState(game, STATE.DRAW, function(game){
            postGame(game); // Export to Firebase
            cb(null, game);
        });
    });
};

exports.saveDrawing = function(playerId, room, data, cb){
    var messages = [];
    getGame(room, function(game){
        if(!game) return cb("game not found", null);
        // var player = _.findWhere( game.players, {id: playerId} );
        var player = game.players[playerId];
        if(!player) return cb("player not found", null);
        var drawing = _.findWhere( game.drawings, {playerId: player.id, votingRound: data.votingRound, position: data.position});
        if(!drawing) { return cb("You are not a part of this round", null); }
        drawing.lines =  data.lines; // A compressed string
        drawing.submitted = true;
        messages.push({"recipient":game.host, "channel":"event", "data":"{event:'drawing'}"});

        if (_.findWhere( game.drawings, {submitted: false, playerId:player.id} ) === undefined) {
            player.waiting = true;
        }

        if (_.findWhere( game.players, {waiting: false, state:'active'} ) === undefined) { // Drawings are done
            setState(game, STATE.VOTE, function(game){
                postGame(game); // Export to Firebase
                messages.push({ "recipient":game.room, "channel":"game", "data":game });
                cb(null, messages);
            });
        } else {
            postGame(game); // Export to Firebase
            messages.push({ "recipient":game.room, "channel":"game", "data":game });
            cb(null, messages);
        }

        // EXTRA Put a line from the drawing into the seeds
        if(data.lines) {
            decompressedLines = JSON.parse( LZString.decompressFromUTF16(data.lines) );
            var seedLine = _.sample(decompressedLines);
            if(seedLine)
                pushSeed([seedLine.points]);
        }
    });
    

};


exports.vote = function(playerId, room, votingRound, position, cb){
    var messages = [];
    console.log("game.vote", playerId, room, votingRound, position);
    getGame(room, function(game){
        if(!game) return cb("game not found", null);
        if(game.votingRound != votingRound) return cb("Too late, wrong round");
        // var player = _.findWhere( game.players, {id: playerId} );
        var player = game.players[playerId];
        if(!player) return cb("player not found", null);
        messages.push({"recipient":game.host, "channel":"event", "data":"{event:'drawing'}"});
        var drawingsThisRound = _.where(game.drawings, {votingRound:votingRound});
        // var allVotes = _.filter(game.votes, function(vote){ return vote.votingRound == votingRound; });
        
        var hasVoted = _.findWhere(game.votes, {votingRound:votingRound, playerId:player.id}) !== undefined;
        if(hasVoted) return cb("You've already voted this round");
        
        var drawing = _.findWhere(game.drawings, {votingRound:votingRound, position:position});
        
        if( !game.votes ) game.votes = [];
        game.votes.push({playerId:playerId, votingRound:votingRound, position:position, ownerId:drawing.playerId});
        player.waiting = true;
        // Check here to move to the next voting round/Result phase
        var activePlayers = _.pluck(_.where(game.players, {role:'player', state: "active"}), 'id');

        // If there are no active players not in the allVotes list, continue
        var allVoted = _.findWhere(game.players, {state:"active", waiting:false}) === undefined;
        
        if(allVoted) {
            game.votingRound += 1;
            if(_.findWhere(game.drawings, {votingRound:game.votingRound} ) === undefined){ // No more drawings
                setState(game, STATE.RESULT, function(game){
                    postGame(game); // Export to Firebase
                    messages.push({ "recipient":game.room, "channel":"game", "data":game });
                    cb(null, messages);
                });
            }else { // Next voting round
                setState(game, STATE.VOTE, function(game){
                    postGame(game); // Export to Firebase
                    messages.push({ "recipient":game.room, "channel":"game", "data":game });
                    cb(null, messages);
                });
            }
        } else {
            postGame(game); // Export to Firebase
            messages.push({"recipient":game.room, "channel":"game", "data":game});
            cb(null, messages);
        }
    });
    
};

exports.leave = function(playerId, room, cb){
    messages = [];
    getGame (room, function(game) {
        if(!game){ return; } 
        // Remove their player
        // var player = _.findWhere(game.players, {id:playerId});
        var player = (game.players) ? game.players[playerId] : undefined;
        if(player !== undefined){
            // TODO: What should we do when a person leaves?
            if(player.state == "active"){
              player.state = "disconnect";
            }
            
            postGame(game);
            messages.push({"recipient":game.room, "channel":"game", "data":game});
            cb(null, messages);
            setSocketToGame(playerId, null, null);
        }
        if (game.host == playerId) {
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
    deleteGames(); // Export to Firebase
    cb(null);
};

// A Debug DRAW room
drawGame = newGame("12345");
drawGame.room = "DRAW";
drawGame.state = STATE.DRAW;
postGame(drawGame);
