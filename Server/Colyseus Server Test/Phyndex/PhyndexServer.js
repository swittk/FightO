const { Room, Server } = require('colyseus');

const Matter = require('matter-js');

const {Phyndex, FightOEngine, FightOMessage} = require('./Phyndex.js');

const http = require('http');

var sampleLevel = {
  "size" : {w:100,h:100},
  
  //sections divided by object's general type
  "floor" : [
    { bodyd:{type:"rectangle",x:0,y:0,w:12,h:100}, assetd: {surf:"grass"} },
    { bodyd:{type:"rectangle",x:12,y:0,w:20,h:12}, assetd: {surf:"grass"} },
    { bodyd:{type:"rectangle",x:32,y:0,w:12,h:100}, assetd: {surf:"grass"} },
    { bodyd:{type:"rectangle",x:12,y:18,w:20,h:12}, assetd: {surf:"grass"} }
  ],
  "wall" : [
    { bodyd:{type:"rectangle",x:1,y:1,w:1,h:1}, assetd: {surf:"grass"} },
    { bodyd:{type:"rectangle",x:1,y:2,w:1,h:2}, assetd: {surf:"stone"} },
    { bodyd:{type:"rectangle",x:4,y:5,w:1,h:1, breakable:true, breakenergy:3.5}, assetd: {surf:"stone.break"} },
    { bodyd:{type:"rectangle",x:5,y:5,w:2,h:1}, assetd: {surf:"stone"} },
    { bodyd:{type:"rectangle",x:7,y:5,w:1,h:2}, assetd: {surf:"stone"} }
  ],
  "entity" : [
    {
      type : "pickup.boost", //Specifies most information to be loaded
      x: 50,
      y: 50,
      properties : {
        //properties that we want to override/add
        timingFunction : "20 - t"
      }
    }
  ],
  "spawnpoints" : [
    {x:10, y:10},
    {x:20, y:10},
    {x:20, y:10},
    {x:20, y:20}
  ]
}



class GameState {
  constructor(objectStateObject) {    
    this.objectState = objectStateObject;
  }
}

class FightOGame extends Room {
  // When room is initialized
  onInit (options) {
    console.log("map is "+JSON.stringify(options.map)); 
    this.fightEngine = new FightOEngine();
        
    //Set patch rate in milliseconds, default is 50
    //this.setPatchRate(50);
    
    //max number of clients
    this.maxClients = options.map.spawnpoints.length;
    
    //Colyseus's clock timer; use this instead of standard setTimeout and setInterval
    //this.clock
    
    this.loadMap(options.map);
    
    var self = this;
    this.engineTimer = 
    setInterval(function() {
      self.fightEngine.step(0.05);
    }, 50);
    
    this.activeUpdateTimer = setInterval(function(){
      self.sendActiveUpdateMessage();
    }, 50);
    
    this.setState(new GameState(this.fightEngine.stateObject));
  }
  
  loadMap(map) {
    this.fightEngine.loadMap(map);
  }
    
  // Checks if a new client is allowed to join. (default: `return true`)
  requestJoin (options/**any*/, isNew/**boolean*/) {
    //TODO: do something more complicated
    var dummyplayerobject = {};
    if(this.fightEngine.playerCanJoin(dummyplayerobject)) return true;
    return false;
  }

  // When client successfully join the room
  onJoin (client/**Client*/) {
    console.log("A player joined");
  }

  // When a client leaves the room
  onLeave (client/**Client*/) {
    if(client.player && client.player.lives) client.player.turnDead();
  }
  
  // When a client sends a message
  onMessage (client/**Client*/, data/**any*/) {
    /**
      Data might be..
      1. Tilt / Acceleration
      2. Use Item
      */
    if(!client.player) {
      if(data.type == 'nameset') {
        client.name = data.name;
        var player = this.fightEngine.addPlayerWithName(client.name);
        console.log("added player :"+JSON.stringify(player));
        client.player = player;
        this.send (client,new FightOMessage('identify',client.player.bodyId));
      }
      return;
    }
    if(data.type == 'accel') {
      client.player.lastAccel.x = data.x;
      client.player.lastAccel.y = data.y;
      console.log('received accel'+client.player.lastAccel.x +client.player.lastAccel.y);
    }
  }

  // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
  onDispose () {
  }
  
  sendActiveUpdateMessage() {
    var message = this.fightEngine.createActiveUpdateMessage();
    //console.log("send active message" + JSON.stringify(message));
    this.broadcast(message);
  }
}







const httpServer = http.createServer();
var fightoServer = new Server();
fightoServer.register("sample", FightOGame, {map:sampleLevel});

fightoServer.attach({ server: httpServer });
var PORT = process.env.PORT ? process.env.PORT : 4000;
fightoServer.listen(PORT);