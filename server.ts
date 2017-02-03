
let express = require('express');
let app = express();
let server = require('http').createServer(app);
let io = require('socket.io')(server);
let monolog = require('monolog');
let Logger = monolog.Logger;
let ConsoleLogHandler = monolog.handler.ConsoleLogHandler;
let _ = require('lodash');

let log = new Logger('hazardhulen');
log.pushHandler(new ConsoleLogHandler());

class Table {
    deck: number[];
    turnHolder: number;
    activePlayers: Player[];
    dealerHand: number[];
    dealerScore: number;
    state: string;

    constructor() {
        this.activePlayers = [];
        this.resetTable();
    }

    public resetTable() {
        this.deck = _.shuffle(_.range(1, 52));
        this.dealerHand = [];
        this.dealerScore = 0;
        this.state = 'idle';
        this.turnHolder = 0;
    }
}

class Player {
    id: string;
    hand: number[];
    score: number;
    bet: number;
    balance: number;
    nickname: string;

    constructor(Id: string) {
        this.id = Id;
        this.balance = 100;
        this.nickname = 'NoName';
        this.newHand();
    }

    public newHand() {
        this.hand = [];
        this.score = 0;
        this.bet = 0;
        log.debug('player named ' + this.nickname + ' rescieved a new hand.');
    }
}

let table = new Table();

function resetTable() {
    log.notice('Resetting Table...');
    table.resetTable();

    for (const player of table.activePlayers) {
        player.newHand();
    }

    updateTableState();
}

function drawCard() {
    const deck = table.deck;
    const card = deck[deck.length - 1];
    deck.length = deck.length - 1;
    return card;
}

function nextPlayer() {
    table.turnHolder++;

    log.info('Next player', table.turnHolder);

    if (table.turnHolder > table.activePlayers.length - 1) {
        dealerTurn();
    }
}

function dealerTurn() {
    log.notice('Dealers Turn');
    let dealerScore = calculateScore(table.dealerHand);
    let highestHandOnTable;
    let lowestHandOnTable;
    for (const player of table.activePlayers) {
        if (player.score > 21) {
            highestHandOnTable *= -1;
        }
        highestHandOnTable = Math.max(highestHandOnTable, player.score);
        lowestHandOnTable = Math.min(lowestHandOnTable, player.score);
    }
    // Draw cards
    while (dealerScore < 21) {
        if (dealerScore > highestHandOnTable || dealerScore === 21) {
            // the dealer stands
            break;
        } else if (dealerScore < 17) {
            // if has less than 17, he will draw a card.
            table.dealerHand.push(drawCard());
        } else if (dealerScore === 17) {
            // if dealer is at 17, he has to stand.
            break;
        } else {
            if (dealerScore < lowestHandOnTable) {
                // if dealer loses to all hands on table, while above 17 he will hit
                // to try and cut losses.
                table.dealerHand.push(drawCard());
            } else {
                // The dealer stands
                break;
            }
        }
        dealerScore = calculateScore(table.dealerHand);
    }

    // Calculate Winners & Payout
    for (const player of table.activePlayers) {
        if (player.score > dealerScore && player.score < 22) {
            // player wins if bigger score than dealer, but not busted.
            player.balance += player.bet * 2;
        } else if (player.score < 22 && dealerScore > 21) {
            // player wins if dealer busts
            player.balance += player.bet * 2;
        } else if (player.score === dealerScore && player.score < 22) {
            // return bet if non-busted equal score.
            player.balance += player.bet * 1;
        }
    }
    table.dealerScore = dealerScore;
    table.state = 'postGame';
    setTimeout(resetTable, 15000);
}

function calculateScore(hand): number {
    const values = [];
    let numAces = 0;

    for (const card of hand) {
        // card = hand[card]
        // Value of image cards is 10
        let value = Math.min(card % 13, 10);
        if (value === 1) {
            value = 11;
            numAces += 1;
        } else if (value === 0) {
            value = 10;
        }
        values.push(value);
    }

    let sum = _.sum(values);
    while (sum > 21 && numAces > 0) {
        numAces -= 1;
        sum -= 10;
    }

    return sum;
}

function updateTableState() {
    log.debug(table);
    io.sockets.emit('updateTableState', JSON.stringify(table));
}

function findPlayer(id: string) {
    for (const ply of table.activePlayers) {
        if (ply.id === id) {
            return ply;
        }
    }
}

function validateInputForJs(input: string) {
    input = input.replace(/(&)/g,   '&amp');
    input = input.replace(/(<)/g,   '&lt');
    input = input.replace(/(>)/g,   '&gt');
    input = input.replace(/(")/g,   '&quot');
    input = input.replace(/(')/g,   '&#x27');
    input = input.replace(/(\/)/g,  '&#x2F');
    return input;
};

app.use(express.static(__dirname + '/bower_components'));
app.get('/', function (req, res, next){
    res.sendFile(__dirname + '/client.html');
});

io.on('connection', function (client) {
    const id = client.conn.id;

    client.emit('setId', id);
    updateTableState();

    client.on('joinTable', function (nickname: string) {
        const _id = client.conn.id;
        const player = new Player(_id);
        // escapes XSS.
        nickname = validateInputForJs(nickname);
        player.nickname = nickname;
        table.activePlayers.push(player);
        updateTableState();
        log.notice(player.id + ' has joined the table.');
    });

    client.on('leaveTable', function () {
        if (table.state !== 'playing') {
            table.activePlayers.splice(table.activePlayers.indexOf(findPlayer(client.conn.id)), 1);
            updateTableState();
        }
    });

    client.on('bet', function (amt: number) {

        const player = findPlayer(client.conn.id);

        if (isNaN(amt) ||  amt === null) {

            // if amt is NotANumber -
            // bet is set to default value of 5.
            amt = 5;
        }

        // Don't allow player to bet twice
        if (player.bet !== 0) {
            client.emit('errorAlreadyPlacedBet');
            /*return;*/
        }

        // Don't allow player to place bets he can't afford
        if (amt > player.balance) {
            client.emit('errorCantAffordBet');
            /*return;*/
        }

        // Set bet and broadcast table state
        player.balance -= amt;
        player.bet = amt;
        updateTableState();

        // Check whether all players have betted
        for (const ply of table.activePlayers) {
            // ply = table.activePlayers[ply];
            if (ply.bet === 0) {
                return;
            }
        }

        // Start game
        table.state = 'playing';

        // Deal cards
        for (const ply of table.activePlayers) {
            ply.hand = [drawCard(), drawCard()];
            const score = calculateScore(ply.hand);
            ply.score = score;
            log.notice('Player Hand: ', ply.hand);
        }

        table.dealerHand = [drawCard(), drawCard()];
        log.notice('Dealer hand: ', table.dealerHand);
        table.dealerScore = calculateScore(table.dealerHand);
        updateTableState();
    });

    client.on('hit', function () {
        // Make sure that game is in playing state
        if (table.state !== 'playing') {
            return;
        }

        const player = findPlayer(client.conn.id);
        // Make sure that hitter is current player
        if (table.activePlayers.indexOf(player) !== table.turnHolder) {
            log.notice('Non-current player sent hit');
            return;
        }

        // Draw a card
        player.hand.push(drawCard());

        // Check for bust/blackjack
        const score = calculateScore(player.hand);
        player.score = score;
        if (score >= 21) {
            nextPlayer();
        }
        updateTableState();
    });

    client.on('stand', function () {
        // Make sure that game is in playing state
        if (table.state !== 'playing') {
            return;
        }

        // Make sure that stander is current player
        const player = findPlayer(client.conn.id);
        if (table.activePlayers.indexOf(player) !== table.turnHolder) {
            log.notice('Non-current player sent stand');
            return;
        }

        nextPlayer();
        updateTableState();
    });

    client.on('disconnect', function () {
        table.activePlayers.splice(table.activePlayers.indexOf(findPlayer(client.conn.id)), 1);
        updateTableState();
    });
});

server.listen(13337);
log.info('Server listening on localhost:13337');
