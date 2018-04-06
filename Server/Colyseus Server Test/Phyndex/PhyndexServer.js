const { Room, Server } = require('colyseus');

const Matter = require('matter-js');

const {Phyndex, FightOEngine} = require('./Phyndex.js');

const http = require('http');

var sampleLevel = {
  "size" : {w:100,h:100},
  "floor" : [
    {x:0,y:0,w:12,h:100,surf:"grass"},
    {x:12,y:0,w:20,h:12,surf:"grass"},
    {x:32,y:0,w:12,h:100,surf:"grass"},
    {x:12,y:18,w:20,h:12,surf:"grass"}
  ],
  "walls" : [
    {x:1,y:1,w:1,h:1,surf:"grass"},
    {x:1,y:2,w:1,h:2,surf:"stone"},
    {x:4,y:5,w:1,h:1,surf:"stone"},
    {x:5,y:5,w:2,h:1,surf:"stone.break",breakable:true,breakenergy:3.5},
    {x:7,y:5,w:1,h:2,surf:"stone"}
  ],
  "entities" : [
    {
      type : "pickup.boost", //Specifies most information to be loaded
      x: 50,
      y: 50,
      properties : {
        //properties that we want to override/add
      }
    }
  ],
  "spawnpoints" : [
    {x:10, y:10},
    {x:90, y:90},
    {x:90, y:10},
    {x:10, y:90}
  ]
}

var phyndexMap = {
  "size" : {w:100,h:100},
  "spawnpoints" : [
    {x:10, y:10},
    {x:90, y:90},
    {x:90, y:10},
    {x:10, y:90}
  ],
  "static" : {
    "floor" : [
      {x:0,y:0,w:12,h:100,surf:"grass"},
      {x:12,y:0,w:20,h:12,surf:"grass"},
      {x:32,y:0,w:12,h:100,surf:"grass"},
      {x:12,y:18,w:20,h:12,surf:"grass"}
    ],
    "walls" : [
      {x:1,y:1,w:1,h:1,surf:"grass"},
      {x:1,y:2,w:1,h:2,surf:"stone"},
      {x:4,y:5,w:1,h:1,surf:"stone"},
      {x:5,y:5,w:2,h:1,surf:"stone.break",breakable:true,breakenergy:3.5},
      {x:7,y:5,w:1,h:2,surf:"stone"}
    ],
    "spawners" : [
    ],
  },
  "dynamic" : {
  }
}



class GameState {
  constructor(map) {
    this.playerid = [];
    this.dynamicBodies = {};
    
    this.map = map;
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
    
    this.setState(new GameState(options.map));
  }
  
  loadMap(map) {
    this.fightEngine.loadMap(map);
  }
    
  // Checks if a new client is allowed to join. (default: `return true`)
  requestJoin (options/**any*/, isNew/**boolean*/) {
    return true;
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
      }
      return;
    }
    if(data.type == 'accel') {
      client.player.lastAccel.x = data.x;
      client.player.lastAccel.x = data.y;
      //console.log('received accel'+this.aX+this.aY);
    }
  }

  // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
  onDispose () {
  }
  
  sendActiveUpdateMessage() {
    var message = this.fightEngine.createActiveUpdateMessage();
    console.log("send message" + JSON.stringify(message));
    this.broadcast(message);
  }
}







const httpServer = http.createServer();
var fightoServer = new Server();
fightoServer.register("sample", FightOGame, {map:sampleLevel});

fightoServer.attach({ server: httpServer });
fightoServer.listen(4000)
