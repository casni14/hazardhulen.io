var app = angular.module('clientNGJS', []);
app.controller('clientNGJSCtrl', function($scope) {

    $scope.showActions = false;
    $scope.showLeave = false;
    $scope.showJoin = true;
    $scope.table = {};
    $scope.player = {};
    $scope.time = 0;


    var NickColor = ["red", "blue", "orange", "purple", "pink", "yellow"];
    var port = location.port;
    $scope.ID = null;
    var socket = io.connect(location.protocol+"//"+location.hostname+":" + port + "/");

    socket.on('updateTableState', function (table) {
    console.log("Updating Board State: " + JSON.stringify(table));
    $scope.table = JSON.parse(table);
    console.log($scope.table);
    updatePlayers($scope.table);
    if ($scope.table.state == "postGame") {
        console.log("postGame");
        startTimer(15000);
    }
    $scope.$apply();
    });

    socket.on('setId', function(id){
        $scope.ID = id;
    });

    
    $scope.bet = function(){
        var amount = prompt("Please enter the amount you wish to bet.", "5");
        socket.emit('bet', amount);
    }

    $scope.hit = function() {
        socket.emit('hit')
    }

    $scope.stand = function() {
        socket.emit('stand')

    }

    $scope.joinTable = function() {
        
        $scope.showJoin = false;
        $scope.showLeave = true;
        $scope.showActions = true;
        var name = prompt("Enter your nickname");
        socket.emit('joinTable', name);
       // $scope.$apply();
    }

        $scope.leaveTable = function() {
        showJoin = true;
        showLeave = false; 
        socket.emit('leaveTable');
    }

    function startTimer(time) {
        console.log("Started timer @"+time);
        $scope.time = (time / 1000) + 1;
        updateTimer();
    }

    function updateTimer() {
        $scope.time = $scope.time - 1;
        $scope.$apply();
        if ($scope.time > 0) {
            setTimeout(updateTimer, 1000);
        }
    }

    function updatePlayers(table) {
        for(playerIndex in table.activePlayers){
            player = table.activePlayers[playerIndex];
            if(player.id == $scope.ID){
                $scope.player = player;
            }
        }

    }

});