const { Room, Server } = require('colyseus');

const Matter = require('matter-js');


class FightRoomState {
  constructor(map, players, playerBodies) {
    this.map = map;
    this.dynamicFloors = [];
    this.dynamicWalls = [];
    this.entities = [];
    this.players = players;
    this.playerBodies = [];
  }
}




var sampleLevel = {
  "size" : {w:100,h:100},
  "floor" : [
    {x:0,y:0,w:100,h:100,surf:"grass"}
  ],
  "walls" : [
    {x:1,y:1,w:1,h:1,surf:"grass"},
    {x:1,y:2,w:1,h:2,surf:"stone"},
    {x:5,y:5,w:2,h:1,surf:"stone.break",breakable:true,breakvelocity:10}
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

//The client instance present in rooms and such are the same as the raw sockets from
//the ws (WebSocket) package!

/**
Properties
==========
clients: WebSocket[]
  The array of connected clients. See Web-Socket Client.

maxClients: number

clock: ClockTimer
  A ClockTimer instance, used for timing events

Methods
=======
lock ()
  Locking the room will remove it from the pool of available rooms for new clients to connect to.

unlock ()
  Unlocking the room returns it to the pool of available rooms for new clients to connect to.

send (client, data)
  Send data to a particular client.

setState (object)
  Set the new room state
  * Call this method only once (on Room.onInit()) in your room handler
  * Do not call this method for updates in the room state. 
  * The binary patch algorithm is re-set every time you call it.

broadcast ( data )
  Send raw data to all connected clients
  e.g.
    Server : this.broadcast({ message: "Hello world!" });
    Client :  room.onData.add(function(data) {
                console.log(data); // => {message: "Hello world!"}
              });

disconnect ()
  Disconnect all clients, then dispose
*/

class FightOGame extends Room {
  // When room is initialized
  onInit (options) {
    this.engine = Matter.Engine.create();
    
    //Set patch rate in milliseconds, default is 50
    //this.setPatchRate(50);
    
    //max number of clients
    this.maxClients = 4;
    
    //Colyseus's clock timer; use this instead of standard setTimeout and setInterval
    //this.clock
    
    this.loadMap(options.map);
    
    Engine.run(this.engine);
  }
  
  loadMap(map) {
    //this.engine.world.add...
  }
  
  loadEntities() {
  }
  
  loadPlayers() {
  }
  
  
  
  // Checks if a new client is allowed to join. (default: `return true`)
  requestJoin (options/**any*/, isNew/**boolean*/) {
    
  }

  // When client successfully join the room
  onJoin (client/**Client*/) {
    //TODO: ADD THIS
    createPlayer(client);
    
    if(checkIfCompleteGame()) {
      loadEntities();
      loadPlayers();
      startMatch();
    }
  }

  // When a client leaves the room
  onLeave (client/**Client*/) {
  }
  
  // When a client sends a message
  onMessage (client/**Client*/, data/**any*/) {
    /**
      Data might be..
      1. Tilt / Acceleration
      2. Use Item
      */
    
    //TODO: ADD THIS
    var pBody = getPlayerBodyFromClient(client);
    
    if(data.type == 'accel') {
      Matter.Body.applyForce(
        pBody, 
        pBody.position, 
        Matter.Vector.create(data.x * pBody.mass, data.y * pBody.mass)
      );
    }
  }

  // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
  onDispose () {
    Matter.Engine.clear(this.engine)
  }
}


class FightOLobby extends Room {
  onInit (options) {
    //Define non-enumerable property
    Object.defineProperty(this, 'players', new Map());
  }
  
  // Checks if a new client is allowed to join. (default: `return true`)
  requestJoin (options/**any*/, isNew/**boolean*/) {
    return true;
  }

  // When client successfully join the room
  onJoin (client/**Client*/) {
    
  }

  // When a client leaves the room
  onLeave (client/**Client*/) {
  }

  // When a client sends a message
  onMessage (client/**Client*/, data/**any*/) {
    if(data == 'join') {
      
    }
  }

  // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
  onDispose () {
  }
}



var Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies;


var foserver = new Server();

foserver.register("lobby", FightOLobby);
