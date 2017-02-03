var app1 = angular.module('app1', []);
app1.controller('ctrl1', function($scope) {

    $scope.nickColor = ['red', 'blue', 'orange', 'purple', 'pink', 'yellow'];

    var port = location.port;

    var ID = null;

    var socket = io.connect(location.protocol + '//' + location.hostname + ':' + port + '/');


    socket.on('setId', function (id) {
        ID = id;
    });

    $scope.showJoinBool = true;
    $scope.showActionsBool = false;
    $scope.table = {};
    $scope.player = {};
    $scope.time = 0;

    socket.on('updateTableState', function (boardState) {
        //Handle Board State
        console.log('Updating Board State: ' + JSON.stringify(boardState));
        var boardState = JSON.parse(boardState);

        $scope.table = boardState;

        console.log($scope.table === boardState);

        console.log(boardState);
        $scope.updatePlayers(boardState);

        if (boardState.state == 'postGame') {
            startTimer(15000);
        }
    });

    $scope.joinTable = function() {
        $scope.showActionsBool = true;
        $scope.showJoinBool = !$scope.showJoinBool;

        var name = prompt('Enter your nickname');
        socket.emit('joinTable', name);

        console.log(name + ' Joined Table');
    }

    $scope.leaveTable = function() {
        $scope.showActionsBool = false;
        $scope.showJoinBool = !$scope.showJoinBool;

        socket.emit('leaveTable')

        console.log('Leave Table');
    }

    $scope.bet = function() {

        var amount = prompt('Please enter the amount you wish to bet.', '5');
        socket.emit('bet', amount);

        console.log('Bet = ' + amount);
    }

    $scope.stand = function() {
        socket.emit('stand')
        console.log('Stand');
    }

    $scope.hit = function() {
        socket.emit('hit')
        console.log('Hit');
    }

    $scope.getCardPath = function(cardNumber) {
        return 'img/cards/' + cardNumber + '.png';
    }

    $scope.updatePlayers = function(board) {
        for(let player of board.activePlayers) {
            if (player.id === ID) {
                $scope.player = player;
            }
        }
    }

    function startTimer(time) {
        console.log('Started timer @'+time);
        $scope.time = (time / 1000) + 1;
        updateTimer();
    }

    function updateTimer() {
        $scope.time -= 1;
        if (time > 0) {
            setTimeout(updateTimer, 1000);
        }
    }

});
