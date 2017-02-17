$(function () {
    $('#leave').hide();
    $('#hit').hide();
    $('#stand').hide();
    $('#bet').hide();
    //debug(JSON.stringify(table));
});

var table = {
    "deck": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
        11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
        31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
        41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
        51, 52],
    "turnHolder": 0,
    "activePlayers": [
        {"id": 1, "socket": "help", "hand": [3, 7], "bet": 25, "balance": 15000},
        {"id": 2, "socket": "this", "hand": [25, 48], "bet": 2, "balance": 15000},
        {"id": 3, "socket": "is gut", "hand": [27, 14], "bet": 75, "balance": 15000}],
    "dealerHand": [1, 10, 1, 1]
};

var NickColor = ["red", "blue", "orange", "purple", "pink", "yellow"];

var port = location.port;

var ID = null;

var socket = io.connect(location.protocol+"//"+location.hostname+":" + port + "/");


socket.on('updateTableState', function (boardState) {
    //Handle Board State
    reset();
    console.log("Updating Board State: " + JSON.stringify(boardState));
    var boardState = JSON.parse(boardState);

    console.log(boardState);
    updatePlayers(boardState);

    $.each(boardState.dealerHand, function (i, card) {
        addCard(6, card, i);
        $("#_score7").html(boardState.dealerScore.toString());
        //console.log(boardState.dealerHand);
    });

    if (boardState.state == "postGame") {
        startTimer(15000);
    }


});

socket.on('setId', function (id) {
    ID = id;
});

function reset() {
    $('.playerScore').each(function (i, obj) {
        $(this).html("");
    });
    $('.playerName').each(function (i, obj) {
        $(this).html("");
    });
    $("#_score7").html("");
    $("#_player7").html("");
    //Should be loop but lazy
    $("#cardHolder").html('<div class="playerSlot" id="_player1"></div><div class="playerSlot" id="_player2"></div><div class="playerSlot" id="_player3"></div><div class="playerSlot" id="_player4"></div><div class="playerSlot" id="_player5"></div><div class="playerSlot" id="_player6"></div>');
}

function updatePlayers(board) {

    $.each(board.activePlayers, function (i, player) {

        $.each(player.hand, function (ii, card) {
            addCard(i, card, ii)
        });

        //Update Score
        $("#_score" + (i + 1)).html(player.score.toString());
        //Update Name and Info
        var nameObj = $("#_name" + (i + 1));
        nameObj.html(player.nickname.toString());
        nameObj.css("color", NickColor[i]);
        nameObj.append("<br><span style='color:white'>Bet: "+player.bet+"$</span>");
        nameObj.append("<br><span style='color:white'>Cash: "+player.balance+"$</span>");

        if (player.id == ID) {
            $("#currentBet").html(player.bet);
            $("#cash").html(player.balance);
            $("_player" + i).css("background-color", "darkgreen");
            if (board.turnHolder == i && board.state == "playing") {
                $('#hit').show();
                $('#stand').show();
            } else {
                $('#hit').hide();
                $('#stand').hide();
            }
            if (board.state == "idle") {
                $('#bet').show();
            } else {
                $('#bet').hide();
            }
        }
        var iplayer = i + 1;
        if (board.turnHolder == i && board.state != "idle") {
            $("#_player" + iplayer).css("border", "2px solid red");
            $("#_score" + iplayer).css("border", "2px solid red");
        } else {
            $("#_player" + iplayer).css("border", "2px solid darkslategrey");
            $("#_score" + iplayer).css("border", "2px solid darkslategrey");
        }
    });

}

function startTimer(time) {
    console.log("Started timer @"+time);
    $("#time").html((time / 1000) + 1);
    updateTimer();
}

function updateTimer() {
    var time = parseInt($("#time").html()) - 1;
    $("#time").html(time);
    if (time > 0) {
        setTimeout(updateTimer, 1000);
    }
}

function addCard(seat, card, i) {
    //console.log(seat + " " + card + " " + i);
    //margin-left:" + (i * -20) + "px
    $("#_player" + (seat + 1)).append("<img src='img/cards/" + card + ".png' style='width:100px;height:145px;margin-top:" + (i * -135) + "px' />");
}

function joinTable() {
    $('#join').hide();
    $('#leave').show();
    var name = prompt("Enter your nickname");
    socket.emit('joinTable', name);
}

function bet() {
    var amount = prompt("Please enter the amount you wish to bet.", "5");
    socket.emit('bet', amount);
}

function hit() {
    socket.emit('hit')
}

function stand() {
    socket.emit('stand')
}

function leaveTable() {
    $('#join').show();
    $('#leave').hide();
    socket.emit('leaveTable')
}

