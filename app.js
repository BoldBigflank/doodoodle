var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var doodoodle = require('./game.js');

app.engine('jade', require('jade').__express);

var port = process.env.PORT || 3000;
server.listen(port);

app.use(express.static(__dirname + '/public'));


app.get('/', function(req, res) {
    // Taken from detectmobilebrowsers.com
    var ua = req.headers['user-agent'].toLowerCase();
    var mobile = (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(ua)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(ua.substr(0,4)));

    res.render('start.jade', { title: 'GGEZ.tv', isPlayer:mobile });
});

app.get('/player', function(req, res){
    res.render('start.jade', { title: 'GGEZ.tv', isPlayer:true });
});

app.get('/host', function(req, res){
    res.render('start.jade', { title: 'GGEZ.tv', isPlayer:false });
});


io.on('connection', function (socket) {
    console.log("Socket", socket.id, "connected");

    socket.on('connect', function(cb){
        // This is automatic when a socket connects
        // We don't use this because the client might not be ready to accept data
    });

    // Unity3d Test Socketio package
    socket.on('beep', function(cb){
        console.log("Beep received");
        socket.emit('boop', {"this":"bar"});
    });

    // User Joins
    socket.on('join', function(data, cb){
        // This is called manually when the client has loaded
        doodoodle.join(socket.id, data, function(err, game){
            if (err) { return cb({"level":"error", "message":err}); }
            else{
                socket.join(game.room);
                console.log(game.room, "--> Player", data.name, "joined");
                io.to(game.room).emit('game', game );
                io.to(game.host).emit('event', {"event":"join"});
            }
          cb(null, game);

        });
    });

    socket.on('host', function(cb){
        // This is called manually when the client has loaded
        doodoodle.host(socket.id, function(err, res){
            if (err) { return cb({"level":"error", "message":err}); }
            else{
                socket.join(res.room); // Host still listens to this channel
                console.log(res.room, "--> Created");
                io.to(res.room).emit('game', res );
            }
            return cb(null);
        });
    });

    // Player calls to start the game
    socket.on('start', function(data, cb){
        doodoodle.socketToGame(socket.id, function(roomData){
            if(!roomData) return cb("Refresh");
            var playerId = roomData.playerId;
            var gameRoom = roomData.gameRoom;
            
            doodoodle.start(gameRoom, function(err, game){
                if (err) { return cb({"level":"error", "message":err}); }
                else {
                    console.log(gameRoom, "--> Start", playerId);
                    // send the game in its new state
                    io.to(gameRoom).emit('game', game);
                    io.to(game.host).emit('event', {"event":"start"});
                }
            });
        });
    });

    socket.on('drawing', function(data, cb){
        doodoodle.socketToGame(socket.id, function(roomData){
            if(!roomData) return cb("Refresh");
            var playerId = roomData.playerId;
            var gameRoom = roomData.gameRoom;
            console.log("Saving",playerId,gameRoom);
            doodoodle.saveDrawing(playerId, gameRoom, data, function(err, messages){
                if (err) { return cb({"level":"error", "message":err}); }
                console.log(gameRoom, "--> Drawing", playerId);
                for(var i in messages){
                    message = messages[i];
                    io.to(message.recipient).emit(message.channel, message.data);
                }
                // io.to(gameRoom).emit('game', game);
                // io.to(game.host).emit('event', {"event":"drawing"});
                return cb(null); // Should we be sending the game back?
            });
        });
    });

    socket.on('vote', function(data, cb){
        doodoodle.socketToGame(socket.id, function(roomData){
            if(!roomData) return cb("Refresh");
            var playerId = roomData.playerId;
            var gameRoom = roomData.gameRoom;
            
            doodoodle.vote(playerId, gameRoom, data.votingRound, data.position, function(err, game){
                if (err) { return cb({"level":"error", "message":err}); }
                console.log(gameRoom, "--> Vote", data.votingRound, data.position);
                for(var i in messages){
                    message = messages[i];
                    io.to(message.recipient).emit(message.channel, message.data);
                }
                return cb(null);
                // io.to(gameRoom).emit('game', game);
                // io.to(game.host).emit('event', {"event":"vote"});
            });
        });
    });

    // User Leaves
    socket.on('disconnect', function(){
        console.log("Socket", socket.id, "disconnected");
        doodoodle.socketToGame(socket.id, function(roomData){
            if(!roomData) return;
            var playerId = roomData.playerId;
            var gameRoom = roomData.gameRoom;
            doodoodle.leave(playerId, gameRoom, function(err, game){
                console.log(gameRoom, "--> Disconnect", playerId);
                if(game){
                    io.to(gameRoom).emit('game', game);
                    io.to(game.host).emit('event', {"event":"disconnect"});
                }
            });
        });
    });

});