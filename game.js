var _ = require('underscore'),
  fs = require('fs');
var EventEmitter = require('events').EventEmitter;

exports.eventEmitter = new EventEmitter();


var games = [];
var rooms = [];
var players = [];
var playerToGame = {};

// BOOMOIO Settings
var maxPlayers = 6;
var startHand = 7;
var startTime = 60;
var startLives = 5;

var STATE = {
  PREP :    { value: 0, name: "prep",   title: "Preparation"},
  DRAW:     { value: 1, name: "draw",   title: "Draw Phase" },
  VOTE :    { value: 2, name: "vote",   title: "Vote Phase" },
  RESULT:   { value: 3, name: "result", title: "Results"    }
};

var seeds = [
    [[{"x":"107.33","y":"329.03"},{"x":"107.33","y":"326.45"},{"x":"107.33","y":"313.55"},{"x":"107.33","y":"296.77"},{"x":"107.33","y":"281.29"},{"x":"108.62","y":"261.94"},{"x":"111.21","y":"236.13"},{"x":"113.79","y":"212.90"},{"x":"117.67","y":"187.10"},{"x":"125.43","y":"161.29"},{"x":"129.31","y":"149.68"},{"x":"134.48","y":"135.48"},{"x":"137.07","y":"126.45"},{"x":"138.36","y":"123.87"},{"x":"138.36","y":"123.87"},{"x":"139.66","y":"123.87"},{"x":"140.95","y":"123.87"},{"x":"140.95","y":"123.87"},{"x":"140.95","y":"123.87"},{"x":"143.53","y":"125.16"},{"x":"144.83","y":"127.74"},{"x":"146.12","y":"131.61"},{"x":"152.59","y":"139.35"},{"x":"160.34","y":"148.39"},{"x":"171.98","y":"160.00"},{"x":"186.21","y":"176.77"},{"x":"199.14","y":"189.68"},{"x":"210.78","y":"202.58"},{"x":"222.41","y":"212.90"},{"x":"235.34","y":"227.10"},{"x":"244.40","y":"241.29"},{"x":"256.03","y":"264.52"},{"x":"261.21","y":"283.87"},{"x":"263.79","y":"301.94"},{"x":"266.38","y":"312.26"},{"x":"266.38","y":"320.00"},{"x":"267.67","y":"323.87"},{"x":"267.67","y":"326.45"},{"x":"267.67","y":"327.74"},{"x":"267.67","y":"329.03"},{"x":"267.67","y":"330.32"}]],
    [[{"x":"241.81","y":"234.84"},{"x":"240.52","y":"234.84"},{"x":"237.93","y":"234.84"},{"x":"232.76","y":"234.84"},{"x":"227.59","y":"234.84"},{"x":"217.24","y":"234.84"},{"x":"206.90","y":"234.84"},{"x":"196.55","y":"234.84"},{"x":"181.03","y":"234.84"},{"x":"170.69","y":"234.84"},{"x":"161.64","y":"234.84"},{"x":"153.88","y":"234.84"},{"x":"148.71","y":"234.84"},{"x":"144.83","y":"234.84"},{"x":"139.66","y":"234.84"},{"x":"135.78","y":"234.84"},{"x":"133.19","y":"236.13"},{"x":"130.60","y":"236.13"},{"x":"129.31","y":"236.13"},{"x":"128.02","y":"236.13"},{"x":"128.02","y":"237.42"},{"x":"126.72","y":"237.42"},{"x":"125.43","y":"237.42"},{"x":"124.14","y":"237.42"},{"x":"124.14","y":"237.42"},{"x":"122.84","y":"237.42"},{"x":"121.55","y":"237.42"},{"x":"121.55","y":"237.42"},{"x":"118.97","y":"237.42"},{"x":"117.67","y":"237.42"},{"x":"116.38","y":"237.42"},{"x":"115.09","y":"237.42"},{"x":"115.09","y":"237.42"}]],
    [[{"x":"236.44","y":"228.43"},{"x":"236.44","y":"229.95"},{"x":"236.44","y":"232.99"},{"x":"231.86","y":"236.04"},{"x":"227.29","y":"243.65"},{"x":"221.19","y":"251.27"},{"x":"215.08","y":"258.88"},{"x":"205.93","y":"266.50"},{"x":"198.31","y":"275.63"},{"x":"190.68","y":"283.25"},{"x":"187.63","y":"287.82"},{"x":"187.63","y":"292.39"},{"x":"187.63","y":"298.48"},{"x":"187.63","y":"301.52"},{"x":"201.36","y":"306.09"},{"x":"225.76","y":"307.61"},{"x":"247.12","y":"307.61"},{"x":"276.10","y":"307.61"},{"x":"291.36","y":"306.09"},{"x":"302.03","y":"303.05"},{"x":"305.08","y":"301.52"},{"x":"306.61","y":"301.52"},{"x":"308.14","y":"300.00"},{"x":"305.08","y":"300.00"},{"x":"291.36","y":"301.52"},{"x":"274.58","y":"309.14"},{"x":"254.75","y":"322.84"},{"x":"239.49","y":"335.03"},{"x":"231.86","y":"344.16"},{"x":"227.29","y":"357.87"},{"x":"225.76","y":"367.01"},{"x":"225.76","y":"377.66"},{"x":"225.76","y":"388.32"},{"x":"225.76","y":"398.98"},{"x":"225.76","y":"406.60"},{"x":"227.29","y":"415.74"},{"x":"228.81","y":"421.83"},{"x":"228.81","y":"426.40"},{"x":"228.81","y":"430.96"},{"x":"228.81","y":"432.49"},{"x":"225.76","y":"432.49"},{"x":"213.56","y":"432.49"},{"x":"195.25","y":"426.40"},{"x":"175.42","y":"415.74"},{"x":"152.54","y":"405.08"},{"x":"132.71","y":"394.42"},{"x":"123.56","y":"382.23"},{"x":"115.93","y":"362.44"},{"x":"114.41","y":"338.07"},{"x":"114.41","y":"321.32"},{"x":"120.51","y":"306.09"},{"x":"126.61","y":"292.39"},{"x":"132.71","y":"284.77"},{"x":"140.34","y":"274.11"},{"x":"144.92","y":"269.54"},{"x":"147.97","y":"264.97"},{"x":"151.02","y":"261.93"},{"x":"152.54","y":"260.41"}]]
];

var newRoom = function () {
    var roomString = "";
    // 
    var validCharacters = "BCDFGHJKLMNPQRSTVWXYZ";
    // Get four random
    while (roomString.length < 4) {
        roomString += validCharacters.substr(Math.floor(Math.random()*validCharacters.length), 1);
    }
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
        id:games.length,
        timer:startTime,
        discard:[],
        players:[],
        turn:null,
        state:STATE.PREP,
        votingRound:-1,
        room:newRoom(),
        host:host
    };
    games.push(game);
    return game;
};

var getGame = function (room) {
    return _.find(games, function(game){ return game.room == room; });
};


var newRound = function (game) {
    var round = []; // An array of Drawing objects
    // Give every active player two starting doodles

    var activePlayers = _.where(game.players, {state: "active"});
    activePlayers = _.shuffle(activePlayers); // Randomize pairings

    // For every active person in the players
    var votingRound = 0;
    for(var p in activePlayers){
        var player = activePlayers[p];
        drawingSeed = newDrawingSeed();

        var drawing = {
            player: player.id,
            seed: drawingSeed,
            position: 1,
            votingRound: votingRound,
            lines: null,
            votes: [player.id]
        };
        round.push(drawing);

        partnerId = activePlayers[(p+1) % activePlayers.length ].id;
        var drawing2 = {
            player: partnerId,
            seed: drawingSeed,
            position: 2,
            votingRound: votingRound,
            lines: null,
            votes: [partnerId]
        };
        round.push(drawing2);

        votingRound++;
    }
    game.round = round;
};

var newDrawingSeed = function() {
    // var debugSeed = [[{"x":"159.81","y":"124.37"},{"x":"159.81","y":"125.21"},{"x":"159.81","y":"183.19"},{"x":"159.81","y":"195.80"},{"x":"159.81","y":"209.24"},{"x":"159.81","y":"222.69"},{"x":"159.81","y":"242.02"},{"x":"159.81","y":"249.58"},{"x":"159.81","y":"262.18"},{"x":"159.81","y":"268.91"},{"x":"159.81","y":"273.11"},{"x":"159.81","y":"273.95"},{"x":"159.81","y":"276.47"},{"x":"159.81","y":"277.31"},{"x":"159.81","y":"278.99"},{"x":"159.81","y":"279.83"},{"x":"159.81","y":"280.67"},{"x":"160.65","y":"280.67"},{"x":"161.50","y":"280.67"},{"x":"161.50","y":"280.67"},{"x":"162.34","y":"280.67"},{"x":"163.18","y":"280.67"},{"x":"164.02","y":"280.67"},{"x":"164.02","y":"279.83"},{"x":"167.38","y":"279.83"},{"x":"171.59","y":"278.99"},{"x":"177.48","y":"278.99"},{"x":"183.36","y":"278.99"},{"x":"188.41","y":"278.99"},{"x":"190.93","y":"278.99"},{"x":"194.30","y":"278.99"},{"x":"198.50","y":"278.99"},{"x":"202.71","y":"278.99"},{"x":"206.07","y":"279.83"},{"x":"208.60","y":"282.35"},{"x":"211.12","y":"283.19"},{"x":"211.96","y":"283.19"},{"x":"211.96","y":"284.03"},{"x":"212.80","y":"284.03"},{"x":"212.80","y":"284.03"}]]
    // return debugSeed;
    var seed = _.sample(seeds);
    return _.sample(seeds);

}

exports.playerToGame = function(playerId, cb){
    console.log("Player:", playerId, "Game:", playerToGame[playerId]);
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
            , state: 'active'
            , position:-1
            , score: 0
            , room: room
        }
        // Take a hand of cards from the deck
        playerToGame[player.id] = game.room;
    }
    // if(_.where(game.players, {state:'active'}).length >= maxPlayers) player.state = 'spectating';

    players.push(player); // All players
    game.players.push(player); // Players for the game
    
    cb(null, game);
};

exports.start = function(room, cb){
    var game = getGame(room);
    if(!game) return cb("game not found", null);
    // var activePlayers = _.find(game.players, function(player){(player.state=="active")});
    // if(!activePlayers || activePlayers.length < 2) return cb("Not enough players to start", null);
    if(game.players.length < 3) return cb("Not enough players to start", null);
    
    game.state = STATE.DRAW;
    newRound(game);

    cb(null, game);
};

exports.saveDrawing = function(uuid, room, data, cb){
    var drawingData = data.lines;
    var game = getGame(room);
    if(!game) return cb("game not found", null);
    var player = _.findWhere( game.players, {id: uuid} );
    if(!player) return cb("player not found", null);
    var drawing = _.findWhere( game.round, {player: player.id, votingRound: data.votingRound, position: data.position});
    if(!drawing) { return cb("You are not a part of this round", null); }
    drawing.lines = drawingData;
    // drawing.votes = [drawing.player];
    console.log("drawing saved");
    // If it's the last drawing needed, go to Vote round
    console.log(game.round);
    
    if (_.findWhere( game.round, {lines: null} ) === undefined) {
        console.log("all drawings collected");
        game.state = STATE.VOTE;
        game.votingRound = 0;
    }
    // EXTRA Put a line from the drawing into the seeds
    seeds.push(_.sample(data.lines));
    cb(null, game);

};

exports.vote = function(uuid, room, votingRound, position, cb){
    var game = getGame(room);
    if(!game) return cb("game not found", null);
    if(game.votingRound != votingRound) return cb("Too late, wrong round");
    var player = _.findWhere( game.players, {id: uuid} );
    if(!player) return cb("player not found", null);
    var drawingsThisRound = _.where(game.round, {votingRound:votingRound});
    var allVotes = _.flatten(_.pluck(drawingsThisRound, 'votes'));
    console.log("all votes", allVotes);
    var hasVoted = _.contains(allVotes, uuid);
    // _.find(drawingsThisRound, function(drawing){
    //     return _.contains(drawing.votes, uuid);
    // });
    console.log("hasVoted", hasVoted);
    if(hasVoted) return cb("You've already voted this round");
    var drawing = _.findWhere(game.round, {votingRound:votingRound, position:position});
    
    // TODO: Check the other drawings for votes this round
    if(drawing.votes === null) drawing.votes = [drawing.player];
    drawing.votes.push(uuid);
    // Check here to move to the next voting round/Result phase
    var activePlayers = _.pluck(_.where(game.players, {state: "active"}), 'id');
    
    // If there are no active players not in the allVotes list, continue
    var votersLeft = _.difference(activePlayers, allVotes, [uuid]);
    
    console.log("votersLeft", votersLeft);
    if(votersLeft.length == 0) {
        console.log("Next voting round");
        game.votingRound += 1;
    };
    if(game.votingRound >= activePlayers.length){
        game.state = STATE.RESULT;
    }

    cb(null, game);
};

exports.leave = function(room, uuid, cb){
    var game = getGame(room);
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

exports.reset = function(cb){
    init()
    cb(null, game)
}

init()