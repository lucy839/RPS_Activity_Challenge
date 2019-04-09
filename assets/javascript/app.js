// global variable
var database = firebase.database();
var playersRef = database.ref("/players");
var turnRef = database.ref("/turn");
var presentRef = database.ref("/connected");
var presentNumRef = database.ref("/presentNum");
var chatRef = database.ref("/chat");
var choices = ['rock', 'paper', 'scissors'];
var player;
var userRef;
var playerName = {};
turnRef.onDisconnect().remove();
chatRef.onDisconnect().remove();

// game object
var game = {

    // actual game
    play: function () {

        // If there is something on connected database, keep track of user's connection by pushing it 
        // to number of connection
        presentRef.on('value', function (snapshot) {
            if (snapshot.val()) {
                var connected = presentNumRef.push(true);
                connected.onDisconnect().remove();
            }
        });

        // If there is something on database, keep track of turn numbers.
        // If there is more than 2, let user know that only  2 players are allowed.
        // I need to figure out if there is a way to avoid redundancy of scrolling to bottom each time
        // something is put into chatting like how I did with chat input.
        database.ref().on('value', function (snapshot) {
            var turnVal = snapshot.child('turn').val();
            if (turnVal !== null && player == undefined) {
                var warning = $("<h5>").text("Only 2 players allowed!");
                $("#chat").append(warning);
                $("#chat")[0].scrollTop =  $("#chat")[0].scrollHeight;
            }
        });

        // when add-user button call setplayer function in this object and empty out the user input
        $("#add-user").on("click", function (event) {
            event.preventDefault();
            game.setPlayer();
            $("#user-input").val('');
        });

        // when players data is added, display username, wins, and loss, then inform the user that usere joined the game
        // and we are waiting for 1 more player if there is only 1 player
        playersRef.on('child_added', function (childSnapshot) {
            var key = childSnapshot.key;
            playerName[key] = childSnapshot.val().name;
            var playerNum = $('<h2>').text('player' + key + ': ' + playerName[key]);
            var wins = $("<h5>").html("wins : <span id = winNum" + key + "></span>");
            var loss = $("<h5>").html("loss : <span id = lossNum" + key + "></span>");
            var status = $("#status" + key).append(playerNum).append(wins).append(loss);
            $("#user" + key).append(status);
            $('#chat').append("<h5>" + playerName[key] + " has joined the game. </h5>");
            if (key == 1) {
                $("#chat").append("<h5> Game: We are waiting for 1 more player </h5>");
            }
            $("#chat")[0].scrollTop =  $("#chat")[0].scrollHeight;
        });

        // If there is value in turn database, obtain value, call certain turn #,and inform who's turn is it
        turnRef.on('value', function (snapshot) {
            var turnNum = snapshot.val();
            if (turnNum == 1) {
                game.turn1();
                $("#chat").append("<h5> Game: player" + turnNum + "'s turn </h5>");
            } else if (turnNum == 2) {
                game.turn2();
                $("#chat").append("<h5> Game: player" + turnNum + "'s turn </h5>");
            } else if (turnNum == 3) {
                game.turn3();
            }
            $("#chat")[0].scrollTop =  $("#chat")[0].scrollHeight;
        });

        // When something is removed from players database, reset the game, and whoever is left in the game will become player 1 
        // I had most trouble with this section.I think there should be better way to code this, but for now this works
        playersRef.on('child_removed', function (childSnapshot) {
            $("#choices" + player).empty();
            turnRef.set(null);
            var key = childSnapshot.key;
            $('#chat').append("<h5>" + playerName[key] + ' has disconnected.<h5>');
            $("#chat")[0].scrollTop =  $("#chat")[0].scrollHeight;
            $("#status" + key).empty();
            delete playerName[key];
            var remainder = playerName[player];
            player = 1;
            playerName[player] = remainder;
            userRef = playersRef.child(player);
            userRef.set({
                'name': remainder,
                'wins': 0,
                'losses': 0
            });
            playersRef.child(2).remove();
            playersRef.onDisconnect().remove();
        });

        // when user push enter on chat, same function will happen as when the add-chat button is clicked.
        $('#chat-input').keypress(function(ev){
            if (ev.which === 13)
                $('#add-chat').click();
        });

        // when add-chat button is clicked, get user's name, if there is username, and user has put something in to input,
        // display message to chat, if no username, let the user know signin is required for chat
        $("#add-chat").on("click", function (event) {
            event.preventDefault();
            var username = playerName[player];
            if (username !== undefined && $('#chat-input').val().trim() !== '') {
                var message = $('#chat-input').val();
                chatRef.push(username + ": " + message);
                $('#chat-input').val('');
            } else if (username == undefined){
                $('#chat-input').val('');
                $("#chat").append("<h5>Game: you need to sign on to start the chat!</h5>").css("color", "red");
                $("#chat")[0].scrollTop =  $("#chat")[0].scrollHeight;
            }
        });

        // when chat database has something added, display to chat
        chatRef.on('child_added', function (childSnapshot) {
            var message = childSnapshot.val();
            console.log(message);
            $('#chat').append("<br>" + message).css("color", "black");
                  $("#chat")[0].scrollTop =  $("#chat")[0].scrollHeight;
        });
    },

    // function that sets a player by assigning number when something is added to players databse and call function that
    //  adds a player with info to database under assigned number
    setPlayer: function () {
        database.ref().once('value', function (snapshot) {
            var playerObj = snapshot.child('players');
            var num = playerObj.numChildren();
            if (num == 0) {
                player = 1;
                game.addPlayer(player);
            } else if (num == 1) {
                player = 2;
                game.addPlayer(player);
                turnRef.set(1);
            }
        })
    },

    // function that adds a player and its info to player database under assigned player number
    addPlayer: function (count) {
        var playerName = $("#user-input").val();
        userRef = playersRef.child(count);
        userRef.onDisconnect().remove();
        userRef.set({
            'name': playerName,
            'wins': 0,
            'losses': 0
        })
    },

    // function that shows the rock,paper, scissor choices when it is called
    //  and when choice button is clicked, call setchoice function
    showChoice: function () {
        for (var i = 0; i < choices.length; i++) {
            var option = $('<button>');
            option.addClass('choiceBtn');
            option.attr('data-choice', choices[i]);
            option.text(choices[i])
            $('#choices' + player).append(option);
        };
        $(document).one('click', '.choiceBtn', game.setChoice);

    },

    // function that sets the choices to that user's database  and increment the turn number and set it to turn database
    setChoice: function () {
        $("#choices" + player).empty();
        var choice = $(this).attr('data-choice');
        userRef.update({
            'choice': choice
        });
        turnRef.once('value', function (snapshot) {
            var turnNum = snapshot.val();
            turnNum++;
            turnRef.set(turnNum);
        });
    },

    // function that when it is called and player is 1, call showChoice function
    turn1: function () {
        if (player == 1) {
            game.showChoice();
        }
    },

    // function that when it is called and player is 2, call showChoice function
    turn2: function () {
        if (player == 2) {
            game.showChoice();
        }
    },

    // function that when it is called, call getResult function
    turn3: function () {
        game.getResult();
    },

    // function that obtains each user's data and assign to corresponding variable, then call rules function 
    getResult: function () {
        playersRef.once('value', function (snapshot) {
            var snap1 = snapshot.val()[1];
            var snap2 = snapshot.val()[2];
            choice1 = snap1.choice;
            wins1 = snap1.wins;
            losses1 = snap1.losses;
            choice2 = snap2.choice;
            wins2 = snap2.wins;
            losses2 = snap2.losses;
            game.rules();

        })
    },

    // This function assigns if users are tied(then restart the game), or who won or lose (then call winner function with 
    // appropriate parameter of winner number).
    rules: function () {
        if (choice1 == choice2) {
            $("#chat").append("<h5>Game: tie!</h5>");
            $("#chat")[0].scrollTop =  $("#chat")[0].scrollHeight;
            turnRef.set(1);
        } else if (choice1 == 'rock') {
            if (choice2 == 'paper') {
                game.winner(2);
            } else if (choice2 == 'scissors') {
                game.winner(1);
            }
        } else if (choice1 == 'paper') {
            if (choice2 == 'rock') {
                game.winner(1);
            } else if (choice2 == 'scissors') {
                game.winner(2);
            }
        } else if (choice1 == 'scissors') {
            if (choice2 == 'rock') {
                game.winner(2);
            } else if (choice2 == 'paper') {
                game.winner(1);
            }
        }
    },

    // funtion that keep tracks of wins and losses and update in both database and display
    // Also let users know what each player chose and who won via chat. After displaying for 3 secons, restart the game
    winner: function (playerNum) {
        if (playerNum == 0) {
        } else {
            if (playerNum == 1) {
                wins = wins1;
                losses = losses2;
            } else {
                wins = wins2;
                losses = losses1;
            };
            wins++;
            losses++;
            var otherPlayerNum = playerNum == 1 ? 2 : 1;
            playersRef.child(playerNum).update({
                'wins': wins
            });
            playersRef.child(otherPlayerNum).update({
                'losses': losses
            });
        }
        $("#chat").append("<h5> Game: player 1 chose " + choice1 + "and player 2 chose " + choice2 +
            ". " + playerName[playerNum] + " won! </h5>");
            $("#chat")[0].scrollTop =  $("#chat")[0].scrollHeight;
        playersRef.once('value', function (snapshot) {
            $("#winNum1").text(snapshot.val()[1].wins);
            $("#lossNum1").text(snapshot.val()[1].losses);
            $("#winNum2").text(snapshot.val()[2].wins);
            $("#lossNum2").text(snapshot.val()[2].losses);
        });
        setTimeout(function () {
            turnRef.set(1);
        }, 3000);
    }
}

// call play function of game object! This call actually starts the game
game.play();

