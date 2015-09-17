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

    // var debugSeed = [[{"x":"159.81","y":"124.37"},{"x":"159.81","y":"125.21"},{"x":"159.81","y":"183.19"},{"x":"159.81","y":"195.80"},{"x":"159.81","y":"209.24"},{"x":"159.81","y":"222.69"},{"x":"159.81","y":"242.02"},{"x":"159.81","y":"249.58"},{"x":"159.81","y":"262.18"},{"x":"159.81","y":"268.91"},{"x":"159.81","y":"273.11"},{"x":"159.81","y":"273.95"},{"x":"159.81","y":"276.47"},{"x":"159.81","y":"277.31"},{"x":"159.81","y":"278.99"},{"x":"159.81","y":"279.83"},{"x":"159.81","y":"280.67"},{"x":"160.65","y":"280.67"},{"x":"161.50","y":"280.67"},{"x":"161.50","y":"280.67"},{"x":"162.34","y":"280.67"},{"x":"163.18","y":"280.67"},{"x":"164.02","y":"280.67"},{"x":"164.02","y":"279.83"},{"x":"167.38","y":"279.83"},{"x":"171.59","y":"278.99"},{"x":"177.48","y":"278.99"},{"x":"183.36","y":"278.99"},{"x":"188.41","y":"278.99"},{"x":"190.93","y":"278.99"},{"x":"194.30","y":"278.99"},{"x":"198.50","y":"278.99"},{"x":"202.71","y":"278.99"},{"x":"206.07","y":"279.83"},{"x":"208.60","y":"282.35"},{"x":"211.12","y":"283.19"},{"x":"211.96","y":"283.19"},{"x":"211.96","y":"284.03"},{"x":"212.80","y":"284.03"},{"x":"212.80","y":"284.03"}]]
    // return debugSeed;
    
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
}

exports.host = function(playerId, cb){
    // Create a game, but do not add the player to it
    if(playerId === undefined) {
        cb("playerId not found");
        return;
    }

    game = newGame(playerId);
    setSocketToGame(playerId, null, game.room);
    // var game = _.find(games, function(game){ return game.host == playerId });
    // if(typeof game == "undefined") {
    //     game = newGame(playerId);
    // }
    postGame(game); // Export to Firebase
    cb(null, game);
}

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
        // game.now = new Date().getTime()
        if(!playerId){
            cb("playerId not found");
            return;
        }

        var player = _.findWhere( game.players, {id: playerId} );
        if(player) player.name = name;
        
        if( typeof player === 'undefined'){
            var player = {
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

        // Determine whether to set the player's waiting variable
        // _.find(game.drawings, function(drawing){
        //     return !('lines' in drawing); // 
        // });

        if (_.findWhere( game.drawings, {submitted: false, playerId:player.id} ) === undefined) {
            player.waiting = true;
        }

        if (_.findWhere( game.players, {waiting: false, state:'active'} ) === undefined) {
            _.each(game.players, function(element, index, list) {element.waiting = false;});
            game.state = STATE.VOTE;
            game.votingRound = 0;
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

exports.vote = function(playerId, room, votingRound, position, cb){
    getGame(room, function(game){
        if(!game) return cb("game not found", null);
        if(game.votingRound != votingRound) return cb("Too late, wrong round");
        var player = _.findWhere( game.players, {id: playerId} );
        if(!player) return cb("player not found", null);
        var drawingsThisRound = _.where(game.drawings, {votingRound:votingRound});
        var allVotes = _.flatten(_.pluck(drawingsThisRound, 'votes'));
        var hasVoted = _.contains(allVotes, playerId);
        // _.find(drawingsThisRound, function(drawing){
        //     return _.contains(drawing.votes, playerId);
        // });
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
            roundDrawings = _.pluck(game.drawings, {votingRound:game.votingRound});
            _.each(roundDrawings, function(drawing){
              var p = _.findWhere(game.players, {id:drawing.playerId});
              p.waiting = true;
            });

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
    return _.map(game.players, function(val, key){ return { id:val.id, name:val.name, score:val.score }; })
}

// exports.getPlayers = function(){ return players }

// exports.getPlayer = function(playerId){ return _.find(players, function(player){ return player.id == playerId })}

exports.getState = function(){ return game.state }

exports.getTitle = function(){ return game.title }

exports.getRound = function(){ return game.round }


exports.getWinner = function(){ return game.winner }

exports.getScoreboard = function(){
    return {
        title: game.title
        , scores: _.map(game.players, function(val, key){ return { id:val.id, name:val.name, score:val.score }; })
        , players: game.players.length
    };

};

exports.reset = function(cb){
    // init()
    postGame(game); // Export to Firebase
    cb(null, game);
};

// init();

// A Debug DRAW room
drawGame = newGame("12345");
drawGame.room = "DRAW";
drawGame.state = STATE.DRAW;
postGame(drawGame);