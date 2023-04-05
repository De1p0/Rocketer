//THIS IS THE SERVER CODE
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

//
//the stupid discord bot called Rocketer. This part of the code can be removed without affecting the game
const Eris = require("eris");
const bot = new Eris(process.env.discordBotToken);//bot token
bot.on("ready", () => {
  console.log("Ready!");
  bot.createMessage("1092046433730953277", 'Server restarted');//if this code runs, means the server just restarted. inform that server restarted
});
let cmd = {
  playercount: '!getServerCount',
}
bot.on("messageCreate", (msg) => {
  if(msg.content.includes('!getServerCount')) {                 // if someone sends a direct message to the bot that includes "botTest"
  var playerCountMessage = "Arena player count: " + Object.keys(players).length + ", Dune player count: " + Object.keys(duneplayers).length + ", Cavern player count: " + Object.keys(cavernplayers).length
        msg.channel.createMessage(playerCountMessage)
  }
});
/*
bot.on('messageCreate', async (msg) => {//if someone sends a message in Rocketre discord server
   const botWasMentioned = msg.mentions.find(
       mentionedUser => mentionedUser.id === bot.user.id,
   );

   if (botWasMentioned) {//if bot was @ by someone
       try {
           await msg.channel.createMessage('I can only understand commands.');//send this message in the same channel
       } catch (err) {
           //if message fails to send
           console.warn('Failed to respond to mention.');
           console.warn(err);
       }
   }
    if(msg.content.includes('!playerCount')) {                 // if someone sends a message in the discord channel with '!playerCount', send the player count
      var playerCountMessage = "Arena player count: " + Object.keys(players).length + ", Dune player count: " + Object.keys(duneplayers).length + ", Cavern player count: " + Object.keys(cavernplayers).length
        bot.createMessage(msg.channel.id, playerCountMessage);  // the bot will send the player count in the same channel
    }
});
*/
bot.connect();

setInterval(function () {
    var playerCountMessage = "Arena player count: " + Object.keys(players).length + ", Dune player count: " + Object.keys(duneplayers).length + ", Cavern player count: " + Object.keys(cavernplayers).length
        bot.createMessage("1092046433730953277", playerCountMessage);  // the bot will send the player count in the same channel
  }, 300000);//every 5 minutes

//end of bot code




//quadtree code
//what is quadtree:
//if u do collision detection by checking each object with all other objects, lag will increase exponentialy with each new object
//quadtree collision detection fixes this issue by doing this
//the objects are placed into different lists based on position, and collision detection is only checked for objects near it
//objects are split into "boxes" and if a box is too full, the box becomes 4 smaller boxes. But there is a limit too the number of splits
//special thanks for the quadtree code: https://github.com/timohausmann/quadtree-js
function Quadtree(bounds, max_objects, max_levels, level) {
        
  this.max_objects    = max_objects || 10;
  this.max_levels     = max_levels || 4;
        //
  this.level  = level || 0;
  this.bounds = bounds;
        
  this.objects    = [];
  this.nodes      = [];
};
    
//Split the node into 4 subnodes
    Quadtree.prototype.split = function() {
        
        var nextLevel   = this.level + 1,
            subWidth    = this.bounds.width/2,
            subHeight   = this.bounds.height/2,
            x           = this.bounds.x,
            y           = this.bounds.y;        
     
        //top right node
        this.nodes[0] = new Quadtree({
            x       : x + subWidth, 
            y       : y, 
            width   : subWidth, 
            height  : subHeight
        }, this.max_objects, this.max_levels, nextLevel);
        
        //top left node
        this.nodes[1] = new Quadtree({
            x       : x, 
            y       : y, 
            width   : subWidth, 
            height  : subHeight
        }, this.max_objects, this.max_levels, nextLevel);
        
        //bottom left node
        this.nodes[2] = new Quadtree({
            x       : x, 
            y       : y + subHeight, 
            width   : subWidth, 
            height  : subHeight
        }, this.max_objects, this.max_levels, nextLevel);
        
        //bottom right node
        this.nodes[3] = new Quadtree({
            x       : x + subWidth, 
            y       : y + subHeight, 
            width   : subWidth, 
            height  : subHeight
        }, this.max_objects, this.max_levels, nextLevel);
    };

//Determine which node the object belongs to
    Quadtree.prototype.getIndex = function(pRect) {
        
        var indexes = [],
            verticalMidpoint    = this.bounds.x + (this.bounds.width/2),
            horizontalMidpoint  = this.bounds.y + (this.bounds.height/2);    

        var startIsNorth = pRect.y < horizontalMidpoint,
            startIsWest  = pRect.x < verticalMidpoint,
            endIsEast    = pRect.x + pRect.width > verticalMidpoint,
            endIsSouth   = pRect.y + pRect.height > horizontalMidpoint;    

        //top-right quad
        if(startIsNorth && endIsEast) {
            indexes.push(0);
        }
        
        //top-left quad
        if(startIsWest && startIsNorth) {
            indexes.push(1);
        }

        //bottom-left quad
        if(startIsWest && endIsSouth) {
            indexes.push(2);
        }

        //bottom-right quad
        if(endIsEast && endIsSouth) {
            indexes.push(3);
        }
     
        return indexes;
    };

//Insert the object into the node. If the node exceeds the capacity, it will split and add all objects to their corresponding subnodes

    Quadtree.prototype.insert = function(pRect) {
        
        var i = 0,
            indexes;
         
        //if we have subnodes, call insert on matching subnodes
        if(this.nodes.length) {
            indexes = this.getIndex(pRect);
     
            for(i=0; i<indexes.length; i++) {
                this.nodes[indexes[i]].insert(pRect);     
            }
            return;
        }
     
        //otherwise, store object here
        this.objects.push(pRect);

        //max_objects reached
        if(this.objects.length > this.max_objects && this.level < this.max_levels) {

            //split if we don't already have subnodes
            if(!this.nodes.length) {
                this.split();
            }
            
            //add all objects to their corresponding subnode
            for(i=0; i<this.objects.length; i++) {
                indexes = this.getIndex(this.objects[i]);
                for(var k=0; k<indexes.length; k++) {
                    this.nodes[indexes[k]].insert(this.objects[i]);
                }
            }

            //clean up this node
            this.objects = [];
        }
     };

//Return all objects that could collide with the given object
    Quadtree.prototype.retrieve = function(pRect) {
         
        var indexes = this.getIndex(pRect),
            returnObjects = this.objects;
            
        //if we have subnodes, retrieve their objects
        if(this.nodes.length) {
            for(var i=0; i<indexes.length; i++) {
                returnObjects = returnObjects.concat(this.nodes[indexes[i]].retrieve(pRect));
            }
        }

        //remove duplicates
        returnObjects = returnObjects.filter(function(item, index) {
            return returnObjects.indexOf(item) >= index;
        });
     
        return returnObjects;
    };
    
//clear the quadtree
    Quadtree.prototype.clear = function() {
        
        this.objects = [];
     
        for(var i=0; i < this.nodes.length; i++) {
            if(this.nodes.length) {
                this.nodes[i].clear();
              }
        }

        this.nodes = [];
    };

    //export for commonJS or browser
    if(typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = Quadtree;
    } else {
        window.Quadtree = Quadtree;    
    }

//end of quadtree functions. those functions can be used in the game code below

//curly braces represent an object, which is a javascript term for a list of things that have properties. Theses are different from arrays, which are square brackets
//the actual lists for objects:
//OTHER
var jewelSpawnChance = Math.floor(Math.random() * 10000);
//ARENA
const players = {}
const shapes = {}
var shapeID = 0;
const bullets = {}
var bulletID = 0;
const portals = {}//arena to dune
const cavernportals = {}//arena to cavern
var portalID = 0;
var deadArenaObjects = [];//array that stores all the recently dead objects
//DUNE
const duneplayers = {}
const dunebots = {}
var botID = 0;
const dunebullets = {}
const duneportals = {}//dune to arena
var duneportalID = 0;
var deadDuneObjects = [];//array that stores all the recently dead objects
//spawn white portal in dune
const enterDunePortal = {
  x: 500,
  y: 500,
  name: "portal",
  width: 200,//width and height is half of total width and height including portal aura
  height: 200,
  color: "white",
  outline: "white",//color of aura
  angleDegrees: 0
}
//CAVERN
const cavernplayers = {}
const cavernshapes = {}
const cavernbullets = {}
const arenaportals = {}//cavern to arena
var deadCavernObjects = [];//array that stores all the recently dead objects

const startGameSize = 4500;//refers to the size of arena when only one person in arena
var gameSize = startGameSize; //refers to size of arena, note that var value can be changed, but const cannot
const duneGameSize = 6000;//current dune size
const cavernSize = 3000;//current cavern size
/*
const unknownplayers = {}
const unknownshapes = {}
const unknownbullets = {} 
const arenaportals = {}//??? to arena
var deadUnknownObjects = [];//array that stores all the recently dead objects
*/


//for keeping track number of bots in each hive
var firstHive = 0;
var secondHive = 0;
var thirdHive = 0;
var fourthHive = 0;
var rockHive = 0;

//delta time calculation variables
var timeLapsed = 0;
var currentLoopTime = 0;
var prevLoopTime = 0;
var delta = 1;

var peopleWithToken = [];

//quadtree lists for all the things that need collision detection, e.g. dune players no need collision detection
//this is not the actual lists
var bulletTree = new Quadtree({
    x: 0,
    y: 0,
    width: gameSize,
    height: gameSize
});
var dunebulletTree = new Quadtree({
    x: 0,
    y: 0,
    width: duneGameSize,
    height: duneGameSize
});
var cavernbulletTree = new Quadtree({
    x: 0,
    y: 0,
    width: cavernSize,
    height: cavernSize
});
var shapeTree = new Quadtree({
    x: 0,
    y: 0,
    width: gameSize,
    height: gameSize
});
var cavernshapeTree = new Quadtree({
    x: 0,
    y: 0,
    width: cavernSize,
    height: cavernSize
});
/*
var unknownshapeTree = new Quadtree({
    x: 0,
    y: 0,
    width: unknownSize,
    height: unknownSize
});  

*/
var botTree = new Quadtree({
    x: 0,
    y: 0,
    width: duneGameSize,
    height: duneGameSize
});
var playerTree = new Quadtree({
    x: 0,
    y: 0,
    width: gameSize,
    height: gameSize
});
var cavernplayerTree = new Quadtree({
    x: 0,
    y: 0,
    width: cavernSize,
    height: cavernSize
});

//RETRIEVE THE WORLD RECORD LEADERBOARD FROM THE WORDLRECORD.JSON FILE
var worldrecord = "error"
const fs = require('fs')
// read JSON object from file everytime when the server starts
fs.readFile('worldrecord.json', 'utf-8', (err, data) => {
  if (err) {
    throw err
  }
  // parse JSON object
  worldrecord = JSON.parse(data.toString())//refers to the world record holder, which contains information of score, name and tank used
})


function checkIfNewWorldRecord(player){
  if (player.score>worldrecord.score){//if this player beat the world record score
    const fs = require('fs')
    // create a JSON object
    const newRecordHolder = {
      score: player.score,
      name: player.name,
      tank: player.tankType
    }
    // convert JSON object to a string
    const data = JSON.stringify(newRecordHolder)
    // write JSON string to a file, use writeFIleSync and not writeFile so that it will run that code before doing other stuff, preventing errors
    fs.writeFileSync('worldrecord.json', data, err => {
      if (err) {
        throw err
      }
    })
    worldrecord = newRecordHolder//update world record variable
  }
}
function chatRemovalAfterSomeTime(playerlist,playerid){
  playerlist[playerid].chats.forEach((chatObj) => {
    chatObj.time++;
    if (chatObj.time==200){//remove message
      playerlist[playerid].chats.shift();//remove oldest message
    }
  })
}
function barrelAnimationForShooting(playerlist,playerid){
  var animationTime = 10;//but change of 2 per loop, so time is actually 5
  var amountChangePerLoop = 2;
  Object.keys(playerlist[playerid].barrels).forEach((barrel) => {
    if (playerlist[playerid].barrels[barrel].reloadRecover<(animationTime/amountChangePerLoop)){
      animationTime = playerlist[playerid].barrels[barrel].reloadRecover*amountChangePerLoop
    }
    if (playerlist[playerid].barrels[barrel].shootingState=="decreasing"){//if player just shot a bullet
      playerlist[playerid].barrels[barrel].barrelHeightChange+=amountChangePerLoop;//decrease barrel height
      if (playerlist[playerid].barrels[barrel].barrelHeightChange>=animationTime){//max barrel height reduction of 10
        playerlist[playerid].barrels[barrel].shootingState = "increasing";
      }
    }
    else if (playerlist[playerid].barrels[barrel].shootingState=="increasing"){
      playerlist[playerid].barrels[barrel].barrelHeightChange-=amountChangePerLoop;//increase barrel height
      if (playerlist[playerid].barrels[barrel].barrelHeightChange<=0){//if barrel is back to normal
        playerlist[playerid].barrels[barrel].barrelHeightChange = 0;
        playerlist[playerid].barrels[barrel].shootingState = "no";
      }
    }
  })
}

function addDeadObject(list,id,objtype,objlocation){
  if (objtype=="bot"){
    //if this is a bot, reduce the number of bots in the variable
    if (list[id].hive==1){
      firstHive--;
      console.log("yeet")
    }
    else if (list[id].hive==2){
      secondHive--;
      console.log("yeet")
    }
    else if (list[id].hive==3){
      thirdHive--;
      console.log("yeet")
    }
    else if (list[id].hive==4){
      fourthHive--;
      console.log("yeet")
    }
    else if (list[id].hive==5){
      rockHive--;
      console.log("yeet")
    }
  }
  if (objlocation=="arena"){
    var thisDeadObj = {...list[id]}
    thisDeadObj.type = objtype;
    deadArenaObjects.push(thisDeadObj)//add dead object to array
  }
  else if (objlocation=="dune"){
    var thisDeadObj = {...list[id]}
    thisDeadObj.type = objtype;
    deadDuneObjects.push(thisDeadObj)//add dead object to array
  }
  else if (objlocation=="cavern"){
    var thisDeadObj = {...list[id]}
    thisDeadObj.type = objtype;
    deadCavernObjects.push(thisDeadObj)//add dead object to array
  }
}

function movePlayer(player, playerid, AIshapeDetect, AIplayerDetect, AIbotDetect, mapSize, shapeList, playerList, botList) {
  if (player.autorotate=="yes"){//auto-rotate on
    player.angle = ((player.angle * 180 / Math.PI) + 1) * Math.PI / 180
  }
  else if (player.fastautorotate=="yes"){//fast-auto-rotate on
    player.angle = ((player.angle * 180 / Math.PI) + 3) * Math.PI / 180
  }

  //player acceleration and deceleration
  var accelerationIncrement = 0.5;//amount added when accelerating and decelerating
  if (player.amountAddWhenMoveX>0){
    //if player is moving right
    if (player.currentspeedX<player.speed){
      //if current speed is not max speed
      if (player.currentspeedX<0){
        //if player recently changed direction
        player.currentspeedX=0
      }
      if ((player.speed-player.currentspeedX)>=accelerationIncrement){
        player.currentspeedX+=accelerationIncrement
      }
      else{
        player.currentspeedx=player.speed
      }
    }
  }
if (player.amountAddWhenMoveY>0){
    //if player is moving down
    if (player.currentspeedY<player.speed){
      //if current speed is not max speed
      if (player.currentspeedY<0){
        //if player recently changed direction
        player.currentspeedY=0
      }
      if ((player.speed-player.currentspeedY)>=accelerationIncrement){
        player.currentspeedY+=accelerationIncrement
      }
      else{
        player.currentspeedY=player.speed
      }
    }
  }
  if (player.amountAddWhenMoveX<0){
    //if player is moving left
    if (-player.currentspeedX<player.speed){
      //if current speed is not max speed
      if (player.currentspeedX>0){
        //if player recently changed direction
        player.currentspeedX=0
      }
      if ((player.currentspeedX+player.speed)>=accelerationIncrement){
        player.currentspeedX-=accelerationIncrement
      }
      else{
        player.currentspeedX=-player.speed
      }
    }
  }
    if (player.amountAddWhenMoveY<0){
    //if player is moving up
    if (-player.currentspeedY<player.speed){
      //if current speed is not max speed
      if (player.currentspeedY>0){
        //if player recently changed direction
        player.currentspeedY=0
      }
      if ((player.currentspeedY+player.speed)>=accelerationIncrement){
        player.currentspeedY-=accelerationIncrement
      }
      else{
        player.currentspeedY=-player.speed
      }
    }
  }
  if(player.amountAddWhenMoveX==0) {
    //if player is not moving
    if (player.currentspeedX!=0){
      if (player.currentspeedX>0){
        if (player.currentspeedX>=accelerationIncrement){
          player.currentspeedX-=accelerationIncrement
        }
        else{
          player.currentspeedX=0;
        }
      }
      else{
        if ((-player.currentspeedX)>=accelerationIncrement){
          player.currentspeedX+=accelerationIncrement
        }
        else{
          player.currentspeedX=0;
        }
      }
    }
  }
  if(player.amountAddWhenMoveY==0) {
    if (player.currentspeedY!=0){
      if (player.currentspeedY>0){
        if (player.currentspeedY>=accelerationIncrement){
          player.currentspeedY-=accelerationIncrement
        }
        else{
          player.currentspeedY=0;
        }
      }
      else{
        if ((-player.currentspeedY)>=accelerationIncrement){
          player.currentspeedY+=accelerationIncrement
        }
        else{
          player.currentspeedY=0;
        }
      }
    }
  }
  
  //check for collision with borders IF MOVE
  	var upCollide = player.y + player.height + player.currentspeedY*delta
  	var rightCollide = player.x + player.width + player.currentspeedX*delta
    var downCollide = player.y - player.height + player.currentspeedY*delta
    var leftCollide = player.x - player.width + player.currentspeedX*delta
    //check up and down collision
  	if (upCollide<=mapSize&&downCollide>=0) {
      player.y = player.y + player.currentspeedY*delta
  	}
    else {
  		//stop movement for up and down
      player.currentspeedY = 0
  	}
    //check left and right collision
    if (rightCollide<=mapSize&&leftCollide>=0){
      player.x = player.x + player.currentspeedX*delta
    }
    else{
      //stop movement for left and right
      player.currentspeedX = 0
    }
  //check for collision if never move, this can happen if player is at edge of arena and arena become smaller due to less people
  var upCollides = player.y + player.height
	var rightCollides = player.x + player.width
  var downCollides = player.y - player.height
  var leftCollides = player.x - player.width
  if (upCollides>=mapSize) {
    player.y-=5*delta;
	}
  if (downCollides<=0) {
    player.y+=5*delta;
	}
  if (rightCollides>=mapSize){
    player.x-=5*delta;
  }
  if (leftCollides<=0){
    player.x+=5*delta;
  }

  //rotate player towards nearest shape or player if it has AI, e.g. mono
  if (player.haveAI == "yes"){
    var nearestdist = -1;
    var nearestobj = "nothing";
    if (AIshapeDetect=="yes"){
      //if AI detection for shape is allowed for this location
      Object.keys(shapeList).forEach((shapeId) => {
        var a = shapeList[shapeId].x - player.x;
        var b = shapeList[shapeId].y - player.y;
        var c = Math.sqrt( a*a + b*b );
        if (nearestdist==-1){
          nearestdist=c;
          nearestobj = shapeList[shapeId];
        }
        else{
          if (nearestdist>c){
            nearestdist=c;
            nearestobj = shapeList[shapeId];
          }
        }
      })
    }
    if (AIplayerDetect=="yes"){
      Object.keys(playerList).forEach((playerId) => {
        if (playerId!=playerid){//if players are not the same player
          var a = playerList[playerId].x - player.x;
          var b = playerList[playerId].y - player.y;
          var c = Math.sqrt( a*a + b*b );
          if (nearestdist==-1){
            nearestdist=c;
            nearestobj = playerList[playerId];
          }
          else{
            if (nearestdist>c){
              nearestdist=c;
              nearestobj = playerList[playerId];
            }
          }
        }
      })
    }
    if (AIbotDetect=="yes"){
      Object.keys(botList).forEach((botId) => {
        var a = botList[botId].x - player.x;
        var b = botList[botId].y - player.y;
        var c = Math.sqrt( a*a + b*b );
        if (nearestdist==-1){
          nearestdist=c;
          nearestobj = botList[botId];
        }
        else{
          if (nearestdist>c){
            nearestdist=c;
            nearestobj = botList[botId];
          }
        }
      })
    }
    if (nearestobj!="nothing"&&nearestdist!=-1){//if there is a target
      player.shooting = "yes";
      player.mousex = nearestobj.x;
      player.mousey = nearestobj.y;
      player.angle = ((Math.atan2(nearestobj.y - player.y, nearestobj.x - player.x) * 180 / Math.PI) + 90) * Math.PI / 180
      //find angle towards nearest target, then convert to degrees and plus 90 to change axis so it is pointing correctly, then change back to radians
    }
    else {
      player.shooting = "no";
    }
  }
}
function playerLevel(player){
  //exponential equation used for calculating score needed for each level: 1.05^x * 9000 - 9000, round down. if change the exponential equation, also change on client side for drawing score bar
  if (player.score>0){//if score more than 0
    if (Math.floor(Math.log((player.score+9000)/9000) / Math.log(1.05))>player.level){//check if player's level increased based on exponential equation
      player.level++;
      if (player.level<=160){//size dont increase if player level is more than 160
        var sizeGrowthPerLevel = 0.25;
        player.width+=sizeGrowthPerLevel;//increase player size
        player.height+=sizeGrowthPerLevel;
        Object.keys(player.barrels).forEach((barrel) => {
          player.barrels[barrel].barrelHeight = player.barrels[barrel].barrelHeight * (player.height / (player.height - sizeGrowthPerLevel));//height of barrel grows proportional to body
          player.barrels[barrel].barrelWidth = player.barrels[barrel].barrelWidth * player.width / (player.width - sizeGrowthPerLevel);//width of barrel grows as specified in code, because if it grows proportional to the body, there will be problems with the new location of the barrels for tanks like twin tank
          player.barrels[barrel].x = player.width * player.barrels[barrel].barrelMoveIncrement;
        })
      }
    }
  }
}
function playerBotCollide(playerList,id){
  //get nearby bots from quadtree list
  var elements = botTree.retrieve({
    x: playerList[id].x,
    y: playerList[id].y,
    width: playerList[id].width,
    height: playerList[id].width
  });
  Object.keys(elements).forEach((thing) => {
      var dunebotId = elements[thing].id
    if (playerList.hasOwnProperty(id)&&dunebots.hasOwnProperty(dunebotId)){//check if dunebot still exists as might have been killed previously in this loop
      var DistanceBetween = Math.sqrt( (playerList[id].x - dunebots[dunebotId].x)*(playerList[id].x - dunebots[dunebotId].x) + (playerList[id].y - dunebots[dunebotId].y)*(playerList[id].y - dunebots[dunebotId].y) );//calculate distance between center of bullet and center of dunebot, dunebot treated as a circle
      if (DistanceBetween<=(playerList[id].width+dunebots[dunebotId].width)){
        //crashed
        playerList[id].hit++;
        playerList[id].health-=dunebots[dunebotId].damage;
        playerList[id].healthRegenTimeChange=playerList[id].healthRegenTime;//reset time to next health regeneration
        dunebots[dunebotId].hit++;
        dunebots[dunebotId].health-=playerList[id].damage;
        if (dunebots[dunebotId].name=="rogue"){
          //lifesteal: gains health based on damage dealt
          dunebots[dunebotId].health+=dunebots[dunebotId].damage*10;
        }
        else if (dunebots[dunebotId].name=="Grower"){
          //grows when deal damage
          dunebots[dunebotId].width+=0.1;
          dunebots[dunebotId].height+=0.1;
        }
          //check if player attacked this bot before
            var attackedBotBefore = "no";
            Object.keys(dunebots[dunebotId].attackers).forEach((attackerid) => {
              if (dunebots[dunebotId].attackers[attackerid]==playerList[id]){
                attackedBotBefore = "yes";
              }
            })
            if (attackedBotBefore=="no"){//if havent attacked shape before, add player to list of people who attacked the shape
              dunebots[dunebotId].attackers[id] = playerList[id];
            }
        
          if (playerList[id].health<=0){//playre died
            dunebots[dunebotId].score+=playerList[id].score;
            io.to(id).emit('youDied', dunebots[dunebotId].name, playerList[id])
            addDeadObject(playerList,id,"player","dune")
            delete playerList[id]
          }
      }
    }
  })
}

function moveShape(id,shapelist,mapsize, location){
  //check for collision with borders
  var upCollides = shapelist[id].y + shapelist[id].height
	var rightCollides = shapelist[id].x + shapelist[id].width
  var downCollides = shapelist[id].y - shapelist[id].height
  var leftCollides = shapelist[id].x - shapelist[id].width
  if (upCollides>=mapsize) {
    shapelist[id].centerOfRotationY-=5*delta;
	}
  if (downCollides<=0) {
    shapelist[id].centerOfRotationY+=5*delta;
	}
  if (rightCollides>=mapsize){
    shapelist[id].centerOfRotationX-=5*delta;
  }
  if (leftCollides<=0){
    shapelist[id].centerOfRotationX+=5*delta;
  }
  
  //move shape in cicular path
  var pathradius = 100
  shapelist[id].motionAngle+=0.005;//add angle to move the shape
  shapelist[id].x = shapelist[id].centerOfRotationX + Math.cos(shapelist[id].motionAngle)*pathradius;
  shapelist[id].y = shapelist[id].centerOfRotationY + Math.sin(shapelist[id].motionAngle)*pathradius;
  //make shape rotate
  shapelist[id].angle+=0.5;
  //if shape no health, give score to everyone who dealed damage to it, and then remove the shape
  if (shapelist[id].health<=0){
    var scoreToGive = Math.round(shapelist[id].score/Object.keys(shapelist[id].attackers).length);//split score among all killers
    Object.keys(shapelist[id].attackers).forEach((attackerid) => {
      shapelist[id].attackers[attackerid].score+=scoreToGive;
    })
    addDeadObject(shapelist,id,"shape",location)
    delete shapelist[id]
  }
  else{
    //check for collision with other shapes
    //get nearby shapes from quadtree list
    if (location=="arena"){
      var elements = shapeTree.retrieve({
        x: shapelist[id].x,
        y: shapelist[id].y,
        width: shapelist[id].width,
        height: shapelist[id].width
      });
    }
    else if (location=="cavern"){
      var elements = cavernshapeTree.retrieve({
        x: shapelist[id].x,
        y: shapelist[id].y,
        width: shapelist[id].width,
        height: shapelist[id].width
      });
    }
    Object.keys(elements).forEach((thing) => {
      var shapeId = elements[thing].id
      if (shapelist.hasOwnProperty(shapeId)){//if shape still alive
      var DistanceBetween = Math.sqrt( (shapelist[id].x - shapelist[shapeId].x)*(shapelist[id].x - shapelist[shapeId].x) + (shapelist[id].y - shapelist[shapeId].y)*(shapelist[id].y - shapelist[shapeId].y) );//calculate distance between center of bullet and center of shape, shape treated as a circle
      //below check if id not equal shapeId not make sure that the shapes are not the same shape
      if (DistanceBetween<=(shapelist[id].width+shapelist[shapeId].width)&&id!=shapeId){
        //crashed
        if (id>shapeId){//only do if shape id less than other shape to ensure that this collision detection doesn't happen twice
          var anglehit = Math.atan2(shapelist[id].y - shapelist[shapeId].y, shapelist[id].x - shapelist[shapeId].x);
          //the above calculates the angle between shapes and move one of them
          var speedMove = 0.5;//smaller number means move slower
          shapelist[id].centerOfRotationX += Math.cos(anglehit) * speedMove * delta;
          shapelist[id].centerOfRotationY += Math.sin(anglehit) * speedMove * delta;
        }
      }
      }
    })
  }
}
function radiantShapes(objList,id){
  if (objList[id].hasOwnProperty("red")){//if shape is radiant
    if (objList[id].rgbstate == 0){
      objList[id].rgbstate = 1;
    }
    else if (objList[id].rgbstate==1){
      objList[id].red-=5;//5 instead of one so that change color faster
      objList[id].green+=5;
      if (objList[id].red<=0&&objList[id].green>=255){
        objList[id].rgbstate=2;
        objList[id].red=0;
        objList[id].green=255;
      }
    }
    else if (objList[id].rgbstate==2){
      objList[id].blue+=5;
      objList[id].green-=5;
      if (objList[id].blue>=255&&objList[id].green<=0){
        objList[id].rgbstate = 3;
        objList[id].blue=255;
        objList[id].green=0;
      }
    }
    else if (objList[id].rgbstate==3){
      objList[id].blue-=5;
      objList[id].red+=5;
      if (objList[id].blue<=0&&objList[id].red>=255){
        objList[id].rgbstate=1;
        objList[id].red=255;
        objList[id].blue=0;
      }
    }
  }
}
function moveBullet(bulletList, bulletId, collisionDetectShape, collisionDetectPlayer, collisionDetectBullet, collisionDetectBot, mapSize, playerlist, shapelist, location){
  //move bullets
  if (bulletList[bulletId].bulletType != "drone"){//if not drone
    bulletList[bulletId].y+=Math.sin(((bulletList[bulletId].moveAngle * 180 / Math.PI) - 90) * Math.PI / 180) * bulletList[bulletId].amountAddWhenMove * delta;
    bulletList[bulletId].x+=Math.cos(((bulletList[bulletId].moveAngle * 180 / Math.PI) - 90) * Math.PI / 180) * bulletList[bulletId].amountAddWhenMove * delta;
  }
  else{//if it is a drone
    var droneangle = Math.atan2(bulletList[bulletId].owner.mousey - bulletList[bulletId].y, bulletList[bulletId].owner.mousex - bulletList[bulletId].x);
    bulletList[bulletId].y+=Math.round(Math.sin(droneangle) * bulletList[bulletId].amountAddWhenMove)*delta;
    bulletList[bulletId].x+=Math.round(Math.cos(droneangle) * bulletList[bulletId].amountAddWhenMove)*delta;
  }
  bulletList[bulletId].timer--;
  if (bulletList[bulletId].owner.tankType == "palace" || bulletList[bulletId].owner.tankType == "brigade"){//if tank is palace or brigade
    bulletList[bulletId].width++;
    bulletList[bulletId].height++;
  }
  else if (bulletList[bulletId].owner.tankType == "battalion"){//if tank is battalion
    //bullet growth speed is faster because bullet move faster, so bullet need to increase in size in a shorter time
    bulletList[bulletId].width+=3;
    bulletList[bulletId].height+=3;
  }
  //if the bulletList[bulletId] is a trap
  if (bulletList[bulletId].bulletType == "trap"){
    bulletList[bulletId].dist--;
    if (bulletList[bulletId].dist<=0){
      //stop trap from moving anymore
      bulletList[bulletId].amountAddWhenMove = 0;
    }
  }
  else if (bulletList[bulletId].bulletType == "drone"){
    //update drone angle so it move towards mouse position
    bulletList[bulletId].moveAngle = bulletList[bulletId].owner.angle;
  }
  else if (bulletList[bulletId].bulletType == "aura"){
    //if it is an aura, the bulletList[bulletId], which is the aura, will be below the tank
    bulletList[bulletId].x = bulletList[bulletId].owner.x;
    bulletList[bulletId].y = bulletList[bulletId].owner.y;
  }
  //check if passive mode turned on
  if (bulletList[bulletId].owner.passive=="yes"&&bulletList[bulletId].passive!="yes"){
    bulletList[bulletId].passive="yes";
  }
  else if (bulletList[bulletId].owner.passive=="no"&&bulletList[bulletId].passive!="no"){
    bulletList[bulletId].passive="no";
  }
  //next, check for collision with borders
  var upCollide = bulletList[bulletId].y + bulletList[bulletId].height;
	var rightCollide = bulletList[bulletId].x + bulletList[bulletId].width;
  var downCollide = bulletList[bulletId].y - bulletList[bulletId].height;
  var leftCollide = bulletList[bulletId].x - bulletList[bulletId].width;
	if ((upCollide>=mapSize||downCollide<=0||rightCollide>=mapSize||leftCollide<=0) && bulletList[bulletId].bulletType != "aura") {
    //remove bulletList[bulletId] if touch sides of arena AND it is not an aura
    addDeadObject(bulletList,bulletId,"bullet",location)
    delete bulletList[bulletId]
	}
  else if (bulletList[bulletId].health<=0||bulletList[bulletId].timer<=0){//if bulletList[bulletId] no more health or already moved the max distance
    //remove bulletList[bulletId]
    addDeadObject(bulletList,bulletId,"bullet",location)
    delete bulletList[bulletId]
  }
  else if (bulletList[bulletId].passive=="no"){//if never crash with borders, and passive mode off, check for collision with shapes and players
    if (collisionDetectShape=="yes"){
      //get elements near object (quadtree)
      if (location=="arena"){
        var elements = shapeTree.retrieve({
          x: bulletList[bulletId].x,
          y: bulletList[bulletId].y,
          width: bulletList[bulletId].width,
          height: bulletList[bulletId].width
      });
      }
      else if (location=="cavern"){
        var elements = cavernshapeTree.retrieve({
          x: bulletList[bulletId].x,
          y: bulletList[bulletId].y,
          width: bulletList[bulletId].width,
          height: bulletList[bulletId].width
      });
      }
      Object.keys(elements).forEach((thing) => {
        var shapeId = elements[thing].id
        if (shapelist.hasOwnProperty(shapeId)){//if shape still alive
          var DistanceBetween = Math.sqrt( (bulletList[bulletId].x - shapelist[shapeId].x)*(bulletList[bulletId].x - shapelist[shapeId].x) + (bulletList[bulletId].y - shapelist[shapeId].y)*(bulletList[bulletId].y - shapelist[shapeId].y) );//calculate distance between center of bulletList[bulletId] and center of shape, shape treated as a circle
          if (DistanceBetween<=(bulletList[bulletId].width+shapelist[shapeId].width)){
            //crashed
            if (bulletList[bulletId].owner.knockback=="yes"){
              shapelist[shapeId].centerOfRotationY+=Math.sin(((bulletList[bulletId].moveAngle * 180 / Math.PI) - 90) * Math.PI / 180) * 10;
              shapelist[shapeId].centerOfRotationX+=Math.cos(((bulletList[bulletId].moveAngle * 180 / Math.PI) - 90) * Math.PI / 180) * 10;
              //knockback's bullets push shapes backwards by 10
            }
            shapelist[shapeId].hit++;
            bulletList[bulletId].hit++;
            shapelist[shapeId].health-=bulletList[bulletId].damage;//shape damaged
            bulletList[bulletId].health-=shapelist[shapeId].damage;//bulletList[bulletId] also damaged
            
            //check if player attacked this shape before
            var attackedShapeBefore = "no";
            Object.keys(shapelist[shapeId].attackers).forEach((attackerid) => {
              if (shapelist[shapeId].attackers[attackerid]==bulletList[bulletId].owner){
                attackedShapeBefore = "yes";
              }
            })
            if (attackedShapeBefore=="no"){//if havent attacked shape before, add player to list of people who attacked the shape
              shapelist[shapeId].attackers[bulletId] = bulletList[bulletId].owner;
            }
          }
        }
      })
    }
    if (collisionDetectPlayer=="yes"){//player deetction coed doesnt use quadtree because it doesnt lag a lot
      //get nearby players from quadtree list
      if (location=="arena"){
      var elements = playerTree.retrieve({
          x: bulletList[bulletId].x,
          y: bulletList[bulletId].y,
          width: bulletList[bulletId].width,
          height: bulletList[bulletId].width
      });
    }
    else if (location=="cavern"){
      var elements = cavernplayerTree.retrieve({
          x: bulletList[bulletId].x,
          y: bulletList[bulletId].y,
          width: bulletList[bulletId].width,
          height: bulletList[bulletId].width
      });
    }
      Object.keys(elements).forEach((thing) => {
        var playerId = elements[thing].id
        if(playerlist.hasOwnProperty(playerId)){//if player still exists
        if (bulletList[bulletId].owner.developer!="yes"){//developers cannot kill other players
          var DistanceBetween = Math.sqrt( (bulletList[bulletId].x - playerlist[playerId].x)*(bulletList[bulletId].x - playerlist[playerId].x) + (bulletList[bulletId].y - playerlist[playerId].y)*(bulletList[bulletId].y - playerlist[playerId].y) );//calculate distance between center of bulletList[bulletId] and center of player
          if (DistanceBetween<=(bulletList[bulletId].width+playerlist[playerId].width) && bulletList[bulletId].owner!=playerlist[playerId]){
            //crashed
            if (bulletList[bulletId].owner.knockback=="yes"){
              playerlist[playerId].y+=Math.sin(((bulletList[bulletId].moveAngle * 180 / Math.PI) - 90) * Math.PI / 180) * 50;
              playerlist[playerId].x+=Math.cos(((bulletList[bulletId].moveAngle * 180 / Math.PI) - 90) * Math.PI / 180) * 50;
              //knockback's bullets push players backwards by 100
            }
            playerlist[playerId].hit++;
            bulletList[bulletId].hit++;
            playerlist[playerId].health-=bulletList[bulletId].damage;//player damaged
            bulletList[bulletId].health-=playerlist[playerId].damage;//bulletList[bulletId] also damaged
            playerlist[playerId].healthRegenTimeChange = playerlist[playerId].healthRegenTime;//reset time to next health regeneration
              //remove player if zero health
              if (playerlist[playerId].health<=0){
                bulletList[bulletId].owner.score+=playerlist[playerId].score;//owner of bulletList[bulletId] get all of player's score
                io.to(bulletList[bulletId].ownerId).emit('newNotification', "You killed "+playerlist[playerId].name, "grey");//send kill notification before deleting dead player so that can still access dead player's name
                io.to(playerId).emit('youDied', bulletList[bulletId].owner.name, playerlist[playerId])
                addDeadObject(playerlist,playerId,"player",location)
                delete playerlist[playerId]//player killed
                console.log("someone died")
              }
          }
        }
      }
      })
    }
    //this bullet loop is compulsory as it moves traps when overlap, but collisiondetectbullet determines whether damage is received
    //get bullets near the bullet (quadtree)
    if (location=="arena"){
      var elements = bulletTree.retrieve({
          x: bulletList[bulletId].x,
          y: bulletList[bulletId].y,
          width: bulletList[bulletId].width,
          height: bulletList[bulletId].width
      });
    }
    else if (location=="dune"){
      var elements = dunebulletTree.retrieve({
          x: bulletList[bulletId].x,
          y: bulletList[bulletId].y,
          width: bulletList[bulletId].width,
          height: bulletList[bulletId].width
      });
    }
    else if (location=="cavern"){
      var elements = cavernbulletTree.retrieve({
          x: bulletList[bulletId].x,
          y: bulletList[bulletId].y,
          width: bulletList[bulletId].width,
          height: bulletList[bulletId].width
      });
    }
      Object.keys(elements).forEach((thing) => {
        var id = elements[thing].id
        if (id!=bulletId&&bulletList.hasOwnProperty(id)){//if the bullets are not the same bullet
          if ((Math.sqrt((bulletList[bulletId].x - bulletList[id].x)*(bulletList[bulletId].x - bulletList[id].x) + (bulletList[bulletId].y - bulletList[id].y)*(bulletList[bulletId].y - bulletList[id].y))) <= (bulletList[bulletId].width + bulletList[id].width)){
            //if distance between bullets is less than the widths
            //crashed
            if (bulletList[bulletId].ownerId != bulletList[id].ownerId && collisionDetectBullet=="yes" && bulletList[id].bulletType!="aura" && bulletList[bulletId].bulletType!="aura"){
              //if bullets belong to different tanks and they are not auras
              bulletList[bulletId].hit++;
              bulletList[id].hit++;
              bulletList[id].health-=bulletList[bulletId].damage;
              bulletList[bulletId].health-=bulletList[id].damage;
            }
            //below code move traps if crash with each other, if belong to same tank
            else if (bulletList[id].bulletType=="trap" && bulletList[bulletId].bulletType=="trap"){
              //3 below refers to speed of trap movement
              //move the trap
              bulletList[id].x += Math.cos(Math.atan2(bulletList[id].y - bulletList[bulletId].y, bulletList[id].x - bulletList[bulletId].x)) * 3 * delta;
              bulletList[id].y += Math.sin(Math.atan2(bulletList[id].y - bulletList[bulletId].y, bulletList[id].x - bulletList[bulletId].x)) * 3 * delta;
            }
            else if (bulletList[id].bulletType=="drone" && bulletList[bulletId].bulletType=="drone"){
              //3 below refers to speed of drone movement
              //move the drone
              bulletList[id].x += Math.cos(Math.atan2(bulletList[id].y - bulletList[bulletId].y, bulletList[id].x - bulletList[bulletId].x)) * 3 * delta;
              bulletList[id].y += Math.sin(Math.atan2(bulletList[id].y - bulletList[bulletId].y, bulletList[id].x - bulletList[bulletId].x)) * 3 * delta;
            }
          }
        }
      })
    if (collisionDetectBot=="yes"){
      //get nearby bots from quadtree list
      var elements = botTree.retrieve({
        x: bulletList[bulletId].x,
        y: bulletList[bulletId].y,
        width: bulletList[bulletId].width,
        height: bulletList[bulletId].width
    });
      Object.keys(elements).forEach((thing) => {
        var dunebotId = elements[thing].id
        if (dunebots.hasOwnProperty(dunebotId)){//if bot still exists
          if (Math.sqrt((bulletList[bulletId].x - dunebots[dunebotId].x)*(bulletList[bulletId].x - dunebots[dunebotId].x) + (bulletList[bulletId].y - dunebots[dunebotId].y)*(bulletList[bulletId].y - dunebots[dunebotId].y)) <= (bulletList[bulletId].width+dunebots[dunebotId].width)){
            //if distance between bullets is less than the widths
            //crashed
            if ((dunebots[dunebotId].name=="Shield"||dunebots[dunebotId].name=="Wall")  && bulletList[bulletId].bulletType!="aura"){
              //move bullet backwards by 100
              bulletList[bulletId].y+=Math.sin(((bulletList[bulletId].moveAngle * 180 / Math.PI) - 90 - 180) * Math.PI / 180) * 100;
              bulletList[bulletId].x+=Math.cos(((bulletList[bulletId].moveAngle * 180 / Math.PI) - 90 - 180) * Math.PI / 180) * 100;
            }
            if (bulletList[bulletId].owner.knockback=="yes"){
              dunebots[dunebotId].y+=Math.sin(((bulletList[bulletId].moveAngle * 180 / Math.PI) - 90) * Math.PI / 180) * 100;
              dunebots[dunebotId].x+=Math.cos(((bulletList[bulletId].moveAngle * 180 / Math.PI) - 90) * Math.PI / 180) * 100;
              //knockback's bullets push mobs backwards by 100
            }
            dunebots[dunebotId].hit++;
            bulletList[bulletId].hit++;
            dunebots[dunebotId].health-=bulletList[bulletId].damage;//dunebot damaged
            bulletList[bulletId].health-=dunebots[dunebotId].damage;//bulletList[bulletId] also damaged
            //if aura is blizzard aura
            if (bulletList[bulletId].owner.tankType == "blizzard"){
              dunebots[dunebotId].speed*=0.9935;
              //everytime bot hits the aura, it becomes slower, so a bot inside the aura will slowly decelerate until its speed is almost zero
              dunebots[dunebotId].color="lightblue";
            }
            //check if player attacked this bot before
            var attackedBotBefore = "no";
            Object.keys(dunebots[dunebotId].attackers).forEach((attackerid) => {
              if (dunebots[dunebotId].attackers[attackerid]==bulletList[bulletId].owner){
                attackedBotBefore = "yes";
              }
            })
            if (attackedBotBefore=="no"){//if havent attacked shape before, add player to list of people who attacked the shape
              dunebots[dunebotId].attackers[bulletId] = bulletList[bulletId].owner;
            }
          }
        }
    })
  }
}
}

function spawnBullets(id,playerlist,bulletlist){
    if (playerlist[id].shooting=="yes" || playerlist[id].thickestBarrel=="aura" || playerlist[id].autofire=="yes"){
        Object.keys(playerlist[id].barrels).forEach((barrel) => {
          if (playerlist[id].barrels[barrel].reload<=0){
          //spawn bullet
          playerlist[id].barrels[barrel].reload=playerlist[id].barrels[barrel].reloadRecover;//reset reload
          playerlist[id].barrels[barrel].shootingState="decreasing"//start barrel animation when shooting
            
          bulletlist[bulletID] = {
            //note: all properties are based on player properties s that when upgrading, only need to change the player's properties
            //explanation for calculation of x and y positions:
  //the bullets are usually spawned in a straight line, e.g. for twin: bullet 1  bullet 2
  //when the tank tilts, the spawning position of the bullets does not change
  //when the player is shooting sideways, the bullets still spawn horizontally next to each other, and they will not move through the barrels, instead, they will be shooting in a straight line instead of multiple lines
  //the code below is needed for tanks that are shooting more than one bullet in the same direction at different x location, e.g. twin tank, however it does not affect tanks that do not need this code
  //the code is:
  //x: player x + x distance between center of player and bullet spawning location * cos(angle in radians)
  //y: player y + x distance between center of player and bullet spawning location * sin(angle in radians)
            x: playerlist[id].x + ((playerlist[id].barrels[barrel].x) * Math.cos(playerlist[id].angle + playerlist[id].barrels[barrel].additionalAngle  * Math.PI / 180)),
          	y: playerlist[id].y + ((playerlist[id].barrels[barrel].x) * Math.sin(playerlist[id].angle + playerlist[id].barrels[barrel].additionalAngle  * Math.PI / 180)),
          	health: playerlist[id].barrels[barrel].bulletHealth,
            damage: playerlist[id].barrels[barrel].bulletDamage,
            timer: playerlist[id].barrels[barrel].bulletTimer,
            width: playerlist[id].barrels[barrel].barrelWidth/2,
            height: playerlist[id].barrels[barrel].barrelWidth/2,
            color: playerlist[id].color,
            outline: playerlist[id].outline,
            owner: playerlist[id],
            ownerId: id,
            moveAngle: playerlist[id].angle + playerlist[id].barrels[barrel].additionalAngle  * Math.PI / 180,//player angle plus the extra barrel angle, e.g. for flank, the second barrel is 180 degrees away from player angle
            amountAddWhenMove: playerlist[id].barrels[barrel].bulletSpeed,
            hit: 0,
            passive: "no"
          }
          if (playerlist[id].barrels[barrel].barrelType == "trap"){//if barrel is a trap barrel
            bulletlist[bulletID].dist = playerlist[id].barrels[barrel].trapDistBeforeStop;
            bulletlist[bulletID].bulletType = "trap";
          }
          else if (playerlist[id].barrels[barrel].barrelType == "drone"){//if barrel is drone spawner
            bulletlist[bulletID].bulletType = "drone";
          }
          else if (playerlist[id].barrels[barrel].barrelType == "aura"){//aura
            bulletlist[bulletID].bulletType = "aura";
            bulletlist[bulletID].width = playerlist[id].width * playerlist[id].barrels[barrel].auraSize;
            bulletlist[bulletID].height = playerlist[id].height * playerlist[id].barrels[barrel].auraSize;
            if (playerlist[id].tankType=="blizzard"){
              //light blue aura for blizzard
              bulletlist[bulletID].color = "rgba(173,216,230,.5)";
              bulletlist[bulletID].outline = "rgba(150, 208, 227)";
            }
            else{//normal red aura
              bulletlist[bulletID].color = "rgba(255,0,0,.5)";
              bulletlist[bulletID].outline = "rgba(255, 105, 105)";
            }
          }
          else{
            bulletlist[bulletID].bulletType = "bullet";
          }
          bulletID++;
          //successfully shot bullet
          }
          else{
            playerlist[id].barrels[barrel].reload--;
          }
        })
    }
}

function playerCollide(id, playerlist, location){
  if (location=="arena"){
      var elements = playerTree.retrieve({
          x: playerlist[id].x,
          y: playerlist[id].y,
          width: playerlist[id].width,
          height: playerlist[id].width
      });
    }
    else if (location=="cavern"){
      var elements = cavernplayerTree.retrieve({
          x: playerlist[id].x,
          y: playerlist[id].y,
          width: playerlist[id].width,
          height: playerlist[id].width
      });
    }
  Object.keys(elements).forEach((thing) => {
        var playerId = elements[thing].id
        if(playerlist.hasOwnProperty(playerId)){//if player still exists
    if (playerlist.hasOwnProperty(id) && playerlist.hasOwnProperty(playerId)){//check if player and shape still exists as might have been killed previously in this loop
      var DistanceBetween = Math.sqrt( (playerlist[id].x - playerlist[playerId].x)*(playerlist[id].x - playerlist[playerId].x) + (playerlist[id].y - playerlist[playerId].y)*(playerlist[id].y - playerlist[playerId].y) );//calculate distance between center of players
      if (DistanceBetween<=(playerlist[id].width+playerlist[playerId].width) && id!=playerId){
        //crashed
        //only do for playerlist[id] because the loop loops through all players, so if two players crash, playerlist[id] will occur twice, referring to different player each time
        playerlist[id].hit++;
        playerlist[id].health-=playerlist[playerId].damage;
        playerlist[id].healthRegenTimeChange = playerlist[id].healthRegenTime;//reset time to next health regeneration
        var anglehit = Math.atan2(playerlist[playerId].y - playerlist[id].y, playerlist[playerId].x - playerlist[id].x);
        //the above calculates the angle between players
        var speedMove = 1;//smaller number means move slower
          //move the player away from other player. only one as both player will have individual loop
        playerlist[playerId].x += Math.cos(anglehit) * speedMove * delta;
        playerlist[playerId].y += Math.sin(anglehit) * speedMove * delta;
        //remove player if zero health
        if (playerlist[playerId].health<=0){
          playerlist[id].score+=playerlist[playerId].score;
          io.to(id).emit('newNotification', "You killed "+playerlist[playerId].name, "grey");//send kill notification
          io.to(playerId).emit('youDied', playerlist[id].name, playerlist[playerId])
          addDeadObject(playerlist,playerId,"player",location)
          delete playerlist[playerId]//player killed
          console.log("someone died")
        }
        else if (playerlist[id].health<=0){
          playerlist[playerId].score+=playerlist[id].score;
          io.to(playerId).emit('newNotification', "You killed "+playerlist[id].name, "grey");//send kill notification
          io.to(id).emit('youDied', playerlist[playerId].name, playerlist[id])
          addDeadObject(playerlist,id,"player",location)
          delete playerlist[id]//player killed
          console.log("someone died")
        }
      }
    }
  }
  })
}
function playerCollideShape(id,playerlist,shapelist,location){
  if (playerlist.hasOwnProperty(id)){//if player wasnt killed in the game loop
  if (location=="arena"){
        var elements = shapeTree.retrieve({
          x: playerlist[id].x,
          y: playerlist[id].y,
          width: playerlist[id].width,
          height: playerlist[id].width
      });
      }
      else if (location=="cavern"){
        var elements = cavernshapeTree.retrieve({
          x: playerlist[id].x,
          y: playerlist[id].y,
          width: playerlist[id].width,
          height: playerlist[id].width
      });
      }
      Object.keys(elements).forEach((thing) => {
        var shapeId = elements[thing].id
    if (shapelist.hasOwnProperty(shapeId)&&playerlist.hasOwnProperty(id)){//check if shape still exists as might have been killed previously in this loop
      var DistanceBetween = Math.sqrt( (playerlist[id].x - shapelist[shapeId].x)*(playerlist[id].x - shapelist[shapeId].x) + (playerlist[id].y - shapelist[shapeId].y)*(playerlist[id].y - shapelist[shapeId].y) );//calculate distance between center of players
      if (DistanceBetween<=(playerlist[id].width+shapelist[shapeId].width)){
        //crashed
        shapelist[shapeId].hit++;
        playerlist[id].hit++;
        shapelist[shapeId].health-=playerlist[id].damage;
        playerlist[id].health-=shapelist[shapeId].damage;
        playerlist[id].healthRegenTimeChange=playerlist[id].healthRegenTime;//reset time to next health regeneration
        var anglehit = Math.atan2(playerlist[id].y - shapelist[shapeId].y, playerlist[id].x - shapelist[shapeId].x);
        //the above calculates the angle between players
        var speedMove = playerlist[id].width + shapelist[shapeId].width - DistanceBetween;//distance of overlap
          //move the player away from the shape
        playerlist[id].x += Math.cos(anglehit) * speedMove * delta * shapelist[shapeId].weight;
        playerlist[id].y += Math.sin(anglehit) * speedMove * delta * shapelist[shapeId].weight;
        //move the shape away from the player
        shapelist[shapeId].centerOfRotationX -= Math.cos(anglehit) * speedMove * delta * (1 - shapelist[shapeId].weight);
        shapelist[shapeId].centerOfRotationY -= Math.sin(anglehit) * speedMove * delta * (1 - shapelist[shapeId].weight);

        //check if player attacked this shape before
        var attackedShapeBefore = "no";
        Object.keys(shapelist[shapeId].attackers).forEach((attackerid) => {
          if (shapelist[shapeId].attackers[attackerid]==playerlist[id]){
            attackedShapeBefore = "yes";
          }
        })
        if (attackedShapeBefore=="no"){//if havent attacked shape before, add player to list of people who attacked the shape
          shapelist[shapeId].attackers[id] = playerlist[id];
        }
        
        if (playerlist[id].health<=0){
          io.to(id).emit('youDied', shapelist[shapeId].name, playerlist[id])
          addDeadObject(playerlist,id,"player",location)
          delete playerlist[id]//player killed
          console.log("someone died")
        }
      }
    }
  })
}
}
function playerCollidePortal(id, playerlist, newplayerlist, portallist, spawnlocationx, spawnlocationy, mapSize, location){
  //doesnt use quadtree cuz im too lazy. instead, it uses conventional collision detection (check each player with each portal)
  Object.keys(portallist).forEach((portalId) => {
    if (playerlist.hasOwnProperty(id) && portallist.hasOwnProperty(portalId)){//check if player and portal still exists as might have been killed previously in this loop
      var DistanceBetween = Math.sqrt( (playerlist[id].x - portallist[portalId].x)*(playerlist[id].x - portallist[portalId].x) + (playerlist[id].y - portallist[portalId].y)*(playerlist[id].y - portallist[portalId].y) );//calculate distance between center of players
      if (DistanceBetween<=(playerlist[id].width+portallist[portalId].width)){
        //crashed with portal
        //move player towards center of portal
        var stepWidthFactor = 30;//this number MUST be more or equal to one. The HIGHER the number, the SLOWER the player is sucked into the center of the portal
        var sizeOfHitBox = 20;//size of area in center of portal which player need to touch in order to teleport
        if (Math.abs(playerlist[id].x - portallist[portalId].x) > sizeOfHitBox || Math.abs(playerlist[id].y - portallist[portalId].y) > sizeOfHitBox){//if player is not at center of portal
          playerlist[id].x += (playerlist[id].x - portallist[portalId].x) / stepWidthFactor * -1;
          playerlist[id].y += (playerlist[id].y - portallist[portalId].y) / stepWidthFactor * -1;
        }
        else{
          //player at center of portal
          //portal grow in size
          portallist[portalId].width+=10
          //add player to dune
          newplayerlist[id] = playerlist[id]
          //spawn player at top left of dune
          if (spawnlocationx=="random" || spawnlocationy=="random"){
            const playerX = Math.floor(Math.random() * mapSize);
            const playerY = Math.floor(Math.random() * mapSize);
            newplayerlist[id].x=playerX;
            newplayerlist[id].y=playerY;
          }
          else{
            newplayerlist[id].x=spawnlocationx;
            newplayerlist[id].y=spawnlocationy;
          }
          //remove player from arena
          addDeadObject(playerlist,id,"player",location)
          delete playerlist[id]
        }
      }
    }
  })
}
function removePortal(id, portallist, location){
  if (portallist[id].timer<=0){
    //remove portal
    addDeadObject(portallist,id,"portal",location)
    delete portallist[id]
  }
  else {
    portallist[id].timer--;
  }
}
function moveBotDune(id, location){
  //if bot no health, give score to everyone who dealed damage to it, and then remove the bot
  if (dunebots[id].health<=0){
    var scoreToGive = Math.round(dunebots[id].score/Object.keys(dunebots[id].attackers).length);//split score among all killers
    Object.keys(dunebots[id].attackers).forEach((attackerid) => {
      dunebots[id].attackers[attackerid].score+=scoreToGive;
    })
    addDeadObject(dunebots,id,"bot",location)
    delete dunebots[id]
  }
  else{
    //find nearest player
    var distance = "unknown";
    var target = "unknown"
    Object.keys(duneplayers).forEach((playerId) => {
      var DistanceBetween = Math.sqrt( (dunebots[id].x - duneplayers[playerId].x)*(dunebots[id].x - duneplayers[playerId].x) + (dunebots[id].y - duneplayers[playerId].y)*(dunebots[id].y - duneplayers[playerId].y) );//calculate distance between bot and player
      if (DistanceBetween<=dunebots[id].botFovRange){
        if (distance=="unknown"){
          distance = DistanceBetween;
          target = duneplayers[playerId];
        }
        else if (DistanceBetween<distance){
          distance = DistanceBetween;
          target = duneplayers[playerId];
        }
      }
    })
      //move bot towards nearest player
      var DistanceBetween = Math.sqrt( (dunebots[id].x - target.x)*(dunebots[id].x - target.x) + (dunebots[id].y - target.y)*(dunebots[id].y - target.y) );//calculate distance between bot and target
        if (DistanceBetween>(dunebots[id].width+target.width)){
          //if bot has not hit player yet
          if (dunebots[id].speed > (DistanceBetween*delta)){
            var movespeed = DistanceBetween*delta
          }
          else{
            var movespeed = dunebots[id].speed;
          }
          var anglehit = Math.atan2(target.y - dunebots[id].y, target.x - dunebots[id].x);
          dunebots[id].x += Math.cos(anglehit) * movespeed;
          dunebots[id].y += Math.sin(anglehit) * movespeed;
      
      Object.keys(dunebots).forEach((playerId) => {//collision between bots
        var DistanceBetween = Math.sqrt( (dunebots[id].x - dunebots[playerId].x)*(dunebots[id].x - dunebots[playerId].x) + (dunebots[id].y - dunebots[playerId].y)*(dunebots[id].y - dunebots[playerId].y) );//calculate distance between center of bots
        if (DistanceBetween < (dunebots[id].width+dunebots[playerId].width) && id!=playerId  && dunebots[id].movedInThisLoop==0 && dunebots[id].name!="rock"){
          //crashed, and make sure that the this bot has not moved already due to collision with other bots, and the moving bot is not a rock
          dunebots[id].x -= Math.cos(Math.atan2(dunebots[playerId].y - dunebots[id].y, dunebots[playerId].x - dunebots[id].x)) * (dunebots[id].width + dunebots[playerId].width -DistanceBetween) * delta;
          dunebots[id].y -= Math.sin(Math.atan2(dunebots[playerId].y - dunebots[id].y, dunebots[playerId].x - dunebots[id].x)) * (dunebots[id].width + dunebots[playerId].width - DistanceBetween) * delta;
          dunebots[id].movedInThisLoop=1;
        }
      })

    }
    else if (target=="unknown"){
      //if no target, then bot go back home
      var anglehit = Math.atan2(dunebots[id].homeY - dunebots[id].y, dunebots[id].homeX - dunebots[id].x);
      dunebots[id].x += Math.cos(anglehit) * dunebots[id].speed;
      dunebots[id].y += Math.sin(anglehit) * dunebots[id].speed;
    }
  }
}
function healthRegenerate(id,playerlist){
  if (playerlist[id].health<playerlist[id].maxhealth){
    playerlist[id].healthRegenTimeChange--;
  }
  if (playerlist[id].healthRegenTimeChange<=0&&playerlist[id].health<playerlist[id].maxhealth){
    playerlist[id].health+=playerlist[id].healthRegenSpeed
  }
  else if (playerlist[id].healthRegenTimeChange<=0&&playerlist[id].health>=playerlist[id].maxhealth){
    playerlist[id].healthRegenTimeChange=playerlist[id].healthRegenTime;//reset time to next health regeneration
    playerlist[id].health=playerlist[id].maxhealth;//make sure health exactly at max health, it is possible for health to be more than maxhealth if the damage to health is a percentage or the health regen is very high
  }
}
function clock(start) {//function for measuring code execution time
    if ( !start ) return process.hrtime();
    var end = process.hrtime(start);
    return Math.round((end[0]*1000) + (end[1]/1000000));
}

function gameLoop() {
  //this gameloop function keep running in the server if there are people
  //this game loop is for ARENA

  //reset all objects' hit value
  //purpose of hit value is to tell client whether object hit or not so it will flash the object, everytime a object is hit, it's hit value increases
  Object.keys(shapes).forEach((id) => {
    shapes[id].hit=0;
  })
  Object.keys(players).forEach((id) => {
    players[id].hit=0;
  })
  Object.keys(bullets).forEach((id) => {
    bullets[id].hit=0;
  })
  //for quadtree
  bulletTree.clear();
      Object.keys(bullets).forEach((id) => {
        bulletTree.insert({
            x: bullets[id].x,
            y: bullets[id].y,
            width: bullets[id].width,
            height: bullets[id].width,
            id: id
        });
      })
  shapeTree.clear();
      Object.keys(shapes).forEach((id) => {
        shapeTree.insert({
            x: shapes[id].x,
            y: shapes[id].y,
            width: shapes[id].width,
            height: shapes[id].width,
            id: id
        });
      })
  playerTree.clear();
      Object.keys(players).forEach((id) => {
        playerTree.insert({
            x: players[id].x,
            y: players[id].y,
            width: players[id].width,
            height: players[id].width,
            id: id
        });
      })
  deadArenaObjects = [];//clear list of dead objects
	//1.move player, shoot, update level, regenerate health, check player collision
  Object.keys(players).forEach((playerId) => {
    checkIfNewWorldRecord(players[playerId])//check if player beat world record
    chatRemovalAfterSomeTime(players,playerId)//remove old chat messages
    barrelAnimationForShooting(players,playerId)//calculate barrel height for animation when shooting
    movePlayer(players[playerId], playerId, "yes", "yes", "no", gameSize, shapes, players, "nothing")
    spawnBullets(playerId,players,bullets)
    playerLevel(players[playerId])
    healthRegenerate(playerId,players)
    playerCollide(playerId,players,"arena")
    playerCollideShape(playerId,players,shapes,"arena")
    playerCollidePortal(playerId, players, duneplayers, portals, enterDunePortal.x, enterDunePortal.y, 0, "arena")
    playerCollidePortal(playerId, players, cavernplayers, cavernportals, "random", "random", cavernSize, "arena")
  })
  //2.move the shapes, check collision with border and other shapes, change radiant color
  Object.keys(shapes).forEach((shapeId) => {
    radiantShapes(shapes,shapeId)
    moveShape(shapeId,shapes,gameSize,"arena")
  })
  //3.move the bullets, check for collision with shapes, borders, players, and other bullets, and remove shapes and players if no more health
  Object.keys(bullets).forEach((bulletId) => {
      moveBullet(bullets, bulletId, "yes", "yes", "yes", "no", gameSize, players, shapes, "arena")
  })
  //4. remove portal after it exist for a certain amount of time
  Object.keys(portals).forEach((portalId) => {
    removePortal(portalId,portals, "arena")
  })
  Object.keys(cavernportals).forEach((portalId) => {
    radiantShapes(cavernportals,portalId)
    removePortal(portalId,cavernportals, "arena")
  })
  //5.change game size so that the game is 1000px width and height if only one person, and for every other person in the game, add 10px to the width and height
  //Note: Object.keys(players).length refers to number of players (number of items in array)
  if (Object.keys(players).length>1){//if more than one player
    if (gameSize < (Object.keys(players).length-1)*500+startGameSize){//if gamesize smaller than supposed to be
      gameSize++;
    }
    else if (gameSize > (Object.keys(players).length-1)*500+startGameSize){//if gameSize bigger than supposed to be
      gameSize--;
    }
  }
  else{//if only one player
    if (gameSize!=startGameSize){
      gameSize = startGameSize;
    }
  }
  
  //6.choose whether a shape will spawn or not
  if (Object.keys(shapes).length<100){
    var choosing = Math.floor(Math.random() * 1000);//only choose if shape will spawn if the number of shapes is less than 100
    var shapeX = Math.floor(Math.random() * gameSize);
    var shapeY = Math.floor(Math.random() * gameSize);
    var startAngle = Math.floor(Math.random() * 11)/10;//random shape's angle range from 0.0 to 1.0
  }
  else{
    var choosing = 0;
  }
  if (choosing>=1&&choosing<=300){//the larger the range, the higher the possibility for this shape to spawn
    //spawn a square
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 1,
      maxhealth: 1,
      damage: 0.05,//for shapes colliding with players, not bullets
    	name: "square",
      width: 25,
      height: 25,
      color: "#FFE46B",
      outline: "#E1C64D",
      score: 10,
      sides: 4,
      hit: 0,
      attackers: {},
      weight: 0//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=301&&choosing<=350){
    //spawn a radiant square
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 1,
      maxhealth: 1,
      damage: 0.05,//for shapes colliding with players, not bullets
    	name: "radiant square",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 25,
      height: 25,
      score: 30,
      sides: 4,
      hit: 0,
      attackers: {},
      weight: 0//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=351&&choosing<=551){
    //spawn a triangle
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 5,
      maxhealth: 5,
      damage: 0.1,
    	name: "triangle",
      width: 40,
      height: 40,
      color: "#FC7676",
      outline: "#DE5858",
      score: 50,
      sides: 3,
      hit: 0,
      attackers: {},
      weight: 0.2//range between 0 and 1
    }
    shapeID++;
  }
    else if (choosing>=551&&choosing<=580){
    //spawn a radiant triangle
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 5,
      maxhealth: 5,
      damage: 0.1,
    	name: "radiant triangle",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 40,
      height: 40,
      score: 150,
      sides: 3,
      hit: 0,
      attackers: {},
      weight: 0.2//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=580&&choosing<=680){
    //spawn a pentagon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 25,
      maxhealth: 25,
      damage: 0.2,
    	name: "pentagon",
      width: 60,
      height: 60,
      color: "#c063f2",
      outline: "#a233de",
      score: 250,
      sides: 5,
      hit: 0,
      attackers: {},
      weight: 0.3//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=681&&choosing<=690){
    //spawn a radiant pentagon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 25,
      maxhealth: 25,
      damage: 0.2,
    	name: "radiant pentagon",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 60,
      height: 60,
      score: 750,
      sides: 5,
      hit: 0,
      attackers: {},
      weight: 0.3//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=691&&choosing<=750){
    //spawn a hexagon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 125,
      maxhealth: 125,
      damage: 0.4,
    	name: "hexagon",
      width: 80,
      height: 80,
      color: "#fcab53",
      outline: "#ed8e28",
      score: 1250,
      sides: 6,
      hit: 0,
      attackers: {},
      weight: 0.5//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=751&&choosing<=755){
    //spawn a radiant hexagon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 125,
      maxhealth: 125,
      damage: 0.4,
    	name: "radiant hexagon",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 80,
      height: 80,
      score: 3750,
      sides: 6,
      hit: 0,
      attackers: {},
      weight: 0.5//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=756&&choosing<=780){
    //spawn a heptagon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 625,
      maxhealth: 625,
      damage: 0.8,
    	name: "heptagon",
      width: 100,
      height: 100,
      color: "#db6930",
      outline: "#b85d30",
      score: 6250,
      sides: 7,
      hit: 0,
      attackers: {},
      weight: 0.7//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=781&&choosing<=785){
    //spawn a radiant heptagon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 625,
      maxhealth: 625,
      damage: 0.8,
    	name: "radiant heptagon",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 100,
      height: 100,
      score: 18750,
      sides: 7,
      hit: 0,
      attackers: {},
      weight: 0.7//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=786&&choosing<=800){
    //spawn a octagon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 3125,
      maxhealth: 3125,
      damage: 1,
    	name: "octagon",
      width: 120,
      height: 120,
      color: "#8a4ead",
      outline: "#8031ad",
      score: 31250,
      sides: 8,
      hit: 0,
      attackers: {},
      weight: 0.9//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=801&&choosing<=803){
    //spawn a radiant octagon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 3125,
      maxhealth: 3125,
      damage: 1,
    	name: "radiant octagon",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 120,
      height: 120,
      score: 93750,
      sides: 8,
      hit: 0,
      attackers: {},
      weight: 0.9//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=804&&choosing<=810){
    //spawn a nonogon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 15625,
      maxhealth: 15625,
      damage: 1,
    	name: "nonagon",
      width: 140,
      height: 140,
      color: "#74d495",
      outline: "#58b076",
      score: 156250,
      sides: 9,
      hit: 0,
      attackers: {},
      weight: 1//range between 0 and 1
    }
    shapeID++;
  }
    else if (choosing>=811&&choosing<=813){
    //spawn a radiant nonagon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 15625,
      maxhealth: 15625,
      damage: 1,
    	name: "radiant nonagon",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 140,
      height: 140,
      score: 468750,
      sides: 9,
      hit: 0,
      attackers: {},
      weight: 1//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=814&&choosing<=817){
    //spawn a decagon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 156250,
      maxhealth: 156250,
      damage: 1,
    	name: "decagon",
      width: 170,
      height: 170,
      color: "#EDEDFF",
      outline: "#CFCFE1",
      score: 781250,
      sides: 10,
      hit: 0,
      attackers: {},
      weight: 1//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=818&&choosing<=819){
    //spawn a hendecagon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 781250,
      maxhealth: 781250,
      damage: 1,
    	name: "hendecagon",
      width: 240,
      height: 240,
      color: "#30DAFC",
      outline: "#0EA1BF",
      score: 3906250,
      sides: 11,
      hit: 0,
      attackers: {},
      weight: 1//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=820&&choosing<=825){
    //spawn a big square
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 100,
      maxhealth: 100,
      damage: 0.4,//for shapes colliding with players, not bullets
    	name: "big square",
      width: 50,
      height: 50,
      color: "#FFE46B",
      outline: "#E1C64D",
      score: 1000,
      sides: 4,
      hit: 0,
      attackers: {},
      weight: 0.6//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=826&&choosing<=830){
    //spawn a big triangle
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 300,
      maxhealth: 300,
      damage: 0.8,
    	name: "big triangle",
      width: 80,
      height: 80,
      color: "#FC7676",
      outline: "#DE5858",
      score: 3000,
      sides: 3,
      hit: 0,
      attackers: {},
      weight: 0.9//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=831&&choosing<=834){
    //spawn a big pentagon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 900,
      maxhealth: 900,
      damage: 1,
    	name: "big pentagon",
      width: 120,
      height: 120,
      color: "#c063f2",
      outline: "#a233de",
      score: 9000,
      sides: 5,
      hit: 0,
      attackers: {},
      weight: 1//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=835&&choosing<=837){
    //spawn a big hexagon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 2700,
      maxhealth: 2700,
      damage: 2,
    	name: "big hexagon",
      width: 160,
      height: 160,
      color: "#fcab53",
      outline: "#ed8e28",
      score: 27000,
      sides: 6,
      hit: 0,
      attackers: {},
      weight: 1//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=838&&choosing<=841){
    //spawn a shiny square
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 3,
      maxhealth: 3,
      damage: 0.4,//for shapes colliding with players, not bullets
    	name: "shiny square",
      width: 30,
      height: 30,
      color: "#7CFF80",
      outline: "#20F927",
      score: 90,
      sides: 4,
      hit: 0,
      attackers: {},
      weight: 0//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=842&&choosing<=843){
    //spawn a shiny square
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 15,
      maxhealth: 15,
      damage: 0.8,//for shapes colliding with players, not bullets
    	name: "shiny triangle",
      width: 50,
      height: 50,
      color: "#7CFF80",
      outline: "#20F927",
      score: 450,
      sides: 3,
      hit: 0,
      attackers: {},
      weight: 0//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing==844){
    //spawn a shiny pentagon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 45,
      maxhealth: 45,
      damage: 1,//for shapes colliding with players, not bullets
    	name: "shiny pentagon",
      width: 80,
      height: 80,
      color: "#7CFF80",
      outline: "#20F927",
      score: 2250,
      sides: 5,
      hit: 0,
      attackers: {},
      weight: 0//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing==845){
    //spawn a big heptagon
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 8100,
      maxhealth: 8100,
      damage: 3,
    	name: "big heptagon",
      width: 200,
      height: 200,
      color: "#db6930",
      outline: "#b85d30",
      score: 81000,
      sides: 7,
      hit: 0,
      attackers: {},
      weight: 1//range between 0 and 1
    }
    shapeID++;
  }
   else if (choosing==846){
    //spawn a collosal square
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 25000,
      maxhealth: 25000,
      damage: 4,//for shapes colliding with players, not bullets
    	name: "collosal square",
      width: 200,
      height: 200,
      color: "#FFE46B",
      outline: "#E1C64D",
      score: 500000,
      sides: 4,
      hit: 0,
      attackers: {},
      weight: 1//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing==847){
    //spawn a gem
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 2000,
      maxhealth: 2000, //
      damage: 0.05,//for shapes colliding with players, not bullets
    	name: "gem",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 15,
      height: 15,
      score: 100000,
      sides: 8,
      hit: 0,
      attackers: {},
      weight: 1//range between 0 and 1
    }
    shapeID++;
  }
  else if (jewelSpawnChance==283){
    //spawn a jewel
    io.emit("newNotification","A jewel has spawned in the arena!", "yellow")
    //basically impossible to spawn though
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 20000,
      maxhealth: 20000, //
      damage: 0.05,//for shapes colliding with players, not bullets
    	name: "jewel",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 10,
      height: 10,
      score: 839251000000000,
      sides: 6,
      hit: 0,
      attackers: {},
      weight: 1//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing==848){
    //spawn a star
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 2000,
      maxhealth: 2000,
      damage: 0.05,//for shapes colliding with players, not bullets
    	name: "star",
      width: 60,
      height: 60,
      color: "#fcba03",
      outline: "orange",
      score: 100000,
      sides: "star",
      hit: 0,
      attackers: {},
      weight: 1//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing==849){
    //spawn a supermassive square
    shapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 250000,
      maxhealth: 250000,
      damage: 4,//for shapes colliding with players, not bullets
    	name: "supermassive square",
      width: 500,
      height: 500,
      color: "#FFE46B",
      outline: "#E1C64D",
      score: 25000000,
      sides: 4,
      hit: 0,
      attackers: {},
      weight: 1//range between 0 and 1
    }
    shapeID++;
  }
  
  //7.choose whether a portal will spawn or not
  var choosingPortal = Math.floor(Math.random() * 1500);
  if (choosingPortal>=1&&choosingPortal<=5){
    //spawn portal
    console.log("a dune portal spawned!")
    const portalX = Math.floor(Math.random() * (gameSize - 100))+50;//-100 then +50 so that portals wont spawn at 50px near sides of arena
    const portalY = Math.floor(Math.random() * (gameSize - 100))+50;
    portals[portalID] = {
  	  x: portalX,
    	y: portalY,
    	name: "dune portal",
      width: 100,
      color: "orange",
      maxtimer: 1000,//starting number of timer, does not change, must be same value as timer when portal spawn
      timer: 1000//the higher the number, the longer the portal stays
    }
    portalID++;
  }
  if (choosingPortal==6){
    //spawn cavern portal
    console.log("a cavern portal spawned!")
    const portalX = Math.floor(Math.random() * (gameSize - 100))+50;//-100 then +50 so that portals wont spawn at 50px near sides of arena
    const portalY = Math.floor(Math.random() * (gameSize - 100))+50;
    cavernportals[portalID] = {
  	  x: portalX,
    	y: portalY,
    	name: "cavern portal",
      width: 100,
      color: "red",
      maxtimer: 1000,//starting number of timer, does not change, must be same value as timer when portal spawn
      timer: 1000,//the higher the number, the longer the portal stays
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0
    }
    portalID++;
  }
  //next, calculate leaderboard
  //sort the object list based on score, the const below contains the list of id of players on leaderboard
  //note: this const is an array, NOT an object, so cannot use Object.something
  const temporaryPlayerList = (Object.keys(players).sort(function(a, b){return players[b].score-players[a].score})).slice(0,10);
  //flip the a and b in the square brackets [] to get opposite order, e.g. ascending instead of descending order
  //.slice(0,10) gets the first ten players, it works even if there are less than 10 players
  const leaderboardplayers = {}
  //leaderboardplayers contain the players info
  temporaryPlayerList.forEach((id) => {
    //add player's name, score and color to list because only need this three in client code
      leaderboardplayers[id] = {
        name: players[id].name,
        color: players[id].color,
        score: players[id].score
      }
  })
  //8.send stuff to the players. To edit the stuff you want to send to the players below, simply go to the client code and edit the variables in the function in gameStateUpdate
  //we must check each item in the game to see if it is visible on a 1080x1920 canvas for each player, and only send the things that are supposed to be visible, preventing field of vision hacking
  //NOTE: 1080 and 1920 refers to the canvas width and height
  Object.keys(players).forEach((playerId) => {
    var shakingYN = "no";
    const items = {}
    numberOfObj = 0;
    var thisPlayerIDinTheList = 0;
    //portals drawn first so they are below everything
    Object.keys(portals).forEach((portalID) => {
      //check for collision with portal, then tell client whether to shake canvas or not
      var DistanceBetween = Math.sqrt( (players[playerId].x - portals[portalID].x)*(players[playerId].x - portals[portalID].x) + (players[playerId].y - portals[portalID].y)*(players[playerId].y - portals[portalID].y) );//calculate distance between center of players
      if (DistanceBetween<=(players[playerId].width+portals[portalID].width)){
        shakingYN = "yes"
      }
      
      if (((portals[portalID].y>=players[playerId].y && (portals[portalID].y-players[playerId].y-portals[portalID].width)<=1080/2*players[playerId].fovMultiplier) || (portals[portalID].y<=players[playerId].y && (players[playerId].y-portals[portalID].y-portals[portalID].width)<=1080/2*players[playerId].fovMultiplier)) && ((portals[portalID].x>=players[playerId].x && (portals[portalID].x-players[playerId].x-portals[portalID].width)<=1920/2*players[playerId].fovMultiplier) || (portals[portalID].x<=players[playerId].x && (players[playerId].x-portals[portalID].x-portals[portalID].width)<=1920/2*players[playerId].fovMultiplier))){
        //check if portal is visible on screen
        numberOfObj++;
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        items[numberOfObj] = {...portals[portalID]};
        items[numberOfObj].type = "portal";
      }
    })
    Object.keys(cavernportals).forEach((portalID) => {
      //check for collision with portal, then tell client whether to shake canvas or not
      var DistanceBetween = Math.sqrt( (players[playerId].x - cavernportals[portalID].x)*(players[playerId].x - cavernportals[portalID].x) + (players[playerId].y - cavernportals[portalID].y)*(players[playerId].y - cavernportals[portalID].y) );//calculate distance between center of players
      if (DistanceBetween<=(players[playerId].width+cavernportals[portalID].width)){
        shakingYN = "yes"
      }

      if (((cavernportals[portalID].y>=players[playerId].y && (cavernportals[portalID].y-players[playerId].y-cavernportals[portalID].width)<=1080/2*players[playerId].fovMultiplier) || (cavernportals[portalID].y<=players[playerId].y && (players[playerId].y-cavernportals[portalID].y-cavernportals[portalID].width)<=1080/2*players[playerId].fovMultiplier)) && ((cavernportals[portalID].x>=players[playerId].x && (cavernportals[portalID].x-players[playerId].x-cavernportals[portalID].width)<=1920/2*players[playerId].fovMultiplier) || (cavernportals[portalID].x<=players[playerId].x && (players[playerId].x-cavernportals[portalID].x-cavernportals[portalID].width)<=1920/2*players[playerId].fovMultiplier))){
        //check if portal is visible on screen
        numberOfObj++;
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        items[numberOfObj] = {...cavernportals[portalID]};
        items[numberOfObj].type = "portal";
      }
    })
    //shapes are next so that players and bullets are drawn above it and above portal
    Object.keys(shapes).forEach((shapeID) => {
      if (((shapes[shapeID].y>=players[playerId].y && (shapes[shapeID].y-players[playerId].y-shapes[shapeID].width)<=1080/2*players[playerId].fovMultiplier) || (shapes[shapeID].y<=players[playerId].y && (players[playerId].y-shapes[shapeID].y-shapes[shapeID].width)<=1080/2*players[playerId].fovMultiplier)) && ((shapes[shapeID].x>=players[playerId].x && (shapes[shapeID].x-players[playerId].x-shapes[shapeID].width)<=1920/2*players[playerId].fovMultiplier) || (shapes[shapeID].x<=players[playerId].x && (players[playerId].x-shapes[shapeID].x-shapes[shapeID].width)<=1920/2*players[playerId].fovMultiplier))){
        //check if shape is visible on screen
        numberOfObj++;
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        items[numberOfObj] = {...shapes[shapeID]};
        items[numberOfObj].type = "shape";
        Object.keys(items[numberOfObj]).forEach((property) => {
          if (property!="name" && property!="angle" && property!="type" && property!="hit" && property!="red" && property!="green" && property!="blue" && property!="x" && property!="y" && property!="sides" && property!="width" && property!="color" && property!="outline" && property!="health" && property!="maxhealth"){//the above are all the properties needed in client code
            delete items[numberOfObj][property]
          }
        })
      }
    })
    //bullets drawn next so that they are above shapes but below player
    Object.keys(bullets).forEach((bulletID) => {
      if (((bullets[bulletID].y>=players[playerId].y && (bullets[bulletID].y-players[playerId].y-bullets[bulletID].width)<=1080/2*players[playerId].fovMultiplier) || (bullets[bulletID].y<=players[playerId].y && (players[playerId].y-bullets[bulletID].y-bullets[bulletID].width)<=1080/2*players[playerId].fovMultiplier)) && ((bullets[bulletID].x>=players[playerId].x && (bullets[bulletID].x-players[playerId].x-bullets[bulletID].width)<=1920/2*players[playerId].fovMultiplier) || (bullets[bulletID].x<=players[playerId].x && (players[playerId].x-bullets[bulletID].x-bullets[bulletID].width)<=1920/2*players[playerId].fovMultiplier))){
        //check if bullet is visible on screen
        numberOfObj++;
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        items[numberOfObj] = {...bullets[bulletID]};
        items[numberOfObj].type = "bullet";
        if (items[numberOfObj].ownerId==playerId){//if bullet belongs to this player
          items[numberOfObj].ownsIt = "yes";
        }
        Object.keys(items[numberOfObj]).forEach((property) => {
          if (property!="passive" && property!="type" && property!="ownsIt" && property!="hit" && property!="color" && property!="outline" && property!="bulletType" && property!="x" && property!="y" && property!="width"){//the above are all the properties needed in client code
            delete items[numberOfObj][property]
          }
        })
      }
    })
    //player drawn last so that they are above shapes and bullets
    Object.keys(players).forEach((playerID) => {
      if (((players[playerID].y>=players[playerId].y && (players[playerID].y-players[playerId].y-players[playerID].width)<=1080/2*players[playerId].fovMultiplier) || (players[playerID].y<=players[playerId].y && (players[playerId].y-players[playerID].y-players[playerID].width)<=1080/2*players[playerId].fovMultiplier)) && ((players[playerID].x>=players[playerId].x && (players[playerID].x-players[playerId].x-players[playerID].width)<=1920/2*players[playerId].fovMultiplier) || (players[playerID].x<=players[playerId].x && (players[playerId].x-players[playerID].x-players[playerID].width)<=1920/2*players[playerId].fovMultiplier)) || playerID == playerId){
        //check if bullet is visible on screen or if player is the player that this is sending to
        numberOfObj++;
        if (playerID==playerId){
          //if this is the player that the server is sending to
          thisPlayerIDinTheList = numberOfObj;
        }
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        items[numberOfObj] = {...players[playerID]};
        items[numberOfObj].type = "player";
        Object.keys(items[numberOfObj]).forEach((property) => {
          if (property!="assets" && property!="barrelHeightChange" && property!="developer" && property!="chats" && property!="type" && property!="x" && property!="y" && property!="angle" && property!="tankType" && property!="width" && property!="height" && property!="barrels" && property!="barrelColor" && property!="barrelOutline" && property!="hit" && property!="color" && property!="outline" && property!="name" && property!="level" && property!="health" && property!="maxhealth" && property!="fovMultiplier" && (playerID!=playerId || (property!="score" && property!="tankTypeLevel"))){//the above are all the properties needed in client code
            delete items[numberOfObj][property]
          }
        })
      }
    })
    //combine portal and cavern portal lists together so that all portals can be sent together and shown on minimap
    let totalportals = {
        ...portals,
        ...cavernportals
    };

    //change object lists to strings to reduce bandwidth. remember to parse these strings back into objects in the client code
    const itemlist = JSON.stringify(items);
    const newportallist = JSON.stringify(totalportals);
    const newleaderboard = JSON.stringify(leaderboardplayers);
    io.to(playerId).emit('gameStateUpdate', gameSize, itemlist, duration, thisPlayerIDinTheList, Object.keys(players).length, Object.keys(shapes).length, newportallist, "arena", shakingYN, newleaderboard, deadArenaObjects);//send stuff to specific player
    //this is only sent to players in the players list, so that players who disconnected, died, or in home page will not receive this
  })
}//end of game loop function

function gameLoopDune() {
  //this gameloop function keep running in the server if there are people
  //this game loop is for DUNE

  //reset all objects' hit value
  //purpose of hit value is to tell client whether object hit or not so it will flash the object, everytime a object is hit, it's hit value increases
  Object.keys(duneplayers).forEach((id) => {
    duneplayers[id].hit=0;
  })
  Object.keys(dunebots).forEach((id) => {
    dunebots[id].hit=0;
    dunebots[id].movedInThisLoop=0;
  })
  Object.keys(dunebullets).forEach((id) => {
    dunebullets[id].hit=0;
  })
  
  //for quadtree
  dunebulletTree.clear();
      Object.keys(dunebullets).forEach((id) => {
        dunebulletTree.insert({
            x: dunebullets[id].x,
            y: dunebullets[id].y,
            width: dunebullets[id].width,
            height: dunebullets[id].width,
            id: id
        });
      })
  botTree.clear();
      Object.keys(dunebots).forEach((id) => {
        botTree.insert({
            x: dunebots[id].x,
            y: dunebots[id].y,
            width: dunebots[id].width,
            height: dunebots[id].width,
            id: id
        });
      })
  deadDuneObjects = [];//clear list of dead objects
	//1.move players, shoot, check for collision, regenerate health, update level
  Object.keys(duneplayers).forEach((playerId) => {
    checkIfNewWorldRecord(duneplayers[playerId])//check if player beat world record
    chatRemovalAfterSomeTime(duneplayers,playerId)//remove old chat messages
    barrelAnimationForShooting(duneplayers,playerId)//calculate barrel height for animation when shooting
    healthRegenerate(playerId,duneplayers)
    //check for collision with white portal at top left corner of dune
    var DistanceBetween = Math.sqrt( (duneplayers[playerId].x - enterDunePortal.x)*(duneplayers[playerId].x - enterDunePortal.x) + (duneplayers[playerId].y - enterDunePortal.y)*(duneplayers[playerId].y - enterDunePortal.y) );//calculate distance between center of player and center of portal, portal treated as a circle
    if (DistanceBetween<=(duneplayers[playerId].width+enterDunePortal.width/2)){
      //crashed
      var anglehit = Math.atan2(duneplayers[playerId].y - enterDunePortal.y, duneplayers[playerId].x - enterDunePortal.x);
      var speedMove = 5;//smaller number means move slower
      //push player out of white portal
      duneplayers[playerId].x += Math.cos(anglehit) * speedMove;
      duneplayers[playerId].y += Math.sin(anglehit) * speedMove;
    }
    playerLevel(duneplayers[playerId])
    spawnBullets(playerId,duneplayers,dunebullets)
    movePlayer(duneplayers[playerId], playerId, "no", "no", "yes", duneGameSize, "nothing", "nothing", dunebots)
    //the functions below are done last because they will remove players from the dune player list
    playerBotCollide(duneplayers,playerId)
    playerCollidePortal(playerId, duneplayers, players, duneportals, "random", "random", gameSize, "dune")
  })
  //move the bullets, check for collision with borders and bots, and remove bots if no more health
  Object.keys(dunebullets).forEach((bulletId) => {
    moveBullet(dunebullets, bulletId, "no", "no", "no", "yes", duneGameSize, "nothing", "nothing", "dune")
  })
  //update portal timer
  Object.keys(duneportals).forEach((portalId) => {
    removePortal(portalId,duneportals, "dune")
  })
  //move the bot
  Object.keys(dunebots).forEach((botId) => {
    moveBotDune(botId,"dune")
  })
  //spawn bot
  // why is it at 100 bots are you braindead?
  if (firstHive<50){//max of 50 bots in this hive
    //first hive spawning point, top left
    var botX = 1500;
    var botY = 1500;
    var botLevel = Math.floor(Math.random() * 1000);
    if (botLevel<=300){
      firstHive++;
      dunebots[botID] = {
  	    x: botX,
      	y: botY,
      	name: "Bumper",
        width: 10,
        height: 10,
        color: "#B22222",
        outline: "#E9967A",
        score: 50,
        health: 35,
        maxhealth: 35,
        damage: 0.05,
        speed: 40,
        hit: 0,
        movedInThisLoop: 0,
        specialty: "very fast",
        attackers: {},
        botFovRange: 1000,
        homeX: botX,
        homeY: botY,
        hive: 1
      }
      botID++;
    }
    else if (botLevel>300&&botLevel<=500){
      firstHive++;
      dunebots[botID] = {
  	    x: botX,
      	y: botY,
      	name: "Crasher",
        width: 25,
        height: 25,
        color: "#B22222",
        outline: "#E9967A",
        score: 200,
        health: 110,
        maxhealth: 110,
        damage: 0.05,
        speed: 20,
        hit: 0,
        movedInThisLoop: 0,
        specialty: "fast",
        attackers: {},
        botFovRange: 1000,
        homeX: botX,
        homeY: botY,
        hive: 1
      }
      botID++;
    }
    else if (botLevel>500&&botLevel<=750){
      firstHive++;
      dunebots[botID] = {
  	    x: botX,
      	y: botY,
      	name: "Legion",
        width: 50,
        height: 50,
        color: "#B22222",
        outline: "#E9967A",
        score: 500,
        health: 200,
        maxhealth: 200,
        damage: 0.1,
        speed: 15,
        hit: 0,
        movedInThisLoop: 0,
        specialty: "",
        attackers: {},
        botFovRange: 1000,
        homeX: botX,
        homeY: botY,
        hive: 1
      }
      botID++;
    }
  }
  if (secondHive<30){//max of 50 bots in this hive
    //second hive spawning point, bottom left
    botX = 1500;
    botY = 4500;
    botLevel = Math.floor(Math.random() * 5000);
    if (botLevel<=400){
      secondHive++;
      dunebots[botID] = {
  	    x: botX,
      	y: botY,
      	name: "Mega-Bumper",
        width: 50,
        height: 50,
        color: "#B22222",
        outline: "#E9967A",
        score: 1000,
        health: 280,
        maxhealth: 280,
        damage: 0.1,
        speed: 30,
        hit: 0,
        movedInThisLoop: 0,
        specialty: "",
        attackers: {},
        botFovRange: 1000,
        homeX: botX,
        homeY: botY,
        hive: 2
      }
      botID++;
    }
    else if (botLevel>400&&botLevel<=500){
      secondHive++;
      dunebots[botID] = {
  	    x: botX,
      	y: botY,
      	name: "Spike",
        width: 50,
        height: 50,
        color: "#6495ED",
        outline: "#115FE6",
        score: 1200,
        health: 300,
        maxhealth: 300,
        damage: 5,
        speed: 8,
        hit: 0,
        movedInThisLoop: 0,
        specialty: "it hurts",
        attackers: {},
        botFovRange: 1000,
        homeX: botX,
        homeY: botY,
        hive: 2
      }
      botID++;
    }
  }
  if (thirdHive<20){//max of 50 bots in this hive
    //third hive spawning point, top right
    botX = 4500;
    botY = 1500;
    botLevel = Math.floor(Math.random() * 10000);
    if (botLevel<=200){
      thirdHive++;
      dunebots[botID] = {
  	    x: botX,
      	y: botY,
      	name: "Rogue",
        width: 75,
        height: 75,
        color: "#CC3399",
        outline: "#E699CC",
        score: 3000,
        health: 500,
        maxhealth: 500,
        damage: 0.3,
        speed: 12,
        hit: 0,
        movedInThisLoop: 0,
        specialty: "lifesteal",
        attackers: {},
        botFovRange: 1000,
        homeX: botX,
        homeY: botY,
        hive: 3
      }
      botID++;
    }
    else if (botLevel>200&&botLevel<=300){
      thirdHive++;
      dunebots[botID] = {
  	    x: botX,
      	y: botY,
      	name: "Shield",
        width: 125,
        height: 125,
        color: "#d1ae71",
        outline: "#e3d1b3",
        score: 6000,
        health: 2000,
        maxhealth: 2000,
        damage: 0.3,
        speed: 10,
        hit: 0,
        movedInThisLoop: 0,
        specialty: "bullet knockback",
        attackers: {},
        botFovRange: 1000,
        homeX: botX,
        homeY: botY,
        hive: 3
      }
      botID++;
    }
    else if (botLevel>300&&botLevel<=400){
      thirdHive++;
      //dont change name or else grower wont grow
      dunebots[botID] = {
  	    x: botX,
      	y: botY,
      	name: "Grower",
        width: 50,
        height: 50,
        color: "#9400D3",
        outline: "#62008B",
        score: 8500,
        health: 3000,
        maxhealth: 3000,
        damage: 0.1,
        speed: 10,
        hit: 0,
        movedInThisLoop: 0,
        specialty: "grows when it deals damage",
        attackers: {},
        botFovRange: 1000,
        homeX: botX,
        homeY: botY,
        hive: 3
      }
      botID++;
    }
    else if (botLevel>400&&botLevel<=450){
      thirdHive++;
      dunebots[botID] = {
  	    x: botX,
      	y: botY,
      	name: "Protector",
        width: 105,
        height: 105,
        color: "#D5CE67",
        outline: "#ABA552",
        score: 2500,
        health: 1000,
        maxhealth: 1000,
        damage: 0.25,
        speed: 13,
        hit: 0,
        movedInThisLoop: 0,
        specialty: "fast but low hp",
        attackers: {},
        botFovRange: 1000,
        homeX: botX,
        homeY: botY,
        hive: 3
      }
      botID++;
    }
  }
  if (fourthHive<5){//max of 5 bots in this hive
    //last hive spawning point, bottom right
    botX = 4500;
    botY = 4500;
    botLevel = Math.floor(Math.random() * 30000);
    if (botLevel==1){
      fourthHive++;
      io.emit('newNotification', "A boss spawned in the dune!", "brown");
      dunebots[botID] = {
  	    x: botX,
      	y: botY,
      	name: "Boss",
        width: 200,
        height: 200,
        color: "#86775F",
        outline: "#404040",
        score: 1000000,
        health: 80000,
        maxhealth: 80000,
        damage: 8,
        speed: 2,
        hit: 0,
        movedInThisLoop: 0,
        specialty: "rarely spawns",
        attackers: {},
        botFovRange: 1000,
        homeX: botX,
        homeY: botY,
        hive: 4
      }
      botID++;
    }
    else if (botLevel>1&&botLevel<=101){
      fourthHive++;
      dunebots[botID] = {
  	    x: botX,
      	y: botY,
      	name: "King",
        width: 120,
        height: 120,
        color: "#47048a",
        outline: "#830ff7",
        score: 10000,
        health: 20000,
        maxhealth: 20000,
        damage: 1,
        speed: 7,
        hit: 0,
        movedInThisLoop: 0,
        specialty: "high health",
        attackers: {},
        botFovRange: 1000,
        homeX: botX,
        homeY: botY,
        hive: 4
      }
      botID++;
    }
    else if (botLevel>101&&botLevel<=151){
      fourthHive++;
      dunebots[botID] = {
  	    x: botX,
      	y: botY,
      	name: "Titan",
        width: 155,
        height: 155,
        color: "#a03333",
        outline: "#791a1a",
        score: 50000,
        health: 80000,
        maxhealth: 80000,
        damage: 2.5,
        speed: 3,
        hit: 0,
        movedInThisLoop: 0,
        specialty: "superior health",
        attackers: {},
        botFovRange: 1000,
        homeX: botX,
        homeY: botY,
        hive: 4
      }
      botID++;
    }
    else if (botLevel>151&&botLevel<=200){
      fourthHive++;
      dunebots[botID] = {
  	    x: botX,
      	y: botY,
      	name: "Wall",
        width: 150,
        height: 150,
        color: "#3b2b20",
        outline: "#8a6950",
        score: 20000,
        health: 10000,
        maxhealth: 10000,
        damage: 3,
        speed: 4,
        hit: 0,
        movedInThisLoop: 0,
        specialty: "bullet knockback",
        attackers: {},
        botFovRange: 1000,
        homeX: botX,
        homeY: botY,
        hive: 4
      }
      botID++;
    }
  }
  if (rockHive<15){//max of 15 bots in this hive
    //rock spawning in middle of the map
    botLevel = Math.floor(Math.random() * 30000);
    if (botLevel<=300){
      rockHive++;
      //rock spawn range: 2000 to 4000
      const rockX = Math.floor(Math.random() * 2000) + 2000;
      const rockY = Math.floor(Math.random() * 2000) + 2000;
      dunebots[botID] = {
  	    x: rockX,
      	y: rockY,
      	name: "Rock",
        width: 100,
        height: 100,
        color: "#909090",
        outline: "#404040",
        score: 8500,
        health: 7500,
        maxhealth: 7500,
        damage: 1,
        speed: 0,
        hit: 0,
        movedInThisLoop: 0,
        specialty: "",
        attackers: {},
        botFovRange: 1000,
        homeX: rockX,
        homeY: rockY,
        hive: 5
      }
      botID++;
    }
  }
  //choose whether a portal will spawn in dune
  var choosingPortal = Math.floor(Math.random() * 500);
  if (choosingPortal==1){
    //spawn portal
    console.log("a portal to dune spawned!")
    const portalX = Math.floor(Math.random() * (duneGameSize - 50));//-50 so portal won't spawn near to side of arena
    const portalY = Math.floor(Math.random() * (duneGameSize - 50));
    duneportals[duneportalID] = {
  	  x: portalX,
    	y: portalY,
    	name: "portal",
      width: 100,
      height: 100,
      color: "white",
      outline: "black",//does not affect color of portal currently, in client code, it uses rgb value
      maxtimer: 1000,//starting number of timer, does not change, must be same value as timer when portal spawn
      timer: 1000//the higher the number, the longer the portal stays
    }
    duneportalID++;
  }
  //change angle of white portal
  enterDunePortal.angleDegrees++;
  if (enterDunePortal.angleDegrees>=360){
    enterDunePortal.angleDegrees=0;
  }
  //next, calculate leaderboard
  //sort the object list based on score, the const below contains the list of id of players on leaderboard
  //note: this const is an array, NOT an object, so cannot use Object.something
  const temporaryPlayerList = (Object.keys(duneplayers).sort(function(a, b){return duneplayers[b].score-duneplayers[a].score})).slice(0,10);
  //flip the a and b in the square brackets [] to get opposite order, e.g. ascending instead of descending order
  //.slice(0,10) gets the first ten players, it works even if there are less than 10 players
  const leaderboardplayers = {}
  //leaderboardplayers contain the players info
  temporaryPlayerList.forEach((id) => {
    //add player's name, score and color to list because only need this three in client code
      leaderboardplayers[id] = {
        name: duneplayers[id].name,
        color: duneplayers[id].color,
        score: duneplayers[id].score
      }
  })
  //send stuff to the players
  //NOTE: 1080 and 1920 refers to the canvas width and height
  Object.keys(duneplayers).forEach((playerId) => {
    var shakingYN = "no";
    const items = {}
    numberOfObj = 0;
    var thisPlayerIDinTheList = 0;
    //portals drawn first so they are below everything
    Object.keys(duneportals).forEach((portalID) => {
      var DistanceBetween = Math.sqrt( (duneplayers[playerId].x - duneportals[portalID].x)*(duneplayers[playerId].x - duneportals[portalID].x) + (duneplayers[playerId].y - duneportals[portalID].y)*(duneplayers[playerId].y - duneportals[portalID].y) );//calculate distance between center of players
      if (DistanceBetween<=(duneplayers[playerId].width+duneportals[portalID].width)){
        shakingYN = "yes"
      }
      if (((duneportals[portalID].y>=duneplayers[playerId].y && (duneportals[portalID].y-duneplayers[playerId].y-duneportals[portalID].width)<=1080/2*duneplayers[playerId].fovMultiplier) || (duneportals[portalID].y<=duneplayers[playerId].y && (duneplayers[playerId].y-duneportals[portalID].y-duneportals[portalID].width)<=1080/2*duneplayers[playerId].fovMultiplier)) && ((duneportals[portalID].x>=duneplayers[playerId].x && (duneportals[portalID].x-duneplayers[playerId].x-duneportals[portalID].width)<=1920/2*duneplayers[playerId].fovMultiplier) || (duneportals[portalID].x<=duneplayers[playerId].x && (duneplayers[playerId].x-duneportals[portalID].x-duneportals[portalID].width)<=1920/2*duneplayers[playerId].fovMultiplier))){
        //check if shape is visible on screen
        numberOfObj++;
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        items[numberOfObj] = {...duneportals[portalID]};
        items[numberOfObj].type = "portal";
    }
  })
  //the white portal at the top left corner of dune
    if (((enterDunePortal.y>=duneplayers[playerId].y && (enterDunePortal.y-duneplayers[playerId].y-enterDunePortal.width)<=1080/2*duneplayers[playerId].fovMultiplier) || (enterDunePortal.y<=duneplayers[playerId].y && (duneplayers[playerId].y-enterDunePortal.y-enterDunePortal.width)<=1080/2*duneplayers[playerId].fovMultiplier)) && ((enterDunePortal.x>=duneplayers[playerId].x && (enterDunePortal.x-duneplayers[playerId].x-enterDunePortal.width)<=1920/2*duneplayers[playerId].fovMultiplier) || (enterDunePortal.x<=duneplayers[playerId].x && (duneplayers[playerId].x-enterDunePortal.x-enterDunePortal.width)<=1920/2*duneplayers[playerId].fovMultiplier))){
        //check if shape is visible on screen
        numberOfObj++;
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        items[numberOfObj] = {...enterDunePortal};
        items[numberOfObj].type = "Fixedportal";
    }
    //bots
    Object.keys(dunebots).forEach((botID) => {
      if (((dunebots[botID].y>=duneplayers[playerId].y && (dunebots[botID].y-duneplayers[playerId].y-dunebots[botID].width)<=1080/2*duneplayers[playerId].fovMultiplier) || (dunebots[botID].y<=duneplayers[playerId].y && (duneplayers[playerId].y-dunebots[botID].y-dunebots[botID].width)<=1080/2*duneplayers[playerId].fovMultiplier)) && ((dunebots[botID].x>=duneplayers[playerId].x && (dunebots[botID].x-duneplayers[playerId].x-dunebots[botID].width)<=1920/2*duneplayers[playerId].fovMultiplier) || (dunebots[botID].x<=duneplayers[playerId].x && (duneplayers[playerId].x-dunebots[botID].x-dunebots[botID].width)<=1920/2*duneplayers[playerId].fovMultiplier))){
        //check if shape is visible on screen
        numberOfObj++;
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        items[numberOfObj] = {...dunebots[botID]};
        items[numberOfObj].type = "bot";
        Object.keys(items[numberOfObj]).forEach((property) => {
        if (property!="type" && property!="hit" && property!="x" && property!="y" && property!="width" && property!="color" && property!="outline" && property!="health" && property!="maxhealth" && property!="specialty" && property!="name"){//the above are all the properties needed in client code
          delete items[numberOfObj][property]
        }
      })
    }
  })
    //bullets drawn next so that they are above shapes but below player
    Object.keys(dunebullets).forEach((bulletID) => {
      if (((dunebullets[bulletID].y>=duneplayers[playerId].y && (dunebullets[bulletID].y-duneplayers[playerId].y-dunebullets[bulletID].width)<=1080/2*duneplayers[playerId].fovMultiplier) || (dunebullets[bulletID].y<=duneplayers[playerId].y && (duneplayers[playerId].y-dunebullets[bulletID].y-dunebullets[bulletID].width)<=1080/2*duneplayers[playerId].fovMultiplier)) && ((dunebullets[bulletID].x>=duneplayers[playerId].x && (dunebullets[bulletID].x-duneplayers[playerId].x-dunebullets[bulletID].width)<=1920/2*duneplayers[playerId].fovMultiplier) || (dunebullets[bulletID].x<=duneplayers[playerId].x && (duneplayers[playerId].x-dunebullets[bulletID].x-dunebullets[bulletID].width)<=1920/2*duneplayers[playerId].fovMultiplier))){
        //check if shape is visible on screen
        numberOfObj++;
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        items[numberOfObj] = {...dunebullets[bulletID]};
        items[numberOfObj].type = "bullet";
        if (items[numberOfObj].ownerId==playerId){//if bullet belongs to this player
          items[numberOfObj].ownsIt = "yes";
        }
        Object.keys(items[numberOfObj]).forEach((property) => {
        if (property!="passive" && property!="type" && property!="ownsIt" && property!="hit" && property!="color" && property!="outline" && property!="bulletType" && property!="x" && property!="y" && property!="width"){//the above are all the properties needed in client code
          delete items[numberOfObj][property]
        }
      })
    }
    })
    //player drawn last so that they are above shapes and bullets
    Object.keys(duneplayers).forEach((playerID) => {
      if (((duneplayers[playerID].y>=duneplayers[playerId].y && (duneplayers[playerID].y-duneplayers[playerId].y-duneplayers[playerID].width)<=1080/2*duneplayers[playerId].fovMultiplier) || (duneplayers[playerID].y<=duneplayers[playerId].y && (duneplayers[playerId].y-duneplayers[playerID].y-duneplayers[playerID].width)<=1080/2*duneplayers[playerId].fovMultiplier)) && ((duneplayers[playerID].x>=duneplayers[playerId].x && (duneplayers[playerID].x-duneplayers[playerId].x-duneplayers[playerID].width)<=1920/2*duneplayers[playerId].fovMultiplier) || (duneplayers[playerID].x<=duneplayers[playerId].x && (duneplayers[playerId].x-duneplayers[playerID].x-duneplayers[playerID].width)<=1920/2*duneplayers[playerId].fovMultiplier)) || playerID == playerId){
        //check if player is visible on screen or player is current player
        numberOfObj++;
        if (playerID==playerId){
          //if this is the player that the server is sending to
          thisPlayerIDinTheList = numberOfObj;
        }
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        items[numberOfObj] = {...duneplayers[playerID]};
        items[numberOfObj].type = "player";
        Object.keys(items[numberOfObj]).forEach((property) => {
        if (property!="assets" && property!="barrelHeightChange" && property!="developer" && property!="chats" && property!="type" && property!="x" && property!="y" && property!="angle" && property!="tankType" && property!="width" && property!="height" && property!="barrels" && property!="barrelColor" && property!="barrelOutline" && property!="hit" && property!="color" && property!="outline" && property!="name" && property!="level" && property!="health" && property!="maxhealth" && property!="fovMultiplier" && (playerID!=playerId || (property!="score" && property!="tankTypeLevel"))){//the above are all the properties needed in client code
          delete items[numberOfObj][property]
        }
      })
    }
    })
    //change object lists to strings to reduce bandwidth. remember to parse these strings back into objects in the client code
    const itemlist = JSON.stringify(items);
    const newportallist = JSON.stringify(duneportals);
    const newleaderboard = JSON.stringify(leaderboardplayers);  
    io.to(playerId).emit('gameStateUpdate', duneGameSize, itemlist, duration, thisPlayerIDinTheList, Object.keys(duneplayers).length, Object.keys(dunebots).length, newportallist, "dune", shakingYN, newleaderboard, deadDuneObjects);//send stuff to specific player
    //this is only sent to players in the players list, so that players who disconnected, died, or in home page will not receive this
  })
}

function gameCavernLoop() {
  //this gameloop function keep running in the server if there are people
  //this game loop is for CAVERN

  //reset all objects' hit value
  //purpose of hit value is to tell client whether object hit or not so it will flash the object, everytime a object is hit, it's hit value increases
  Object.keys(cavernshapes).forEach((id) => {
    cavernshapes[id].hit=0;
  })
  Object.keys(cavernplayers).forEach((id) => {
    cavernplayers[id].hit=0;
  })
  Object.keys(cavernbullets).forEach((id) => {
    cavernbullets[id].hit=0;
  })
  
  //for quadtree
  cavernbulletTree.clear();
      Object.keys(cavernbullets).forEach((id) => {
        cavernbulletTree.insert({
            x: cavernbullets[id].x,
            y: cavernbullets[id].y,
            width: cavernbullets[id].width,
            height: cavernbullets[id].width,
            id: id
        });
      })
  cavernshapeTree.clear();
      Object.keys(cavernshapes).forEach((id) => {
        cavernshapeTree.insert({
            x: cavernshapes[id].x,
            y: cavernshapes[id].y,
            width: cavernshapes[id].width,
            height: cavernshapes[id].width,
            id: id
        });
      })
  cavernplayerTree.clear();
      Object.keys(cavernplayers).forEach((id) => {
        cavernplayerTree.insert({
            x: cavernplayers[id].x,
            y: cavernplayers[id].y,
            width: cavernplayers[id].width,
            height: cavernplayers[id].width,
            id: id
        });
      })
  deadCavernObjects = [];//clear list of dead objects
	//1.move player, shoot, update level, regenerate health, check player collision
  Object.keys(cavernplayers).forEach((playerId) => {
    checkIfNewWorldRecord(cavernplayers[playerId])//check if player beat world record
    chatRemovalAfterSomeTime(cavernplayers,playerId)//remove old chat messages
    barrelAnimationForShooting(cavernplayers,playerId)//calculate barrel height for animation when shooting
    movePlayer(cavernplayers[playerId], playerId, "yes", "yes", "no", cavernSize, cavernshapes, cavernplayers, "nothing")
    spawnBullets(playerId,cavernplayers,cavernbullets)
    playerLevel(cavernplayers[playerId])
    healthRegenerate(playerId,cavernplayers)
    playerCollide(playerId,cavernplayers,"cavern")
    playerCollideShape(playerId, cavernplayers, cavernshapes,"cavern")
    playerCollidePortal(playerId, cavernplayers, players, arenaportals, "random", "random", gameSize,"cavern")
  })
  //2.move the shapes, check collision with border and other shapes, change radiant color
  Object.keys(cavernshapes).forEach((shapeId) => {
    radiantShapes(cavernshapes,shapeId)
    moveShape(shapeId,cavernshapes,cavernSize,"cavern")
  })
  //3.move the bullets, check for collision with shapes, borders, players, and other bullets, and remove shapes and players if no more health
  Object.keys(cavernbullets).forEach((bulletId) => {
      moveBullet(cavernbullets, bulletId, "yes", "yes", "yes", "no", cavernSize, cavernplayers, cavernshapes, "cavern")
  })
  //4. remove portal after it exist for a certain amount of time
  Object.keys(arenaportals).forEach((portalId) => {
    removePortal(portalId,arenaportals,"cavern")
  })  
  //6.choose whether a shape will spawn or not
  if (Object.keys(cavernshapes).length<50){
    var choosing = Math.floor(Math.random() * 1000);//only choose if shape will spawn if the number of shapes is less than 50
  }
  else{
    var choosing = 0;
  }
  if (choosing>=1&&choosing<=300){//30% chance of spawning (300/1000)
    //spawn a radiant square
    const shapeX = Math.floor(Math.random() * cavernSize);
    const shapeY = Math.floor(Math.random() * cavernSize);
    const startAngle = Math.floor(Math.random() * 11)/10;//get angle range from 0.0 to 1.0
    cavernshapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 1,
      maxhealth: 1,
      damage: 0.05,//for shapes colliding with players, not bullets
    	name: "radiant square",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 25,
      height: 25,
      score: 30,
      sides: 4,
      hit: 0,
      attackers: {},
      weight: 0//range between 0 and 1
    }
    shapeID++;
  }
    else if (choosing>=301&&choosing<=500){//20% chance of spawning (200/1000 or 1/5)
    //spawn a radiant triangle
    const shapeX = Math.floor(Math.random() * cavernSize);
    const shapeY = Math.floor(Math.random() * cavernSize);
    const startAngle = Math.floor(Math.random() * 11)/10;//get angle range from 0.0 to 1.0
    cavernshapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 5,
      maxhealth: 5,
      damage: 0.1,
    	name: "radiant triangle",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 40,
      height: 40,
      score: 150,
      sides: 3,
      hit: 0,
      attackers: {},
      weight: 0.2//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=501&&choosing<=700){//20% chance of spawning (200/1000 or 1/5)
    //spawn a radiant pentagon
    const shapeX = Math.floor(Math.random() * cavernSize);
    const shapeY = Math.floor(Math.random() * cavernSize);
    const startAngle = Math.floor(Math.random() * 11)/10;//get angle range from 0.0 to 1.0
    cavernshapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 25,
      maxhealth: 25,
      damage: 0.2,
    	name: "radiant pentagon",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 60,
      height: 60,
      score: 750,
      sides: 5,
      hit: 0,
      attackers: {},
      weight: 0.3//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=701&&choosing<=840){//14% chance of spawning (140/1000)
    //spawn a radiant hexagon
    const shapeX = Math.floor(Math.random() * cavernSize);
    const shapeY = Math.floor(Math.random() * cavernSize);
    const startAngle = Math.floor(Math.random() * 11)/10;//get angle range from 0.0 to 1.0
    cavernshapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 125,
      maxhealth: 125,
      damage: 0.4,
    	name: "radiant hexagon",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 80,
      height: 80,
      score: 3750,
      sides: 6,
      hit: 0,
      attackers: {},
      weight: 0.5//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=841&&choosing<=920){//8% chance of spawning (80/1000)
    //spawn a radiant heptagon
    const shapeX = Math.floor(Math.random() * cavernSize);
    const shapeY = Math.floor(Math.random() * cavernSize);
    const startAngle = Math.floor(Math.random() * 11)/10;//get angle range from 0.0 to 1.0
    cavernshapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 625,
      maxhealth: 625,
      damage: 0.8,
    	name: "radiant heptagon",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 100,
      height: 100,
      score: 18750,
      sides: 7,
      hit: 0,
      attackers: {},
      weight: 0.7//range between 0 and 1
    }
    shapeID++;
  }
    else if (choosing>=921&&choosing<=970){//5% chance of spawning (50/1000)
    //spawn a radiant octagon
    const shapeX = Math.floor(Math.random() * cavernSize);
    const shapeY = Math.floor(Math.random() * cavernSize);
    const startAngle = Math.floor(Math.random() * 11)/10;//get angle range from 0.0 to 1.0
    cavernshapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 3125,
      maxhealth: 3125,
      damage: 1,
    	name: "radiant octagon",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 120,
      height: 120,
      score: 93750,
      sides: 8,
      hit: 0,
      attackers: {},
      weight: 0.9//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing>=971&&choosing<=990){//2% chance of spawning (20/1000)
    //spawn a radiant nonagon
    const shapeX = Math.floor(Math.random() * cavernSize);
    const shapeY = Math.floor(Math.random() * cavernSize);
    const startAngle = Math.floor(Math.random() * 11)/10;//get angle range from 0.0 to 1.0
    cavernshapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 15625,
      maxhealth: 15625,
      damage: 1,
    	name: "radiant nonagon",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 120,
      height: 120,
      score: 468750,
      sides: 9,
      hit: 0,
      attackers: {},
      weight: 1//range between 0 and 1
    }
    shapeID++;
  }

  else if (choosing>=991&&choosing<=998){//0.7% chance of spawning (7/1000)
    //spawn a radiant decagon
    const shapeX = Math.floor(Math.random() * cavernSize);
    const shapeY = Math.floor(Math.random() * cavernSize);
    const startAngle = Math.floor(Math.random() * 11)/10;//get angle range from 0.0 to 1.0
    cavernshapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 156250,
      maxhealth: 156250,
      damage: 1,
    	name: "radiant decagon",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 170,
      height: 170,
      color: "orange",
      outline: "black",
      score: 2343750,
      sides: 10,
      hit: 0,
      attackers: {},
      weight: 1//range between 0 and 1
    }
    shapeID++;
  }
  else if (choosing==999){//0.1% chance of spawning (1/1000)
    //spawn a radiant decagon
    io.emit('newNotification', "A radiant hendecagon has spawned in cavern!", "gold");
    const shapeX = Math.floor(Math.random() * cavernSize);
    const shapeY = Math.floor(Math.random() * cavernSize);
    const startAngle = Math.floor(Math.random() * 11)/10;//get angle range from 0.0 to 1.0
    cavernshapes[shapeID] = {
  	  x: shapeX,//current poisition of shape
    	y: shapeY,
      centerOfRotationX: shapeX,//shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0,//actual rotation of the shape
    	health: 781250,
      maxhealth: 781250,
      damage: 1,
    	name: "radiant hendecagon",
      rgbstate: 0,
      red: 255,
      blue: 0,
      green: 0,
      width: 240,
      height: 240,
      color: "orange",
      outline: "black",
      score: 11718750,
      sides: 11,
      hit: 0,
      attackers: {},
      weight: 1//range between 0 and 1
    }
    shapeID++;
  }
  //7.choose whether a portal will spawn or not
  var choosingPortal = Math.floor(Math.random() * 300);
  if (choosingPortal==1){
    //spawn portal
    console.log("a arena portal spawned!")
    const portalX = Math.floor(Math.random() * (cavernSize - 100))+50;//-100 then +50 so that portals wont spawn at 50px near sides of arena
    const portalY = Math.floor(Math.random() * (cavernSize - 100))+50;
    arenaportals[portalID] = {
  	  x: portalX,
    	y: portalY,
    	name: "arena portal",
      width: 100,
      color: "white",
      maxtimer: 1000,//starting number of timer, does not change, must be same value as timer when portal spawn
      timer: 1000//the higher the number, the longer the portal stays
    }
    portalID++;
  }
  //next, calculate leaderboard
  //sort the object list based on score, the const below contains the list of id of players on leaderboard
  //note: this const is an array, NOT an object, so cannot use Object.something
  const temporaryPlayerList = (Object.keys(cavernplayers).sort(function(a, b){return cavernplayers[b].score-cavernplayers[a].score})).slice(0,10);
  //flip the a and b in the square brackets [] to get opposite order, e.g. ascending instead of descending order
  //.slice(0,10) gets the first ten players, it works even if there are less than 10 players
  const leaderboardplayers = {}
  //leaderboardplayers contain the players info
  temporaryPlayerList.forEach((id) => {
    //add player's name, score and color to list because only need this three in client code
      leaderboardplayers[id] = {
        name: cavernplayers[id].name,
        color: cavernplayers[id].color,
        score: cavernplayers[id].score
      }
  })
  //8.send stuff to the players. To edit the stuff you want to send to the players below, simply go to the client code and edit the variables in the function in gameStateUpdate
  //we must check each item in the game to see if it is visible on a 1080x1920 canvas for each player, and only send the things that are supposed to be visible, preventing field of vision hacking
  //NOTE: 1080 and 1920 refers to the canvas width and height
  Object.keys(cavernplayers).forEach((playerId) => {
    var shakingYN = "no";
    const items = {}
    numberOfObj = 0;
    var thisPlayerIDinTheList = 0;
    //portals drawn first so they are below everything
    Object.keys(arenaportals).forEach((portalID) => {
      //check for collision with portal, then tell client whether to shake canvas or not
      var DistanceBetween = Math.sqrt( (cavernplayers[playerId].x - arenaportals[portalID].x)*(cavernplayers[playerId].x - arenaportals[portalID].x) + (cavernplayers[playerId].y - arenaportals[portalID].y)*(cavernplayers[playerId].y - arenaportals[portalID].y) );//calculate distance between center of players
      if (DistanceBetween<=(cavernplayers[playerId].width+arenaportals[portalID].width)){
        shakingYN = "yes"
      }
      
      if (((arenaportals[portalID].y>=cavernplayers[playerId].y && (arenaportals[portalID].y-cavernplayers[playerId].y-arenaportals[portalID].width)<=1080/2*cavernplayers[playerId].fovMultiplier) || (arenaportals[portalID].y<=cavernplayers[playerId].y && (cavernplayers[playerId].y-arenaportals[portalID].y-arenaportals[portalID].width)<=1080/2*cavernplayers[playerId].fovMultiplier)) && ((arenaportals[portalID].x>=cavernplayers[playerId].x && (arenaportals[portalID].x-cavernplayers[playerId].x-arenaportals[portalID].width)<=1920/2*cavernplayers[playerId].fovMultiplier) || (arenaportals[portalID].x<=cavernplayers[playerId].x && (cavernplayers[playerId].x-arenaportals[portalID].x-arenaportals[portalID].width)<=1920/2*cavernplayers[playerId].fovMultiplier))){
        //check if portal is visible on screen
        numberOfObj++;
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        items[numberOfObj] = {...arenaportals[portalID]};
        items[numberOfObj].type = "portal";
      }
    })
    //shapes are next so that players and bullets are drawn above it and above portal
    Object.keys(cavernshapes).forEach((shapeID) => {
      if (((cavernshapes[shapeID].y>=cavernplayers[playerId].y && (cavernshapes[shapeID].y-cavernplayers[playerId].y-cavernshapes[shapeID].width)<=1080/2*cavernplayers[playerId].fovMultiplier) || (cavernshapes[shapeID].y<=cavernplayers[playerId].y && (cavernplayers[playerId].y-cavernshapes[shapeID].y-cavernshapes[shapeID].width)<=1080/2*cavernplayers[playerId].fovMultiplier)) && ((cavernshapes[shapeID].x>=cavernplayers[playerId].x && (cavernshapes[shapeID].x-cavernplayers[playerId].x-cavernshapes[shapeID].width)<=1920/2*cavernplayers[playerId].fovMultiplier) || (cavernshapes[shapeID].x<=cavernplayers[playerId].x && (cavernplayers[playerId].x-cavernshapes[shapeID].x-cavernshapes[shapeID].width)<=1920/2*cavernplayers[playerId].fovMultiplier))){
        //check if shape is visible on screen
        numberOfObj++;
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        items[numberOfObj] = {...cavernshapes[shapeID]};
        items[numberOfObj].type = "shape";
        Object.keys(items[numberOfObj]).forEach((property) => {
          if (property!="name" && property!="angle" && property!="type" && property!="hit" && property!="red" && property!="green" && property!="blue" && property!="x" && property!="y" && property!="sides" && property!="width" && property!="color" && property!="outline" && property!="health" && property!="maxhealth"){//the above are all the properties needed in client code
            delete items[numberOfObj][property]
          }
        })
      }
    })
    //bullets drawn next so that they are above shapes but below player
    Object.keys(cavernbullets).forEach((bulletID) => {
      if (((cavernbullets[bulletID].y>=cavernplayers[playerId].y && (cavernbullets[bulletID].y-cavernplayers[playerId].y-cavernbullets[bulletID].width)<=1080/2*cavernplayers[playerId].fovMultiplier) || (cavernbullets[bulletID].y<=cavernplayers[playerId].y && (cavernplayers[playerId].y-cavernbullets[bulletID].y-cavernbullets[bulletID].width)<=1080/2*cavernplayers[playerId].fovMultiplier)) && ((cavernbullets[bulletID].x>=cavernplayers[playerId].x && (cavernbullets[bulletID].x-cavernplayers[playerId].x-cavernbullets[bulletID].width)<=1920/2*cavernplayers[playerId].fovMultiplier) || (cavernbullets[bulletID].x<=cavernplayers[playerId].x && (cavernplayers[playerId].x-cavernbullets[bulletID].x-cavernbullets[bulletID].width)<=1920/2*cavernplayers[playerId].fovMultiplier))){
        //check if bullet is visible on screen
        numberOfObj++;
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        items[numberOfObj] = {...cavernbullets[bulletID]};
        items[numberOfObj].type = "bullet";
        if (items[numberOfObj].ownerId==playerId){//if bullet belongs to this player
          items[numberOfObj].ownsIt = "yes";
        }
        Object.keys(items[numberOfObj]).forEach((property) => {
          if (property!="passive" && property!="type" && property!="ownsIt" && property!="hit" && property!="color" && property!="outline" && property!="bulletType" && property!="x" && property!="y" && property!="width"){//the above are all the properties needed in client code
            delete items[numberOfObj][property]
          }
        })
      }
    })
    //player drawn last so that they are above shapes and bullets
    Object.keys(cavernplayers).forEach((playerID) => {
      if (((cavernplayers[playerID].y>=cavernplayers[playerId].y && (cavernplayers[playerID].y-cavernplayers[playerId].y-cavernplayers[playerID].width)<=1080/2*cavernplayers[playerId].fovMultiplier) || (cavernplayers[playerID].y<=cavernplayers[playerId].y && (cavernplayers[playerId].y-cavernplayers[playerID].y-cavernplayers[playerID].width)<=1080/2*cavernplayers[playerId].fovMultiplier)) && ((cavernplayers[playerID].x>=cavernplayers[playerId].x && (cavernplayers[playerID].x-cavernplayers[playerId].x-cavernplayers[playerID].width)<=1920/2*cavernplayers[playerId].fovMultiplier) || (cavernplayers[playerID].x<=cavernplayers[playerId].x && (cavernplayers[playerId].x-cavernplayers[playerID].x-cavernplayers[playerID].width)<=1920/2*cavernplayers[playerId].fovMultiplier)) || playerID == playerId){
        //check if bullet is visible on screen or if player is the player that this is sending to
        numberOfObj++;
        if (playerID==playerId){
          //if this is the player that the server is sending to
          thisPlayerIDinTheList = numberOfObj;
        }
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        items[numberOfObj] = {...cavernplayers[playerID]};
        items[numberOfObj].type = "player";
        Object.keys(items[numberOfObj]).forEach((property) => {
          if (property!="assets" && property!="barrelHeightChange" && property!="developer" && property!="chats" && property!="type" && property!="x" && property!="y" && property!="angle" && property!="tankType" && property!="width" && property!="height" && property!="barrels" && property!="barrelColor" && property!="barrelOutline" && property!="hit" && property!="color" && property!="outline" && property!="name" && property!="level" && property!="health" && property!="maxhealth" && property!="fovMultiplier" && (playerID!=playerId || (property!="score" && property!="tankTypeLevel"))){//the above are all the properties needed in client code
            delete items[numberOfObj][property]
          }
        })
      }
    })
    //change object lists to strings to reduce bandwidth. remember to parse these strings back into objects in the client code
    const itemlist = JSON.stringify(items);
    const newportallist = JSON.stringify(arenaportals);
    const newleaderboard = JSON.stringify(leaderboardplayers); 
    io.to(playerId).emit('gameStateUpdate', cavernSize, itemlist, duration, thisPlayerIDinTheList, Object.keys(cavernplayers).length, Object.keys(cavernshapes).length, newportallist, "cavern", shakingYN, newleaderboard, deadCavernObjects);//send stuff to specific player
    //this is only sent to players in the players list, so that players who disconnected, died, or in home page will not receive this
  })
}//end of cavern loop function

//when user connect
io.on('connection', function(socket){
console.log('User connected: ', socket.id)

  //the code below is to send the player's id to the player, note that if a new player enters the game, his id is sent to all the players in the game
  io.to(socket.id).emit('connectWithPlayer',socket.id);
  
  //everything below set socket listeners: these are stuff that allow client to send things to server
  socket.on('disconnect', function() {
    //remove player when disconnect
    console.log("A user disconnected.")
    if (players.hasOwnProperty(socket.id)){//check if client exists in arena
      delete players[socket.id]
    }
  	else if (duneplayers.hasOwnProperty(socket.id)){//check if client exists in dune
      delete duneplayers[socket.id]
    }
    else if (cavernplayers.hasOwnProperty(socket.id)){//check if client exists in dune
      delete cavernplayers[socket.id]
    }
  })

  socket.on('up', function(){
    if (players.hasOwnProperty(socket.id)){//check if client exists in game, must check because client can send this function even when havent joined game as it has id
      players[socket.id].amountAddWhenMoveY = -players[socket.id].speed;
    }
    else if (duneplayers.hasOwnProperty(socket.id)){//check if client exists in game, must check because client can send this function even when havent joined game as it has id
      duneplayers[socket.id].amountAddWhenMoveY = -duneplayers[socket.id].speed;
    }
    else if (cavernplayers.hasOwnProperty(socket.id)){//check if client exists in game, must check because client can send this function even when havent joined game as it has id
      cavernplayers[socket.id].amountAddWhenMoveY = -cavernplayers[socket.id].speed;
    }
  });

  socket.on('down', function() {
    if (players.hasOwnProperty(socket.id)){
      players[socket.id].amountAddWhenMoveY = players[socket.id].speed;
    }
    else if (duneplayers.hasOwnProperty(socket.id)){
      duneplayers[socket.id].amountAddWhenMoveY = duneplayers[socket.id].speed;
    }
    else if (cavernplayers.hasOwnProperty(socket.id)){
      cavernplayers[socket.id].amountAddWhenMoveY = cavernplayers[socket.id].speed;
    }
  })

  socket.on('left', function(){
    if (players.hasOwnProperty(socket.id)){
      players[socket.id].amountAddWhenMoveX = -players[socket.id].speed;
    }
    else if (duneplayers.hasOwnProperty(socket.id)){
      duneplayers[socket.id].amountAddWhenMoveX = -duneplayers[socket.id].speed;
    }
    else if (cavernplayers.hasOwnProperty(socket.id)){
      cavernplayers[socket.id].amountAddWhenMoveX = -cavernplayers[socket.id].speed;
    }
  });

  socket.on('right', function() {
    if (players.hasOwnProperty(socket.id)){
      players[socket.id].amountAddWhenMoveX = players[socket.id].speed;
    }
    else if (duneplayers.hasOwnProperty(socket.id)){
      duneplayers[socket.id].amountAddWhenMoveX = duneplayers[socket.id].speed;
    }
    else if (cavernplayers.hasOwnProperty(socket.id)){
      cavernplayers[socket.id].amountAddWhenMoveX = cavernplayers[socket.id].speed;
    }
  })
  
  socket.on('upRelease', function(){
    if (players.hasOwnProperty(socket.id)){
      if (players[socket.id].amountAddWhenMoveY == -players[socket.id].speed){
        players[socket.id].amountAddWhenMoveY+=players[socket.id].speed
      }
    }
    else if (duneplayers.hasOwnProperty(socket.id)){
      if (duneplayers[socket.id].amountAddWhenMoveY == -duneplayers[socket.id].speed){
        duneplayers[socket.id].amountAddWhenMoveY+=duneplayers[socket.id].speed
      }
    }
    else if (cavernplayers.hasOwnProperty(socket.id)){
      if (cavernplayers[socket.id].amountAddWhenMoveY == -cavernplayers[socket.id].speed){
        cavernplayers[socket.id].amountAddWhenMoveY+=cavernplayers[socket.id].speed
      }
    }
  });

  socket.on('downRelease', function() {
    if (players.hasOwnProperty(socket.id)){
      if (players[socket.id].amountAddWhenMoveY == players[socket.id].speed){
        players[socket.id].amountAddWhenMoveY-=players[socket.id].speed
      }
    }
    else if (duneplayers.hasOwnProperty(socket.id)){
      if (duneplayers[socket.id].amountAddWhenMoveY == duneplayers[socket.id].speed){
        duneplayers[socket.id].amountAddWhenMoveY-=duneplayers[socket.id].speed
      }
    }
    else if (cavernplayers.hasOwnProperty(socket.id)){
      if (cavernplayers[socket.id].amountAddWhenMoveY == cavernplayers[socket.id].speed){
        cavernplayers[socket.id].amountAddWhenMoveY-=cavernplayers[socket.id].speed
      }
    }
  })

  socket.on('leftRelease', function(){
    if (players.hasOwnProperty(socket.id)){
      if (players[socket.id].amountAddWhenMoveX == -players[socket.id].speed){
        players[socket.id].amountAddWhenMoveX+=players[socket.id].speed
      }
    }
    else if (duneplayers.hasOwnProperty(socket.id)){
      if (duneplayers[socket.id].amountAddWhenMoveX == -duneplayers[socket.id].speed){
        duneplayers[socket.id].amountAddWhenMoveX+=duneplayers[socket.id].speed
      }
    }
    else if (cavernplayers.hasOwnProperty(socket.id)){
      if (cavernplayers[socket.id].amountAddWhenMoveX == -cavernplayers[socket.id].speed){
        cavernplayers[socket.id].amountAddWhenMoveX+=cavernplayers[socket.id].speed
      }
    }
  });

  socket.on('rightRelease', function() {
    if (players.hasOwnProperty(socket.id)){
      if (players[socket.id].amountAddWhenMoveX == players[socket.id].speed){
        players[socket.id].amountAddWhenMoveX-=players[socket.id].speed
      }
    }
    else if (duneplayers.hasOwnProperty(socket.id)){
      if (duneplayers[socket.id].amountAddWhenMoveX == duneplayers[socket.id].speed){
        duneplayers[socket.id].amountAddWhenMoveX-=duneplayers[socket.id].speed
      }
    }
    else if (cavernplayers.hasOwnProperty(socket.id)){
      if (cavernplayers[socket.id].amountAddWhenMoveX == cavernplayers[socket.id].speed){
        cavernplayers[socket.id].amountAddWhenMoveX-=cavernplayers[socket.id].speed
      }
    }
  })
  
  socket.on('changelog', function() {
    //retrieve changelog from text file and send to client
    console.log('Received a changelog retrieve request from ', socket.id)
    const fs = require('fs');
    balance = fs.readFileSync("changelog.txt").toString();
    io.to(socket.id).emit('receiveChangelog', balance);
  })
  socket.on('wr', function() {
    //if client request for world record information
    io.to(socket.id).emit('receiveWR', worldrecord);
  })

  socket.on('mouseMoved', function(x,y,angle) {
    //retrieve angle of mouse from tank from client
    //if player exists in game and player is not tank with AI, e.g. mono
    if (players.hasOwnProperty(socket.id)&&players[socket.id].haveAI != "yes"){
      var rotateAngle =  ((angle * 180 / Math.PI) - 90) * Math.PI / 180
      //change radians to degree, minus 90 degrees, change back to radians
      //must add 90 degress to change axis
      if (players[socket.id].autorotate == "no" && players[socket.id].fastautorotate == "no"){//if auto-rotate off
        players[socket.id].angle=rotateAngle;
      }
      if (players[socket.id].hasOwnProperty('mousex') && players[socket.id].hasOwnProperty('mousey')){
        //needed for calculating drone movement angle
        players[socket.id].mousex = x;
        players[socket.id].mousey = y;
      }
    }
    else if (duneplayers.hasOwnProperty(socket.id)&&duneplayers[socket.id].haveAI != "yes"){
      var rotateAngle =  ((angle * 180 / Math.PI) - 90) * Math.PI / 180
      if (duneplayers[socket.id].autorotate == "no" && duneplayers[socket.id].fastautorotate == "no"){//if auto-rotate off
        duneplayers[socket.id].angle=rotateAngle;
      }
      if (duneplayers[socket.id].hasOwnProperty('mousex') && duneplayers[socket.id].hasOwnProperty('mousey')){
        duneplayers[socket.id].mousex = x;
        duneplayers[socket.id].mousey = y;
      }
    }
    else if (cavernplayers.hasOwnProperty(socket.id)&&cavernplayers[socket.id].haveAI != "yes"){
      var rotateAngle =  ((angle * 180 / Math.PI) - 90) * Math.PI / 180
      if (cavernplayers[socket.id].autorotate == "no" && cavernplayers[socket.id].fastautorotate == "no"){//if auto-rotate off
        cavernplayers[socket.id].angle=rotateAngle;
      }
      if (cavernplayers[socket.id].hasOwnProperty('mousex') && cavernplayers[socket.id].hasOwnProperty('mousey')){
        cavernplayers[socket.id].mousex = x;
        cavernplayers[socket.id].mousey = y;
      }
    }
  })
  
  socket.on('mousePressed', function() {
    //client tell server that user pressed mouse
    if (players.hasOwnProperty(socket.id)&&players[socket.id].haveAI != "yes"){
      players[socket.id].shooting="yes";
    }
    else if (duneplayers.hasOwnProperty(socket.id) && duneplayers[socket.id].haveAI != "yes"){
      duneplayers[socket.id].shooting="yes";
    }
    else if (cavernplayers.hasOwnProperty(socket.id) && cavernplayers[socket.id].haveAI != "yes"){
      cavernplayers[socket.id].shooting="yes";
    }
  })
  
  socket.on('mouseReleased', function() {
    //client tell server that user released mouse
    if (players.hasOwnProperty(socket.id)&&players[socket.id].haveAI != "yes"){
      players[socket.id].shooting="no";
    }
    else if (duneplayers.hasOwnProperty(socket.id) && duneplayers[socket.id].haveAI != "yes"){
      duneplayers[socket.id].shooting="no";
    }
    else if (cavernplayers.hasOwnProperty(socket.id) && cavernplayers[socket.id].haveAI != "yes"){
      cavernplayers[socket.id].shooting="no";
    }
  })

  socket.on('auto-fire', function() {
    //client press 'e' to turn on/off auto-fire
    if (players.hasOwnProperty(socket.id)){
      if (players[socket.id].autofire == "yes"){
        players[socket.id].autofire="no";
        io.to(socket.id).emit('newNotification', "Auto-fire off.", "grey");
      }
      else{
        players[socket.id].autofire="yes";
        io.to(socket.id).emit('newNotification', "Auto-fire on.", "grey");
      }
    }
    else if (duneplayers.hasOwnProperty(socket.id)){
      if (duneplayers[socket.id].autofire == "yes"){
        duneplayers[socket.id].autofire="no";
        io.to(socket.id).emit('newNotification', "Auto-fire off.", "grey");
      }
      else{
        duneplayers[socket.id].autofire="yes";
        io.to(socket.id).emit('newNotification', "Auto-fire on.", "grey");
      }
    }
    else if (cavernplayers.hasOwnProperty(socket.id)){
      if (cavernplayers[socket.id].autofire == "yes"){
        cavernplayers[socket.id].autofire="no";
        io.to(socket.id).emit('newNotification', "Auto-fire off.", "grey");
      }
      else{
        cavernplayers[socket.id].autofire="yes";
        io.to(socket.id).emit('newNotification', "Auto-fire on.", "grey");
      }
    }
  })

  socket.on('auto-rotate', function() {
    //client press 'c' to turn on/off auto-rotate
    if (players.hasOwnProperty(socket.id)){
      if (players[socket.id].autorotate == "yes"){
        players[socket.id].autorotate="no";
        io.to(socket.id).emit('newNotification', "Auto-rotate off.", "grey");
      }
      else{
        players[socket.id].autorotate="yes";
        players[socket.id].fastautorotate="no";
        io.to(socket.id).emit('newNotification', "Auto-rotate on. Fast auto rotate off.", "grey");
      }
    }
    else if (duneplayers.hasOwnProperty(socket.id)){
      if (duneplayers[socket.id].autorotate == "yes"){
        duneplayers[socket.id].autorotate="no";
        io.to(socket.id).emit('newNotification', "Auto-rotate off.", "grey");
      }
      else{
        duneplayers[socket.id].autorotate="yes";
        duneplayers[socket.id].fastautorotate="no";
        io.to(socket.id).emit('newNotification', "Auto-rotate on. Fast auto rotate off.", "grey");
      }
    }
    else if (cavernplayers.hasOwnProperty(socket.id)){
      if (cavernplayers[socket.id].autorotate == "yes"){
        cavernplayers[socket.id].autorotate="no";
        io.to(socket.id).emit('newNotification', "Auto-rotate off.", "grey");
      }
      else{
        cavernplayers[socket.id].autorotate="yes";
        cavernplayers[socket.id].fastautorotate="no";
        io.to(socket.id).emit('newNotification', "Auto-rotate on. Fast auto rotate off.", "grey");
      }
    }
  })
  socket.on('fast-auto-rotate', function() {
    //client press 'f' to turn on/off fast-auto-rotate
    if (players.hasOwnProperty(socket.id)){
      if (players[socket.id].fastautorotate == "yes"){
        players[socket.id].fastautorotate="no";
        io.to(socket.id).emit('newNotification', "Fast Auto-rotate off.", "grey");
      }
      else{
        players[socket.id].fastautorotate="yes";
        players[socket.id].autorotate="no";
        io.to(socket.id).emit('newNotification', "Fast Auto-rotate on. Auto rotate off.", "grey");
      }
    }
    else if (duneplayers.hasOwnProperty(socket.id)){
      if (duneplayers[socket.id].fastautorotate == "yes"){
        duneplayers[socket.id].fastautorotate="no";
        io.to(socket.id).emit('newNotification', "Fast Auto-rotate off.", "grey");
      }
      else{
        duneplayers[socket.id].fastautorotate="yes";
        duneplayers[socket.id].autorotate="no";
        io.to(socket.id).emit('newNotification', "Fast Auto-rotate on. Auto rotate off.", "grey");
      }
    }
    else if (cavernplayers.hasOwnProperty(socket.id)){
      if (cavernplayers[socket.id].fastautorotate == "yes"){
        cavernplayers[socket.id].fastautorotate="no";
        io.to(socket.id).emit('newNotification', "Fast Auto-rotate off.", "grey");
      }
      else{
        cavernplayers[socket.id].fastautorotate="yes";
        cavernplayers[socket.id].autorotate="no";
        io.to(socket.id).emit('newNotification', "Fast Auto-rotate on. Auto rotate off.", "grey");
      }
    }
  })
  socket.on('passive-mode', function() {
    //client press 'p' to turn on/off passive mode
    if (players.hasOwnProperty(socket.id)){
      if (players[socket.id].passive == "yes"){
        players[socket.id].passive="no";
        io.to(socket.id).emit('newNotification', "Passive mode off.", "grey");
      }
      else{
        players[socket.id].passive="yes";
        io.to(socket.id).emit('newNotification', "Passive mode on.", "grey");
      }
    }
    else if (duneplayers.hasOwnProperty(socket.id)){
      if (duneplayers[socket.id].passive == "yes"){
        duneplayers[socket.id].passive="no";
        io.to(socket.id).emit('newNotification', "Passive mode off.", "grey");
      }
      else{
        duneplayers[socket.id].passive="yes";
        io.to(socket.id).emit('newNotification', "Passive mode on.", "grey");
      }
    }
    else if (cavernplayers.hasOwnProperty(socket.id)){
      if (cavernplayers[socket.id].passive == "yes"){
        cavernplayers[socket.id].passive="no";
        io.to(socket.id).emit('newNotification', "Passive mode off.", "grey");
      }
      else{
        cavernplayers[socket.id].passive="yes";
        io.to(socket.id).emit('newNotification', "Passive mode on.", "grey");
      }
    }
  })
  socket.on('developerTest', function(token) {
    //if client give token
    if (token == process.env.developerToken){//correct token
      io.to(socket.id).emit('newNotification', "Correct token! Note: You must provide the token every time youu enter the game.", "green");
      peopleWithToken.push(socket.id)//add client's id to list of people who gave correct token
    }
    else{
      io.to(socket.id).emit('newNotification', "Wrong token! Are u guessing?", "red");
    }
  })
  socket.on('chat', function(message) {
    //client send message
    if (players.hasOwnProperty(socket.id)){
      //later on, add code for removing message after 5 seconds
      if (message!=null&&message!=""){
        message = message.replace(/[^\x00-\x7F]/g, "");//remove non ascii characters
        if (message.length>50){//maximum chat length of 50
          message = message.substring(0, 50);//get first 50 characters
        }
      
        if (players[socket.id].chats.length==3){//if messages already have 3
          players[socket.id].chats.shift();//delete oldest chat
        }
        if (players[socket.id].chats.length<3){//if messages less than 3
          var messageObj = {
            chat: message,
            time: 0
          }
          players[socket.id].chats.push(messageObj);
        }
      }
    }
    else if (duneplayers.hasOwnProperty(socket.id)){
      if (message!=null&&message!=""){
        message = message.replace(/[^\x00-\x7F]/g, "");//remove non ascii characters
        if (message.length>50){//maximum chat length of 50
          message = message.substring(0, 50);//get first 50 characters
        }
      
        if (duneplayers[socket.id].chats.length==3){//if messages already have 3
          duneplayers[socket.id].chats.shift();//delete oldest chat
        }
        if (duneplayers[socket.id].chats.length<3){//if messages less than 3
          var messageObj = {
            chat: message,
            time: 0
          }
          duneplayers[socket.id].chats.push(messageObj);
        }
      }
    }
    else if (cavernplayers.hasOwnProperty(socket.id)){
      if (message!=null&&message!=""){
        message = message.replace(/[^\x00-\x7F]/g, "");//remove non ascii characters
        if (message.length>50){//maximum chat length of 50
          message = message.substring(0, 50);//get first 50 characters
        }
      
        if (cavernplayers[socket.id].chats.length==3){//if messages already have 3
          cavernplayers[socket.id].chats.shift();//delete oldest chat
        }
        if (cavernplayers[socket.id].chats.length<3){//if messages less than 3
          var messageObj = {
            chat: message,
            time: 0
          }
          cavernplayers[socket.id].chats.push(messageObj);
        }
      }
    }
  })
  
  socket.on('upgradePlease', function(button,type) {
    //client pressed upgrade button
    if (players.hasOwnProperty(socket.id) || duneplayers.hasOwnProperty(socket.id) || cavernplayers.hasOwnProperty(socket.id)){
      //NOTE: when upgrading, must specify ALL properties that can be changed because you must reset the properties from the previous tank
      //Note: width and height of barrel must be based on player width and height and not a specific number, because the player can upgrade at any level that they want
      //check if player in arena or dune
      if (players.hasOwnProperty(socket.id)){
        playerUpgrade = players[socket.id]
      }
      else if (duneplayers.hasOwnProperty(socket.id)){
        playerUpgrade = duneplayers[socket.id]
      }
      else if (cavernplayers.hasOwnProperty(socket.id)){
        playerUpgrade = cavernplayers[socket.id]
      }
      if (type=="tankButton"){
        //if client send this because he want information about how to draw tank on tank select button
        //create fake tank and upgrade that tank, then later send this fake tank to client
        dummyTank = {
          level: playerUpgrade.level,
          tankTypeLevel: playerUpgrade.tankTypeLevel,
          width: 25,
          height: 25,
          tankType: playerUpgrade.tankType
        }
        realPlayer = playerUpgrade
        playerUpgrade = dummyTank
      }

      //--UPGRADES--

      //TIER 2
      if (playerUpgrade.level>=1 && playerUpgrade.tankTypeLevel<1){//if change the level, remember to change the tankTypelevel below
        //if can uprgade to tier 2
        if (button=="button1"){
          //TWIN
          playerUpgrade.maxhealth = 200,
          playerUpgrade.healthRegenSpeed = 2,
          playerUpgrade.healthRegenTime = 100,//time until health regen
          playerUpgrade.damage = 0.1,
          playerUpgrade.speed = 10,
          playerUpgrade.haveAI = "no",
          playerUpgrade.barrels = {
            barrelOne: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 0,
              //x and y zero refers to barrel in middle, if it is negative, the barrel is towards the left of the tank
              x: -playerUpgrade.width/5*3,//x is width divided by 5 time 3
              barrelMoveIncrement: -0.6,//width divided by 5 time 3 is 0.6 width
              barrelType: "bullet",
              reloadRecover: 10,//lesser is more bullets
              bulletHealth: 10,
              bulletDamage: 0.25,
              bulletTimer: 50,//max amount of time that bullet can move
              bulletSpeed: 15,//this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
              barrelHeightChange: 0,//reset barrel height change which changes when shooting
              shootingState: "no",
              reload: 0//this reload changes in amount when shooting
            },
            barrelTwo: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 0,
              //x and y zero refers to barrel in middle, if it is negative, the barrel is towards the left of the tank
              x: playerUpgrade.width/5*3,
              barrelMoveIncrement: 0.6,
              barrelType: "bullet",
              reloadRecover: 10,//lesser is more bullets
              bulletHealth: 10,
              bulletDamage: 0.25,
              bulletTimer: 50,//max amount of time that bullet can move
              bulletSpeed: 15,//this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
              barrelHeightChange: 0,//reset barrel height change which changes when shooting
              shootingState: "no",
              reload: 5//half of weapon reload so that it starts shooting later than first barrel
            }
          },
          playerUpgrade.tallestBarrel = 2,//relative to player size
          playerUpgrade.thickestBarrel = 0.8,
          playerUpgrade.tankType = "twin",
          playerUpgrade.tankTypeLevel = 1,//the level that upgraded to the current tank
          playerUpgrade.fovMultiplier = 1
          
          if (type!="tankButton"){
            io.to(socket.id).emit('newNotification', "Upgraded to twin.", "grey");
          }
        }
        else if (button=="button2"){
          //SNIPER
          playerUpgrade.maxhealth = 200,
          playerUpgrade.healthRegenSpeed = 2,
          playerUpgrade.healthRegenTime = 100,
          playerUpgrade.damage = 0.1,
          playerUpgrade.speed = 10,
          playerUpgrade.haveAI = "no",
          playerUpgrade.barrels = {
            barrelOne: {
              barrelWidth: playerUpgrade.width/25*30,
              barrelHeight: playerUpgrade.height/25*70,
              additionalAngle: 0,
              x: 0,
              barrelMoveIncrement: 0,
              barrelType: "bullet",
              reloadRecover: 50,
              bulletHealth: 10,
              bulletDamage: 2,
              bulletTimer: 45,
              bulletSpeed: 12,
              barrelHeightChange: 0,
              shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
            }
          },
          playerUpgrade.tallestBarrel = 2.8,
          playerUpgrade.thickestBarrel = 1.2,
          playerUpgrade.tankType = "sniper",
          playerUpgrade.tankTypeLevel = 1,
          playerUpgrade.fovMultiplier = 1.125
          if (type!="tankButton"){
            io.to(socket.id).emit('newNotification', "Upgraded to sniper.", "grey");
          }
        }
        else if (button=="button3"){
          //CANNON
          playerUpgrade.maxhealth = 200,
          playerUpgrade.healthRegenSpeed = 2,
          playerUpgrade.healthRegenTime = 100,
          playerUpgrade.damage = 0.1,
          playerUpgrade.speed = 10,
          playerUpgrade.haveAI = "no",
          playerUpgrade.barrels = {
            barrelOne: {
              barrelWidth: playerUpgrade.width/25*35,
              barrelHeight: playerUpgrade.height/25*45,
              additionalAngle: 0,
              x: 0,
              barrelMoveIncrement: 0,
              barrelType: "bullet",
              reloadRecover: 50,
              bulletHealth: 20,
              bulletDamage: 3,
              bulletTimer: 50,
              bulletSpeed: 9,
              barrelHeightChange: 0,
              shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
            }
          },
          playerUpgrade.tallestBarrel = 2,
          playerUpgrade.thickestBarrel = 1.2,
          playerUpgrade.tankType = "cannon",
          playerUpgrade.tankTypeLevel = 1,
          playerUpgrade.fovMultiplier = 1
          if (type!="tankButton"){
            io.to(socket.id).emit('newNotification', "Upgraded to cannon.", "grey");
          }
        }
        else if (button=="button4"){
          //FLANK
          playerUpgrade.maxhealth = 200,
          playerUpgrade.healthRegenSpeed = 2,
          playerUpgrade.healthRegenTime = 100,
          playerUpgrade.damage = 0.2,
          playerUpgrade.speed = 10,
          playerUpgrade.haveAI = "no",
          playerUpgrade.barrels = {
            barrelOne: {
              barrelWidth: playerUpgrade.width,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 0,
              x: 0,
              barrelMoveIncrement: 0,
              barrelType: "bullet",
              reloadRecover: 15,
              bulletHealth: 10,
              bulletDamage: 4,
              bulletTimer: 50,
              bulletSpeed: 10,
              barrelHeightChange: 0,
              shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
            },
            barrelTwo: {
              barrelWidth: playerUpgrade.width,
              barrelHeight: playerUpgrade.height/25*35,
              additionalAngle: 180,
              x: 0,
              barrelMoveIncrement: 0,
              barrelType: "bullet",
              reloadRecover: 15,
              bulletHealth: 10,
              bulletDamage: 4,
              bulletTimer: 50,
              bulletSpeed: 10,
              barrelHeightChange: 0,
              shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
            }
          },
          playerUpgrade.tallestBarrel = 2,
          playerUpgrade.thickestBarrel = 1,
          playerUpgrade.tankType = "flank",
          playerUpgrade.tankTypeLevel = 1,
          playerUpgrade.fovMultiplier = 1
          if (type!="tankButton"){
            io.to(socket.id).emit('newNotification', "Upgraded to flank.", "grey");
          }
        }
        else if (button=="button5"){
          //FORTRESS
          playerUpgrade.maxhealth = 200,
          playerUpgrade.healthRegenSpeed = 2,
          playerUpgrade.healthRegenTime = 100,
          playerUpgrade.damage = 0.1,
          playerUpgrade.speed = 10,
          playerUpgrade.haveAI = "no",
          playerUpgrade.barrels = {
            barrelOne: {
              barrelWidth: playerUpgrade.width*0.75,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 0,
              x: 0,
              barrelMoveIncrement: 0,
              barrelType: "trap",
              trapDistBeforeStop: 15,
              reloadRecover: 50,
              bulletHealth: 100,
              bulletDamage: 2,
              bulletTimer: 100,
              bulletSpeed: 10,
              barrelHeightChange: 0,
              shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
            }
          },
            
          playerUpgrade.tallestBarrel = 2,
          playerUpgrade.thickestBarrel = 0.75,
          playerUpgrade.tankType = "fortress",
          playerUpgrade.tankTypeLevel = 1,
          playerUpgrade.fovMultiplier = 1
          if (type!="tankButton"){
            io.to(socket.id).emit('newNotification', "Upgraded to fortress.", "grey");
          }
        }
        else if (button=="button6"){
          //NODE
          playerUpgrade.maxhealth = 300,
          playerUpgrade.healthRegenSpeed = 2,
          playerUpgrade.healthRegenTime = 100,
          playerUpgrade.damage = 5,
          playerUpgrade.speed = 10,
          playerUpgrade.haveAI = "no",
          playerUpgrade.barrels = {
            //no barrels cuz it's a node
          },
          playerUpgrade.tallestBarrel = 0,
          playerUpgrade.thickestBarrel = 0,
          playerUpgrade.tankType = "node",
          playerUpgrade.tankTypeLevel = 1,
          playerUpgrade.fovMultiplier = 1
          if (type!="tankButton"){
            io.to(socket.id).emit('newNotification', "Upgraded to node.", "grey");
          }
        }
        else if (button=="button7"){
          //GUARD
          playerUpgrade.maxhealth = 200,
          playerUpgrade.healthRegenSpeed = 2,
          playerUpgrade.healthRegenTime = 100,
          playerUpgrade.damage = 0.1,
          playerUpgrade.speed = 10,
          playerUpgrade.haveAI = "no",
          playerUpgrade.mousex = 0,//needed for calculating drone movement angle
          playerUpgrade.mousey = 0,
          playerUpgrade.barrels = {
            barrelOne: {
              barrelWidth: playerUpgrade.width,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 0,
              x: 0,
              barrelMoveIncrement: 0,
              barrelType: "drone",
              reloadRecover: 25,
              bulletHealth: 30,
              bulletDamage: 1,
              bulletTimer: 100,
              bulletSpeed: 10,
              barrelHeightChange: 0,
              shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
            }
          },
          playerUpgrade.tallestBarrel = 2,
          playerUpgrade.thickestBarrel = 1,
          playerUpgrade.tankType = "guard",
          playerUpgrade.tankTypeLevel = 1,
          playerUpgrade.fovMultiplier = 1
          if (type!="tankButton"){
            io.to(socket.id).emit('newNotification', "Upgraded to guard.", "grey");
          }
        }
      }
      //TIER 3
      else if (playerUpgrade.level>=5 && playerUpgrade.tankTypeLevel<5){//if change the level, remember to change the tankTypelevel below
        //if can upgrade to tier 3
        if (playerUpgrade.tankType=="twin"){
          //twin upgrades
          if (button=="button1"){
            //GUNNER
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 5,
            playerUpgrade.healthRegenTime = 100,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height/25*35,
                additionalAngle: 0,
                x: -playerUpgrade.width/5*4,
                barrelMoveIncrement: -0.8,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 1,
                bulletTimer: 50,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: -playerUpgrade.width/5*1.5,
                barrelMoveIncrement: -0.3,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 1,
                bulletTimer: 50,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: playerUpgrade.width/5*1.5,
                barrelMoveIncrement: 0.3,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 1,
                bulletTimer: 50,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height/25*35,
                additionalAngle: 0,
                x: playerUpgrade.width/5*4,
                barrelMoveIncrement: 0.8,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 1,
                bulletTimer: 50,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 0.4,
            playerUpgrade.tankType = "gunner",
            playerUpgrade.tankTypeLevel = 5,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to gunner.", "grey");
            }
          }
          else if (button=="button2"){
            //QUAD
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 5,
            playerUpgrade.healthRegenTime = 100,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 3,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 90,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 3,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 180,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 3,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 270,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 3,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "quad",
            playerUpgrade.tankTypeLevel = 5,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to quad.", "grey");
            }
          }
          else if (button=="button3"){
            //MONO
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 5,
            playerUpgrade.healthRegenTime = 100,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "yes",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 3,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "mono",
            playerUpgrade.tankTypeLevel = 5,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to mono.", "grey");
            }
          }
          else if (button=="button4"){
            //SPLIT
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 5,
            playerUpgrade.healthRegenTime = 100,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: -30,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 2,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 30,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 2,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 2,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "split",
            playerUpgrade.tankTypeLevel = 5,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to split.", "grey");
            }
          }
          else if (button=="button5"){
            //PALACE
            //bullets grow bigger
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 5,
            playerUpgrade.healthRegenTime = 100,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 25,
                bulletHealth: 30,
                bulletDamage: 5,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 1.2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "palace",
            playerUpgrade.tankTypeLevel = 5,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to palace.", "grey");
            }
          }
         
        else if (button=="button6"){
          // DOUBLE TWIN
          playerUpgrade.maxhealth = 300,
          playerUpgrade.healthRegenSpeed = 5,
          playerUpgrade.healthRegenTime = 100,
          playerUpgrade.damage = 0.1,
          playerUpgrade.speed = 8,
          playerUpgrade.haveAI = "no",
          playerUpgrade.barrels = {
            barrelOne: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 0,
              x: -playerUpgrade.width/5*3,
              barrelMoveIncrement: -0.6,
              barrelType: "bullet",
              reloadRecover: 10,
              bulletHealth: 25,
              bulletDamage: 1,
              bulletTimer: 70,
              bulletSpeed: 10,
              barrelHeightChange: 0,
              shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
            },
            barrelTwo: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 0,
              x: playerUpgrade.width/5*3,
              barrelMoveIncrement: 0.6,
              barrelType: "bullet",
              reloadRecover: 10,
              bulletHealth: 25,
              bulletDamage: 1,
              bulletTimer: 70,
              bulletSpeed: 10,
              barrelHeightChange: 0,
              shootingState: "no",
              reload: 5//half of weapon reload so that it starts shooting later than first barrel
            },
             barrelThree: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 180,
              x: -playerUpgrade.width/5*3,
              barrelMoveIncrement: -0.6,
              barrelType: "bullet",
              reloadRecover: 10,
              bulletHealth: 25,
              bulletDamage: 1,
              bulletTimer: 70,
              bulletSpeed: 10,
              barrelHeightChange: 0,
              shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
            },
            barrelFour: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 180,
              x: playerUpgrade.width/5*3,
              barrelMoveIncrement: 0.6,
              barrelType: "bullet",
              reloadRecover: 10,
              bulletHealth: 25,
              bulletDamage: 1,
              bulletTimer: 70,
              bulletSpeed: 10,
              barrelHeightChange: 0,
              shootingState: "no",
              reload: 5//half of weapon reload so that it starts shooting later than first barrel
            }
          },
          playerUpgrade.tallestBarrel = 2,
          playerUpgrade.thickestBarrel = 0.8,
          playerUpgrade.tankType = "double",
          playerUpgrade.tankTypeLevel = 5,
          playerUpgrade.fovMultiplier = 1
          if (type!="tankButton"){
            io.to(socket.id).emit('newNotification', "Upgraded to double.", "grey");
          }
        }
        }
        else if (playerUpgrade.tankType=="sniper"){
          //sniper upgrades
          if (button=="button1"){
            //TARGETER
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 5,
            playerUpgrade.healthRegenTime = 100,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 15,
                bulletDamage: 1,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "targeter",
            playerUpgrade.tankTypeLevel = 5,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to targeter.", "grey");
            }
          }
          else if (button=="button2"){
            //MARKSMAN
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 5,
            playerUpgrade.healthRegenTime = 100,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*75,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 25,
                bulletHealth: 50,
                bulletDamage: 2,
                bulletTimer: 45,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 3,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "marksman",
            playerUpgrade.tankTypeLevel = 5,
            playerUpgrade.fovMultiplier = 1.25
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to marksman.", "grey");
            }
          }
          else if (button=="button3"){
            //BLAZER
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 5,
            playerUpgrade.healthRegenTime = 100,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 15,
                bulletDamage: 1,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 0.5,
            playerUpgrade.tankType = "blazer",
            playerUpgrade.tankTypeLevel = 5,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to blazer.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="fortress"){
          //fortress upgrades
          if (button=="button1"){
            //PALISADE
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 5,
            playerUpgrade.healthRegenTime = 100,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 15,
                reloadRecover: 25,
                bulletHealth: 150,
                bulletDamage: 1,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "palisade",
            playerUpgrade.tankTypeLevel = 5,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to palisade.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="cannon"){
          //cannon upgrades
          if (button=="button1"){
            //SINGLE
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 5,
            playerUpgrade.healthRegenTime = 100,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/2*3,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 50,
                bulletHealth: 75,
                bulletDamage: 5,
                bulletTimer: 50,
                bulletSpeed: 9,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1.5,
            playerUpgrade.tankType = "single",
            playerUpgrade.tankTypeLevel = 5,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to single.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="flank"){
          //flank upgrades
          if (button=="button1"){
            //FLARE
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 5,
            playerUpgrade.healthRegenTime = 100,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 10,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 2,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 135,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 2,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: -135,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 2,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "flare",
            playerUpgrade.tankTypeLevel = 5,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to flare.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="guard"){
          //guard upgrades
          if (button=="button1"){
            //AUTO-GUARD
            //have AI
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 5,
            playerUpgrade.healthRegenTime = 100,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "yes",
            playerUpgrade.mousex = 0,
            playerUpgrade.mousey = 0,
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "drone",
                reloadRecover: 10,
                bulletHealth: 50,
                bulletDamage: 1,
                bulletTimer: 100,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "auto-guard",
            playerUpgrade.tankTypeLevel = 5,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to auto-guard.", "grey");
            }
          }
          else if (button=="button2"){
            //COMMANDER
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 5,
            playerUpgrade.healthRegenTime = 100,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "no",
            playerUpgrade.mousex = 0,//needed for calculating drone movement angle
            playerUpgrade.mousey = 0,
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "drone",
                reloadRecover: 10,
                bulletHealth: 75,
                bulletDamage: 1,
                bulletTimer: 100,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "commander",
            playerUpgrade.tankTypeLevel = 5,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to commander.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="node"){
          //node upgrades
          if (button=="button1"){
            //ANNIHILATOR
            playerUpgrade.maxhealth = 350,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 10,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              //no barrels cuz it's a node
            },
            playerUpgrade.assets = {
              assetOne: {
                type: 'under',
                sides: 4,
                color: "grey",
                outline: "dimgrey",
                outlineThickness: 5,
                size: 1.5//in comparison to the player's width
              }
            },
            playerUpgrade.tallestBarrel = 0,
            playerUpgrade.thickestBarrel = 0,
            playerUpgrade.tankType = "annihilator",
            playerUpgrade.tankTypeLevel = 5,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to annihilator.", "grey");
            }
          }
          else if (button=="button2"){
            //RAIDER
            //it have aura, which is a bullet that doesnt move
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 5,
            playerUpgrade.healthRegenTime = 100,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: 0,
                barrelHeight: 0,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "aura",
                auraSize: 3,
                reloadRecover: 1,
                bulletHealth: 1000,
                bulletDamage: 5,
                bulletTimer: 3,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 0,
            playerUpgrade.thickestBarrel = "aura",
            playerUpgrade.tankType = "raider",
            playerUpgrade.tankTypeLevel = 5,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to raider. Spawning aura....", "grey");
            }
          }
        }
      }
      else if (playerUpgrade.level>=20 && playerUpgrade.tankTypeLevel<20){
        //if can upgrade to tier 4
        if (playerUpgrade.tankType== "double"){
          if (button=="button1"){
          // TRIPLE TWIN
          playerUpgrade.maxhealth = 400,
          playerUpgrade.healthRegenSpeed = 7,
          playerUpgrade.healthRegenTime = 800,
          playerUpgrade.damage = 0.1,
          playerUpgrade.speed = 7,
          playerUpgrade.haveAI = "no",
          playerUpgrade.barrels = {
            barrelOne: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 0,
              x: -playerUpgrade.width/5*3,
              barrelMoveIncrement: -0.6,
              barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 35,
                bulletDamage: 2,
                bulletTimer: 60,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
            },
            barrelTwo: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 0,
              x: playerUpgrade.width/5*3,
              barrelMoveIncrement: 0.6,
              barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 35,
                bulletDamage: 2,
                bulletTimer: 60,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 2.5//half of weapon reload so that it starts shooting later than first barrel
            },
             barrelThree: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 120,
              x: -playerUpgrade.width/5*3,
              barrelMoveIncrement: -0.6,
              barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 35,
                bulletDamage: 2,
                bulletTimer: 60,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
            },
            barrelFour: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 120,
              x: playerUpgrade.width/5*3,
              barrelMoveIncrement: 0.6,
              barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 35,
                bulletDamage: 2,
                bulletTimer: 60,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 2.5//half of weapon reload so that it starts shooting later than first barrel
            },
             barrelFive: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 240,
              x: -playerUpgrade.width/5*3,
              barrelMoveIncrement: -0.6,
              barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 35,
                bulletDamage: 2,
                bulletTimer: 60,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
            },
            barrelSix: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 240,
              x: playerUpgrade.width/5*3,
              barrelMoveIncrement: 0.6,
              barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 35,
                bulletDamage: 2,
                bulletTimer: 60,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 2.5//half of weapon reload so that it starts shooting later than first barrel
            }
          },
          playerUpgrade.tallestBarrel = 2,
          playerUpgrade.thickestBarrel = 0.8,
          playerUpgrade.tankType = "triple",
          playerUpgrade.tankTypeLevel = 20,
          playerUpgrade.fovMultiplier = 1
          if (type!="tankButton"){
            io.to(socket.id).emit('newNotification', "Upgraded to triple.", "grey");
          }
        }
        }
        if (playerUpgrade.tankType=="gunner"){
          //gunner upgrades
          if (button=="button1"){
            //BLASTER
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: -playerUpgrade.width/5*3,
                barrelMoveIncrement: -0.6,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: playerUpgrade.width/5*3,
                barrelMoveIncrement: 0.6,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 0.8,
            playerUpgrade.tankType = "blaster",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to blaster.", "grey");
            }
          }
          else if (button=="button2"){
            //WARSHIP
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/5*4,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: -playerUpgrade.width/5*3,
                barrelMoveIncrement: -0.6,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width/5*4,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: playerUpgrade.width/5*3,
                barrelMoveIncrement: 0.6,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width/5*4,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 180,
                x: -playerUpgrade.width/5*3,
                barrelMoveIncrement: -0.6,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width/5*4,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 180,
                x: playerUpgrade.width/5*3,
                barrelMoveIncrement: 0.6,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 0.8,
            playerUpgrade.tankType = "warship",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to warship.", "grey");
            }
          }
          else if (button=="button3"){
            //RIMFIRE
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/5*3.5,
                barrelHeight: playerUpgrade.height/25*45,
                additionalAngle: -25,
                x: -playerUpgrade.width/5*3,
                barrelMoveIncrement: -0.6,
                barrelType: "bullet",
                reloadRecover: 20,
                bulletHealth: 40,
                bulletDamage: 5,
                bulletTimer: 70,
                bulletSpeed: 25,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: -playerUpgrade.width/5*1.5,
                barrelMoveIncrement: -0.3,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 1,
                bulletTimer: 50,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: playerUpgrade.width/5*1.5,
                barrelMoveIncrement: 0.3,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 15,
                bulletDamage: 1,
                bulletTimer: 50,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width/5*3.5,
                barrelHeight: playerUpgrade.height/25*45,
                additionalAngle: 25,
                x: playerUpgrade.width/5*3,
                barrelMoveIncrement: 0.6,
                barrelType: "bullet",
                reloadRecover: 20,
                bulletHealth: 40,
                bulletDamage: 5,
                bulletTimer: 70,
                bulletSpeed: 25,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 0.4,
            playerUpgrade.tankType = "rimfire",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to rimfire.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="single"){
          //single upgrades
          if (button=="button1"){
            //DESTROYER
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 50,
                bulletHealth: 100,
                bulletDamage: 15,
                bulletTimer: 50,
                bulletSpeed: 8,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 2,
            playerUpgrade.tankType = "destroyer",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to destroyer.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="targeter"){
          //targeter upgrades
          if (button=="button1"){
            //TRIPLET
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*35,
                additionalAngle: 0,
                x: -playerUpgrade.width/2,
                barrelMoveIncrement: -1/2,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 2,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*35,
                additionalAngle: 0,
                x: playerUpgrade.width/2,
                barrelMoveIncrement: 1/2,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 2,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 2,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "triplet",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to triplet.", "grey");
            }
          }
          else if (button=="button2"){
            //STREAMLINER
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 2,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "streamliner",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to streamliner.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="quad"){
          //quad upgrades
          if (button=="button1"){
            //BLITZ
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 45,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 90,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 135,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFive: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 180,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelSix: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 225,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelSeven: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 270,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelEight: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 315,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "blitz",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to blitz.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="flare"){
          //flare upgrades
          if (button=="button1"){
            //BOOSTER
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 1,
            playerUpgrade.speed = 10,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 30,
                bulletDamage: 4,
                bulletTimer: 40,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*35,
                additionalAngle: 135,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 5,
                bulletDamage: 0.2,
                bulletTimer: 40,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 155,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 5,
                bulletDamage: 0.2,
                bulletTimer: 40,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*35,
                additionalAngle: 225,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 5,
                bulletDamage: 0.5,
                bulletTimer: 40,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFive: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 205,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 5,
                bulletDamage: 0.2,
                bulletTimer: 40,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "booster",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to booster.", "grey");
            }
          }
        else if (button=="button2"){
            //FIGHTER
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 1,
            playerUpgrade.speed = 10,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 30,
                bulletDamage: 4,
                bulletTimer: 40,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*36,
                additionalAngle: 90,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 3.25,
                bulletHealth: 5,
                bulletDamage: 0.5,
                bulletTimer: 40,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*35,
                additionalAngle: 155,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 5,
                bulletDamage: 0.2,
                bulletTimer: 40,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*36,
                additionalAngle: -90,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 3.25,
                bulletHealth: 5,
                bulletDamage: 0.5,
                bulletTimer: 40,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFive: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*35,
                additionalAngle: 205,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 5,
                bulletDamage: 0.2,
                bulletTimer: 40,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "fighter",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to fighter.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="marksman"){
          //marksman upgrades
          if (button=="button1"){
            //DUEL
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*75,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 25,
                bulletHealth: 50,
                bulletDamage: 2,
                bulletTimer: 50,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 3,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "duel",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1.375
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to duel.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="blazer"){
          //blazer upgrades
          if (button=="button1"){
            //SWARM
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: -playerUpgrade.width/5,
                barrelMoveIncrement: -1/5,
                barrelType: "bullet",
                reloadRecover: 1,
                bulletHealth: 15,
                bulletDamage: 3,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: playerUpgrade.width/5,
                barrelMoveIncrement: 1/5,
                barrelType: "bullet",
                reloadRecover: 1,
                bulletHealth: 15,
                bulletDamage: 3,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 3,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "swarm",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to swarm.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="annihilator"){
          //annihilator upgrades
          if (button=="button1"){
            //LANDMINE
            playerUpgrade.maxhealth = 450,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 20,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
            },
            playerUpgrade.assets = {
              assetOne: {
                type: 'under',
                sides: 5,
                color: "grey",
                outline: "dimgrey",
                outlineThickness: 5,
                size: 1.5//in comparison to the player's width
              }
            },
            playerUpgrade.tallestBarrel = 0,
            playerUpgrade.thickestBarrel = 0,
            playerUpgrade.tankType = "landmine",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to landmine.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="mono"){
          //mono upgrades
          if (button=="button1"){
            //SENTRY
            //have AI
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "yes",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 60,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "sentry",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to sentry.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="split"){
          //split upgrades
          if (button=="button1"){
            //TOWER
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*40,
                additionalAngle: 40,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*40,
                additionalAngle: -40,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*45,
                additionalAngle: 20,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*45,
                additionalAngle: -20,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFive: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 40,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "tower",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to tower.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="raider"){
          //raider upgrades
          if (button=="button1"){
            //FORGE
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: 0,
                barrelHeight: 0,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "aura",
                auraSize: 4,
                reloadRecover: 1,
                bulletHealth: 1000,
                bulletDamage: 7,
                bulletTimer: 3,
                bulletSpeed: 0,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 0,
            playerUpgrade.thickestBarrel = "aura",
            playerUpgrade.tankType = "forge",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to forge. Spawning aura...", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="auto-guard"){
          //auto-guard upgrades
          if (button=="button1"){
            //AUTO-COMMANDER
            //have AI
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "yes",
            playerUpgrade.mousex = 0,
            playerUpgrade.mousey = 0,
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/2*3,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "drone",
                reloadRecover: 5,
                bulletHealth: 100,
                bulletDamage: 1,
                bulletTimer: 300,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1.5,
            playerUpgrade.tankType = "auto-commander",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to auto-commander.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="commander"){
          //commander upgrades
          if (button=="button1"){
            //MOTHERSHIP
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.mousex = 0,
            playerUpgrade.mousey = 0,
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/2*3,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "drone",
                reloadRecover: 5,
                bulletHealth: 100,
                bulletDamage: 1,
                bulletTimer: 300,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1.5,
            playerUpgrade.tankType = "mothership",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to mothership.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="palisade"){
          //palisade upgrades
          if (button=="button1"){
            //CASTLE
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/2*3,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 15,
                reloadRecover: 25,
                bulletHealth: 200,
                bulletDamage: 1,
                bulletTimer: 200,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1.5,
            playerUpgrade.tankType = "castle",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to castle.", "grey");
            }
          }
          else if (button=="button2"){
            //WARDEN
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 10,
                bulletHealth: 200,
                bulletDamage: 1,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 90,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 10,
                bulletHealth: 200,
                bulletDamage: 1,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 180,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 10,
                bulletHealth: 200,
                bulletDamage: 1,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 270,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 10,
                bulletHealth: 200,
                bulletDamage: 1,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "warden",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to warden.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="palace"){
          //palace upgrades
          if (button=="button1"){
            //BRIGADE
            //bullets grow bigger
            playerUpgrade.maxhealth = 400,
            playerUpgrade.healthRegenSpeed = 7,
            playerUpgrade.healthRegenTime = 80,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 70,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 1.2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "brigade",
            playerUpgrade.tankTypeLevel = 20,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to brigade.", "grey");
            }
          }
        }
      }
      else if (playerUpgrade.level>=45 && playerUpgrade.tankTypeLevel<45){
        //if can upgrade to tier 5
        if (playerUpgrade.tankType=="blitz"){
          //blitz upgrades
          if (button=="button1"){
            //CYCLONE
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/3*2,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width/3*2,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 30,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width/3*2,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 60,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width/3*2,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 90,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFive: {
                barrelWidth: playerUpgrade.width/3*2,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 120,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelSix: {
                barrelWidth: playerUpgrade.width/3*2,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 150,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelSeven: {
                barrelWidth: playerUpgrade.width/3*2,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 180,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelEight: {
                barrelWidth: playerUpgrade.width/3*2,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 210,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelNine: {
                barrelWidth: playerUpgrade.width/3*2,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 240,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTen: {
                barrelWidth: playerUpgrade.width/3*2,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 270,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelEleven: {
                barrelWidth: playerUpgrade.width/3*2,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 300,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwelve: {
                barrelWidth: playerUpgrade.width/3*2,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 330,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
            },
            playerUpgrade.tallestBarrel = 1.6,
            playerUpgrade.thickestBarrel = 0.6,
            playerUpgrade.tankType = "cyclone",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to cyclone.", "grey");
            }
          }
          else if (button=="button2"){
            //TORNADO
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/6*5,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 1,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 25,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width/6*5,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 36,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 1,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 25,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width/6*5,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 72,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 1,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 25,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width/6*5,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 108,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 1,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 25,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFive: {
                barrelWidth: playerUpgrade.width/6*5,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 144,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 1,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 25,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelSix: {
                barrelWidth: playerUpgrade.width/6*5,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 180,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 1,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 25,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelSeven: {
                barrelWidth: playerUpgrade.width/6*5,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 216,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 1,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 25,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelEight: {
                barrelWidth: playerUpgrade.width/6*5,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 252,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 1,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 25,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelNine: {
                barrelWidth: playerUpgrade.width/6*5,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 288,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 1,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 25,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTen: {
                barrelWidth: playerUpgrade.width/6*5,
                barrelHeight: playerUpgrade.height*1.6,
                additionalAngle: 324,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 1,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 25,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 1.6,
            playerUpgrade.thickestBarrel = 0.83,
            playerUpgrade.tankType = "tornado",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to tornado.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="warship"){
          //warship upgrades
          if (button=="button1"){
            //CRUISER
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/5*4,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: -playerUpgrade.width/5*3,
                barrelMoveIncrement: -0.6,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width/5*4,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: playerUpgrade.width/5*3,
                barrelMoveIncrement: 0.6,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width/5*4,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width/5*4,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 180,
                x: -playerUpgrade.width/5*3,
                barrelMoveIncrement: -0.6,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFive: {
                barrelWidth: playerUpgrade.width/5*4,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 180,
                x: playerUpgrade.width/5*3,
                barrelMoveIncrement: 0.6,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelSix: {
                barrelWidth: playerUpgrade.width/5*4,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 180,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 0.8,
            playerUpgrade.tankType = "cruiser",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to cruiser.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="blaster"){
          //blaster upgrades
          if (button=="button1"){
            //TETRA
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: -playerUpgrade.width/5*3,
                barrelMoveIncrement: -0.6,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 2,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: -playerUpgrade.width/5,
                barrelMoveIncrement: -0.2,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 2,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: playerUpgrade.width/5,
                barrelMoveIncrement: 0.2,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 2,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: playerUpgrade.width/5*3,
                barrelMoveIncrement: 0.6,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 2,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 0.8,
            playerUpgrade.tankType = "tetra",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to tetra.", "grey");
            }
          }
          else if (button=="button2"){
            //KNOCKBACK
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/5*4,
                barrelHeight: playerUpgrade.height*1.5,
                additionalAngle: 0,
                x: -playerUpgrade.width/5*3,
                barrelMoveIncrement: -0.6,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width/5*4,
                barrelHeight: playerUpgrade.height*1.5,
                additionalAngle: 0,
                x: playerUpgrade.width/5*3,
                barrelMoveIncrement: 0.6,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 1.5,
            playerUpgrade.thickestBarrel = 0.8,
            playerUpgrade.tankType = "knockback",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1,
            playerUpgrade.knockback = "yes"
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to knockback.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="streamliner"){
          //streamliner upgrades
          if (button=="button1"){
            //CONQUERER
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 1,
                bulletHealth: 20,
                bulletDamage: 3,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "conquerer",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to conquerer.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="destroyer"){
          //destroyer upgrades
          if (button=="button1"){
            //DEATH STAR
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width*2,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 50,
                bulletHealth: 40,
                bulletDamage: 45,
                bulletTimer: 75,
                bulletSpeed: 6,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width*2,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 72,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 50,
                bulletHealth: 40,
                bulletDamage: 45,
                bulletTimer: 75,
                bulletSpeed: 6,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width*2,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 144,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 50,
                bulletHealth: 40,
                bulletDamage: 45,
                bulletTimer: 75,
                bulletSpeed: 6,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width*2,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 216,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 50,
                bulletHealth: 40,
                bulletDamage: 45,
                bulletTimer: 75,
                bulletSpeed: 6,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFive: {
                barrelWidth: playerUpgrade.width*2,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 288,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 50,
                bulletHealth: 40,
                bulletDamage: 45,
                bulletTimer: 75,
                bulletSpeed: 6,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 2,
            playerUpgrade.tankType = "death star",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1.05
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to death star.", "grey");
            }
          }
          else if (button=="button2"){
            //HARBINGER
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width*2,
                barrelHeight: playerUpgrade.height*2.5,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 100,
                bulletHealth: 100,
                bulletDamage: 110,
                bulletTimer: 75,
                bulletSpeed: 6,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2.5,
            playerUpgrade.thickestBarrel = 2,
            playerUpgrade.tankType = "harbinger",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to harbinger.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="booster"){
          //booster upgrades
          if (button=="button1"){
            //RIOT
            playerUpgrade.maxhealth = 300,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 10,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width*1.1,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10,
                bulletHealth: 60,
                bulletDamage: 7,
                bulletTimer: 25,
                bulletSpeed: 19.5,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.9,
                additionalAngle: 190,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 25,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.9,
                additionalAngle: 170,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 25,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*2.05,
                additionalAngle: 180,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 25,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1.1,
            playerUpgrade.tankType = "riot",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1.1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to riot.", "grey");
            }
          }
          else if (button=="button2"){
            //GUARDIAN
            playerUpgrade.maxhealth = 350,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 10,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width*1.3,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 0.2,
                bulletHealth: 5,
                bulletDamage: 25,
                bulletTimer: 5,
                bulletSpeed: 35,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 195,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 10,
                bulletHealth: 40,
                bulletDamage: 2,
                bulletTimer: 45,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width/5*2,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 165,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 10,
                bulletHealth: 40,
                bulletDamage: 2,
                bulletTimer: 45,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width/2,
                barrelHeight: playerUpgrade.height*2.2,
                additionalAngle: 180,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 2,
                bulletHealth: 30,
                bulletDamage: 3,
                bulletTimer: 25,
                bulletSpeed: 15,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2.2,
            playerUpgrade.thickestBarrel = 1.3,
            playerUpgrade.tankType = "guardian",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1.05
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to guardian.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="duel"){
          //duel upgrades
          if (button=="button1"){
            //HUNTER
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*4,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 20,
                bulletHealth: 75,
                bulletDamage: 15,
                bulletTimer: 50,
                bulletSpeed: 25,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 4,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "hunter",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1.5
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to hunter.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="swarm"){
          //swarm upgrades
          if (button=="button1"){
            //ASSASSIN
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/2,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 1,
                bulletHealth: 20,
                bulletDamage: 6,
                bulletTimer: 35,
                bulletSpeed: 30,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 0.5,
            playerUpgrade.tankType = "assassin",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to assassin.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="landmine"){
          //landmine upgrades
          if (button=="button1"){
            //RAMMER
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 20,
            playerUpgrade.healthRegenTime = 35,
            playerUpgrade.damage = 40,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
            },
            playerUpgrade.assets = {
              assetOne: {
                type: 'under',
                sides: 6,
                color: "grey",
                outline: "dimgrey",
                outlineThickness: 5,
                size: 1.5//in comparison to the player's width
              }
            },
            playerUpgrade.tallestBarrel = 0,
            playerUpgrade.thickestBarrel = 0,
            playerUpgrade.tankType = "rammer",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to rammer.", "grey");
            }
          }
          else if (button=="button2"){
            //ZIGGURAT
            playerUpgrade.maxhealth = 1000,
            playerUpgrade.healthRegenSpeed = 20,
            playerUpgrade.healthRegenTime = 35,
            playerUpgrade.damage = 10,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
            },
            playerUpgrade.assets = {
              assetOne: {
                type: 'under',
                sides: 0,
                color: "grey",
                outline: "dimgrey",
                outlineThickness: 5,
                size: 1.5//in comparison to the player's width
              }
            },
            playerUpgrade.tallestBarrel = 0,
            playerUpgrade.thickestBarrel = 0,
            playerUpgrade.tankType = "ziggurat",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to ziggurat.", "grey");
            }
          }
          else if (button=="button3"){
            //MEDIC
            playerUpgrade.maxhealth = 4,
            playerUpgrade.healthRegenSpeed = 2,
            playerUpgrade.healthRegenTime = 1,
            playerUpgrade.damage = 30,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
            },
            playerUpgrade.assets = {
              assetOne: {
                type: 'under',
                sides: 3,
                color: "grey",
                outline: "dimgrey",
                outlineThickness: 5,
                size: 1.5//in comparison to the player's width
              }
            },
            playerUpgrade.tallestBarrel = 0,
            playerUpgrade.thickestBarrel = 0,
            playerUpgrade.tankType = "medic",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to medic.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="forge"){
          //forge upgrades
          if (button=="button1"){
            //FOUNDRY
            //it have aura, which is a bullet that doesnt move
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 8,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: 0,
                barrelHeight: 0,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "aura",
                auraSize: 5,
                reloadRecover: 1,
                bulletHealth: 1000,
                bulletDamage: 15,
                bulletTimer: 3,
                bulletSpeed: 0,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 0,
            playerUpgrade.thickestBarrel = "aura",
            playerUpgrade.tankType = "foundry",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to foundry. Spawning aura...", "grey");
            }
          }
          else if (button=="button2"){
            //BLIZZARD
            //it have aura, which is a bullet that doesnt move, and aura can freeze bots
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 7,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: 0,
                barrelHeight: 0,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "aura",
                auraSize: 5,
                reloadRecover: 1,
                bulletHealth: 1000,
                bulletDamage: 13,
                bulletTimer: 3,
                bulletSpeed: 0,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 0,
            playerUpgrade.thickestBarrel = "aura",
            playerUpgrade.tankType = "blizzard",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to blizzard. Spawning aura...", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="sentry"){
          //sentry upgrades
          if (button=="button1"){
            //BASTION
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "yes",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 2,
                bulletHealth: 20,
                bulletDamage: 2,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "bastion",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to bastion.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType== "triple"){
          if (button=="button1"){
          //Quadruple twin
          playerUpgrade.maxhealth = 500,
          playerUpgrade.healthRegenSpeed = 10,
          playerUpgrade.healthRegenTime = 70,
          playerUpgrade.damage = 0.1,
          playerUpgrade.speed = 6,
          playerUpgrade.haveAI = "no",
          playerUpgrade.barrels = {
            barrelOne: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 0,
              x: -playerUpgrade.width/5*3,
              barrelMoveIncrement: -0.6,
              barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 35,
                bulletDamage: 4,
                bulletTimer: 60,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
            },
            barrelTwo: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 0,
              x: playerUpgrade.width/5*3,
              barrelMoveIncrement: 0.6,
              barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 35,
                bulletDamage: 4,
                bulletTimer: 60,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 2.5//half of weapon reload so that it starts shooting later than first barrel
            },
             barrelThree: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 90,
              x: -playerUpgrade.width/5*3,
              barrelMoveIncrement: -0.6,
              barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 35,
                bulletDamage: 4,
                bulletTimer: 60,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
            },
            barrelFour: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 90,
              x: playerUpgrade.width/5*3,
              barrelMoveIncrement: 0.6,
              barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 35,
                bulletDamage: 4,
                bulletTimer: 60,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 2.5//half of weapon reload so that it starts shooting later than first barrel
            },
             barrelFive: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 180,
              x: -playerUpgrade.width/5*3,
              barrelMoveIncrement: -0.6,
              barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 35,
                bulletDamage: 4,
                bulletTimer: 60,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
            },
            barrelSix: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 180,
              x: playerUpgrade.width/5*3,
              barrelMoveIncrement: 0.6,
              barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 35,
                bulletDamage: 4,
                bulletTimer: 60,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 2.5//half of weapon reload so that it starts shooting later than first barrel
            },
             barrelSeven: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 270,
              x: -playerUpgrade.width/5*3,
              barrelMoveIncrement: -0.6,
              barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 35,
                bulletDamage: 4,
                bulletTimer: 60,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
            },
            barrelEight: {
              barrelWidth: playerUpgrade.width/5*4,
              barrelHeight: playerUpgrade.height/25*50,
              additionalAngle: 270,
              x: playerUpgrade.width/5*3,
              barrelMoveIncrement: 0.6,
              barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 35,
                bulletDamage: 4,
                bulletTimer: 60,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 2.5//half of weapon reload so that it starts shooting later than first barrel
            }
          },
          playerUpgrade.tallestBarrel = 2,
          playerUpgrade.thickestBarrel = 0.8,
          playerUpgrade.tankType = "quadruple",
          playerUpgrade.tankTypeLevel = 45,
          playerUpgrade.fovMultiplier = 1
          if (type!="tankButton"){
            io.to(socket.id).emit('newNotification', "Upgraded to quadruple.", "grey");
          }
        }
        }
        else if (playerUpgrade.tankType=="tower" || playerUpgrade.tankType=="triplet"){
          //tower and triplet upgrades
          if (button=="button1"){
            //STRONGHOLD
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*35,
                additionalAngle: 45,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*35,
                additionalAngle: -45,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*40,
                additionalAngle: 30,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*40,
                additionalAngle: -30,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFive: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*45,
                additionalAngle: 15,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelSix: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*45,
                additionalAngle: -15,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelSeven: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 5,
                bulletHealth: 20,
                bulletDamage: 1,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "stronghold",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to stronghold.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="auto-commander" || playerUpgrade.tankType=="mothership"){
          //auto-commander and mothership upgrades
          if (button=="button1"){
            //AUTO-MOTHERSHIP
            //have AI
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "yes",
            playerUpgrade.mousex = 0,
            playerUpgrade.mousey = 0,
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "drone",
                reloadRecover: 3,
                bulletHealth: 50,
                bulletDamage: 1,
                bulletTimer: 200,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 2,
            playerUpgrade.tankType = "auto-mothership",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to auto-mothership.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="castle"){
          //castle upgrades
          if (button=="button1"){
            //CONSTRUCTOR
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width*2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 15,
                reloadRecover: 25,
                bulletHealth: 300,
                bulletDamage: 2,
                bulletTimer: 200,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 2,
            playerUpgrade.tankType = "constructor",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to constructor.", "grey");
            }
          }
          else if (button=="button2"){
            //MECHANIC
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: playerUpgrade.width/2,
                barrelMoveIncrement: 0.5,
                barrelType: "trap",
                trapDistBeforeStop: 15,
                reloadRecover: 3,
                bulletHealth: 50,
                bulletDamage: 1,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width/2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: -playerUpgrade.width/2,
                barrelMoveIncrement: -0.5,
                barrelType: "trap",
                trapDistBeforeStop: 15,
                reloadRecover: 3,
                bulletHealth: 50,
                bulletDamage: 1,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 0.5,
            playerUpgrade.tankType = "mechanic",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to mechanic.", "grey");
            }
          }
          else if (button=="button3"){
            //CITADEL
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "yes",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width/2,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 20,
                reloadRecover: 2,
                bulletHealth: 50,
                bulletDamage: 1,
                bulletTimer: 30,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 0.5,
            playerUpgrade.tankType = "citadel",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to citadel.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="warden"){
          //warden upgrades
          if (button=="button1"){
            //DEFENDER
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width*1.5,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 20,
                bulletHealth: 200,
                bulletDamage: 5,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width*1.5,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 72,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 20,
                bulletHealth: 200,
                bulletDamage: 5,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width*1.5,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 144,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 20,
                bulletHealth: 200,
                bulletDamage: 5,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width*1.5,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 216,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 20,
                bulletHealth: 200,
                bulletDamage: 5,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFive: {
                barrelWidth: playerUpgrade.width*1.5,
                barrelHeight: playerUpgrade.height/25*50,
                additionalAngle: 288,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 20,
                bulletHealth: 200,
                bulletDamage: 5,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1.5,
            playerUpgrade.tankType = "defender",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to defender.", "grey");
            }
          }
        }
        else if (playerUpgrade.tankType=="brigade"){
          //brigade upgrades
          if (button=="button1"){
            //BATTALION
            //bullets grow bigger
            playerUpgrade.maxhealth = 500,
            playerUpgrade.healthRegenSpeed = 10,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 0.1,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 3,
                bulletHealth: 20,
                bulletDamage: 2,
                bulletTimer: 35,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
              reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 1.2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "battalion",
            playerUpgrade.tankTypeLevel = 45,
            playerUpgrade.fovMultiplier = 1
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to battalion.", "grey");
            }
          }
        }
      }
      else if (playerUpgrade.level>=100 && playerUpgrade.tankTypeLevel<100){
        if (button=="button1"){
            //HAILSTORM
          //old color that i wanted: #88e5fc, #53dbfc
            playerUpgrade.color = "#934c93",
            playerUpgrade.outline = "#660066",
            playerUpgrade.maxhealth = 1200,
            playerUpgrade.healthRegenSpeed = 50,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 5,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 2,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 60,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 2,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 120,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 2,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 180,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 2,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFive: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 240,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 2,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelSix: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 300,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 2,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 1.2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "hailstorm",
            playerUpgrade.tankTypeLevel = 100,
            playerUpgrade.fovMultiplier = 1,
            playerUpgrade.knockback = "no"//remove knockback for all tanks
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to hailstorm.", "purple");
            }
          }
        else if (button=="button2"){
            //BUNKER
            playerUpgrade.color = "#934c93",
            playerUpgrade.outline = "#660066",
            playerUpgrade.maxhealth = 750,
            playerUpgrade.healthRegenSpeed = 50,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 5,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 2,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 60,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 2,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 120,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 2,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 180,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 2,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFive: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 240,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 2,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelSix: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 300,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 2,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelSeven: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 2,
                bulletHealth: 20,
                bulletDamage: 5,
                bulletTimer: 25,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "bunker",
            playerUpgrade.tankTypeLevel = 100,
            playerUpgrade.fovMultiplier = 1,
            playerUpgrade.knockback = "no"//remove knockback for all tanks
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to bunker.", "purple");
            }
          }
        else if (button=="button3"){
            //CHAOS
            playerUpgrade.color = "#934c93",
            playerUpgrade.outline = "#660066",
            playerUpgrade.maxhealth = 750,
            playerUpgrade.healthRegenSpeed = 50,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 5,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.mousex = 0,
            playerUpgrade.mousey = 0,
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width,
                barrelHeight: playerUpgrade.height*1.5,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "drone",
                reloadRecover: 10,
                bulletHealth: 50,
                bulletDamage: 5,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width/2,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 60,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 10,
                bulletHealth: 50,
                bulletDamage: 5,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width/2,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 120,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 10,
                bulletHealth: 50,
                bulletDamage: 5,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width/2,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 180,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 10,
                bulletHealth: 50,
                bulletDamage: 5,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFive: {
                barrelWidth: playerUpgrade.width/2,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 240,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 10,
                bulletHealth: 50,
                bulletDamage: 5,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelSix: {
                barrelWidth: playerUpgrade.width/2,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 300,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 10,
                bulletHealth: 50,
                bulletDamage: 5,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelSeven: {
                barrelWidth: playerUpgrade.width/2,
                barrelHeight: playerUpgrade.height*2,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "trap",
                trapDistBeforeStop: 10,
                reloadRecover: 10,
                bulletHealth: 50,
                bulletDamage: 5,
                bulletTimer: 100,
                bulletSpeed: 20,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 2.5,
            playerUpgrade.thickestBarrel = 1,
            playerUpgrade.tankType = "chaos",
            playerUpgrade.tankTypeLevel = 100,
            playerUpgrade.fovMultiplier = 1,
            playerUpgrade.knockback = "no"//remove knockback for all tanks
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to chaos.", "purple");
            }
          }
        else if (button=="button4"){
            //BOMBSHELL
            playerUpgrade.color = "#934c93",
            playerUpgrade.outline = "#660066",
            playerUpgrade.maxhealth = 750,
            playerUpgrade.healthRegenSpeed = 50,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 5,
            playerUpgrade.speed = 6,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: playerUpgrade.width*1.5,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 50,
                bulletHealth: 100,
                bulletDamage: 20,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelTwo: {
                barrelWidth: playerUpgrade.width*1.5,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 60,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 50,
                bulletHealth: 100,
                bulletDamage: 20,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelThree: {
                barrelWidth: playerUpgrade.width*1.5,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 120,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 50,
                bulletHealth: 100,
                bulletDamage: 20,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFour: {
                barrelWidth: playerUpgrade.width*1.5,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 180,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 50,
                bulletHealth: 100,
                bulletDamage: 20,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelFive: {
                barrelWidth: playerUpgrade.width*1.5,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 240,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 50,
                bulletHealth: 100,
                bulletDamage: 20,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              },
              barrelSix: {
                barrelWidth: playerUpgrade.width*1.5,
                barrelHeight: playerUpgrade.height*1.2,
                additionalAngle: 300,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 50,
                bulletHealth: 100,
                bulletDamage: 20,
                bulletTimer: 50,
                bulletSpeed: 10,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 1.2,
            playerUpgrade.thickestBarrel = 1.5,
            playerUpgrade.tankType = "bombshell",
            playerUpgrade.tankTypeLevel = 100,
            playerUpgrade.fovMultiplier = 1,
            playerUpgrade.knockback = "no"//remove knockback for all tanks
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to bombshell.", "purple");
            }
          }
        else if (button=="button5"){
            //OVEN
            playerUpgrade.color = "#934c93",
            playerUpgrade.outline = "#660066",
            playerUpgrade.maxhealth = 750,
            playerUpgrade.healthRegenSpeed = 50,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 5,
            playerUpgrade.speed = 5,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {
              barrelOne: {
                barrelWidth: 0,
                barrelHeight: 0,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "aura",
                auraSize: 5,
                reloadRecover: 1,
                bulletHealth: 1000,
                bulletDamage: 20,
                bulletTimer: 3,
                bulletSpeed: 0,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0//must be zero, for the weapon reload, change the reloadRecover property above
              }
            },
            playerUpgrade.tallestBarrel = 0,
            playerUpgrade.thickestBarrel = "aura",
            playerUpgrade.tankType = "oven",
            playerUpgrade.tankTypeLevel = 100,
            playerUpgrade.fovMultiplier = 1,
            playerUpgrade.knockback = "no"//remove knockback for all tanks
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to oven. Spawning aura...", "purple");
            }
          }
        else if (button=="button6"){
            //POUNDER
            playerUpgrade.color = "#934c93",
            playerUpgrade.outline = "#660066",
            playerUpgrade.maxhealth = 1000,
            playerUpgrade.healthRegenSpeed = 100,
            playerUpgrade.healthRegenTime = 70,
            playerUpgrade.damage = 20,
            playerUpgrade.speed = 5,
            playerUpgrade.haveAI = "no",
            playerUpgrade.barrels = {},
            playerUpgrade.tallestBarrel = 0,
            playerUpgrade.thickestBarrel = 0,
            playerUpgrade.tankType = "pounder",
            playerUpgrade.tankTypeLevel = 100,
            playerUpgrade.fovMultiplier = 1,
            playerUpgrade.knockback = "no"//remove knockback for all tanks
            if (type!="tankButton"){
              io.to(socket.id).emit('newNotification', "Upgraded to pounder.", "purple");
            }
          }
      }

      if (type=="tankButton"){
        //send the information on how to draw tank on button
        io.to(socket.id).emit('tankButton', playerUpgrade, button, realPlayer);
      }
      }
            })
  socket.on('pingServer', function() {
    io.to(socket.id).emit('pingClient',Date.now());
  });//when the client ping the server to check latency
  
  socket.on('joinGame', function(playerName) {//when client clicked play
    if (!players.hasOwnProperty(socket.id)){//check if client has already joined
      //check name
      if (playerName==null||playerName==""){
        playerName = "unnamed";
      }
      else{
        playerName = playerName.replace(/[^\x00-\x7F]/g, "");//remove non ascii characters
        if (playerName==""){//if all the characters were not allowed
          playerName = "unnamed";
        }
         else if (playerName.length>20){//maximum name length of 20
          playerName = playerName.substring(0, 20);//get first 20 characters
        }
      }
      
      //generating a random player spawn location
      const startingWidth = 50;//width of player when spawn
      const calculationForSpawning = gameSize - startingWidth*2;//minus the sides so won't spawn outside arena
      //get random location
      const locationX = Math.floor(Math.random() * calculationForSpawning)+startingWidth;
      const locationY = Math.floor(Math.random() * calculationForSpawning)+startingWidth;
      //add player to the player list
      //spawn as a basic tank
      players[socket.id] = {
        x: locationX,
        y: locationY,
        health: 100,
        maxhealth: 100,
        healthRegenSpeed: 1,
        healthRegenTime: 100,//time until health regen
        healthRegenTimeChange: 100,//will change when finding out whether to regenerate health
        damage: 0.1,//body damage
        score: 0,
        level: 0,
        name: playerName,
        amountAddWhenMoveX: 0,//determines whether player is moving or not
        amountAddWhenMoveY: 0,
        speed: 10,//max speed
        currentspeedX: 0,//keeps track of accelerating and decelerating
        currentspeedY: 0,
        haveAI: "no",
        autofire: "no",
        autorotate: "no",
        fastautorotate: "no",
        passive: "no",
        chats: [],
        //do not change starting width and height as it will affect proportion with barrel
        width: 25,//radius of player body, so it is half of actual width
        height: 25,//also half of actual height
        color: "#0092e0",
        outline: "#0079ba",
        barrels: {
                  barrelOne: {
                    barrelWidth: 25,
                    barrelHeight: 45,
                    additionalAngle: 0,
                    //x and y zero refers to barrel in middle, if it is negative, the barrel is towards the left of the tank
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 20,//delay between bullets
                    bulletHealth: 10,
                    bulletDamage: 0.5,
                    bulletTimer: 50,//max amount of time that bullet can move
                    bulletSpeed: 12,//this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0,//barrel height reduction when shooting
                    shootingState: "no",//for the barrel animation when shooting
                    reload: 0//must be zero, this value changes
                  }
                },
        assets: {},
        tallestBarrel: 2,//for easier calculation when finding out if a player can be seen on the screen, it must be relative to the player width and height, e.g. in this case, the tallest barrel is 50 when theplayer height is 25, then write 2 because 50/25 is 2
        thickestBarrel: 0.8,
        barrelColor: "grey",
        barrelOutline: "#5e5e5e",
        angle: 0,
        shooting: "no",
        tankType: "basic",
        tankTypeLevel: 0,//the level that upgraded to the current tank
        hit: 0,
        developer: "no",
        fovMultiplier: 1//field of vision
      }
      io.to(socket.id).emit('youJoined');//tell client that he has been successfully added
      //send notification to you
      io.to(socket.id).emit('newNotification', "Welcome to the game!", "grey");
      //next, check if client gave any correct developer token
      if (peopleWithToken.includes(socket.id)){
        console.log("a dev joined")
        //remove client id from list
        var index = peopleWithToken.indexOf(socket.id);
        if (index > -1) { // only splice array when item is found
          peopleWithToken.splice(index, 1); // 2nd parameter means remove one item only
        }
        //special dev stuff
        players[socket.id].score = 1000000;//give 1m score to devs
        players[socket.id].developer = "yes";
        players[socket.id].name = "using dev token";
        io.to(socket.id).emit('newNotification', "Successfully joined as dev. Differences from normal: spawn with 1m score but cant kill other players. Other people will see u as green tank.", "grey");
      }
    }
  });
});



http.listen(process.env.PORT || 3000, function(){
  console.log('listening on *:3000');
  // start the game
  //old code: setInterval(gameLoop, 30)
  setInterval(function () {
    start = clock();//get time now to calculate code execution time later

    //calculate Delta time
    //What is delta time? All movement must /30*delta. This is because at the end of the server code, the server loop occurs every 30ms. In theory, if an object supposed to move 1 unit every loop, then it will move 1 unit every 30ms. However, sometimes a loop takes longer than 30ms to complete, causing delay. One loop will take longer than 30ms, so the object will move less than 1 unit every 30ms, causing slow movement when server lagging. To prevent this, movements are based on time lapsed since previous loop. To do this, movement amounts must be divide by 30ms multiply time lapsed. Time lapsed since previous loop is called delta time. To simplify things, we calculate delta variable here which is 1/30*delta time, so that movement only need to *delta variable instead of /30*delta.
    currentLoopTime = Date.now()
    if (prevLoopTime == 0){//if this is first loop
      delta = 1;
    }
    else {
      timeLapsed = currentLoopTime - prevLoopTime;
      delta = 1/30*timeLapsed;
      if (delta<1){
        delta=1;
        //delta cannot be less than 1, but sometimes due to calculation precision, delta is 0.9
      }
    }
    prevLoopTime = currentLoopTime
    //actual game stuff
    gameLoop();
    gameLoopDune();
    gameCavernLoop();
    duration = clock(start);//calculate code execution time
  }, 30);
});
