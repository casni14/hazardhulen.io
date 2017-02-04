var app1 = angular.module('app1', []);
app1.controller('ctrl1', function($scope) {

    $scope.nickColor = ['red', 'blue', 'orange', 'purple', 'pink', 'yellow'];

    var port = location.port;

    $scope.ID = null;

    var socket = io.connect(location.protocol + '//' + location.hostname + ':' + port + '/');


    socket.on('setId', function (id) {
        $scope.ID = id;
    });

    $scope.yourTurn = false;
    $scope.showJoinBool = true;
    $scope.showActionsBool = false;
    $scope.table = {};
    $scope.player = {};
    $scope.time = 0;
    

    socket.on('updateTableState', function (boardState) {
        //Handle Board State
        console.log('Updating Board State...');
        $scope.table = JSON.parse(boardState);

        console.log('new table:');

        console.log($scope.table);

        $scope.updatePlayers();

        if ($scope.table.state == 'postGame') {
            startTimer(15000);
        }

        // update all the things ... :D
        $scope.$apply();
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

    $scope.$watch('table', function(){
        console.log('table changed');
    });

    $scope.updatePlayers = function() {
        for(let i in $scope.table.activePlayers) {
            const player = $scope.table.activePlayers[i];
            if (player.id === $scope.ID) {
                $scope.player = player;
                if(i === $scope.table.turnHolder){
                    $scope.yourTurn = true;
                }
            }
        }
    }

    function startTimer(_time) {
        console.log('Started timer @' + _time);
        $scope.time = (_time / 1000) + 1;
        updateTimer();
    }

    function updateTimer() {
        $scope.time = $scope.time - 1;
        $scope.$apply();
        if ($scope.time > 0) {
            setTimeout(updateTimer, 1000);
        }
    }

    $scope.isTurnholder = function(i) {
        return i === $scope.isTurnholder;
    }
});
