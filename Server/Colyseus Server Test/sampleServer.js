const { Room, Server } = require('colyseus');

const Matter = require('matter-js');
const http = require('http');

const playerDiameter = 10;
const mapUnitSize = 15;


function newPlayer(x, y) {
  var player = Matter.Bodies.circle(x*mapUnitSize, y*mapUnitSize, playerDiameter/2.0, {frictionAir : 0.08, isStatic: false});
  player.label = "player";
  player.floorCount = 0;
  return player;
}

function newFloorPiece(x,y,w,h) {
  var ox = x + w/2;
  var oy = y + h/2;
  var floor = Matter.Bodies.rectangle(ox*mapUnitSize, oy*mapUnitSize, w*mapUnitSize, h*mapUnitSize, {isStatic : true, isSensor : true});
  floor.isFloor = true;
  return floor;
}

function newWallPiece(x,y,w,h) {
  var ox = x + w/2;
  var oy = y + h/2;
  var wall = Matter.Bodies.rectangle(ox*mapUnitSize, oy*mapUnitSize, w*mapUnitSize, h*mapUnitSize, {isStatic : true});
  console.log("added wall "+wall);
  return wall;
}

class FightOGame extends Room {
  // When room is initialized
  onInit (options) {    
    this.engine = Matter.Engine.create();
    this.engine.world.gravity = Matter.Vector.create(0,0);
    
    this.player = newPlayer(10,10);
    this.spawnPlayer(player);
    
    this.aX = 0; this.aY = 0;
    
    this.registerEnginePlayerLoop();
    registerEngineFloorCollision(this.engine, this.player);
    
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
    for(mapDesc of level.floor) {
      var floor = newFloorPiece(mapDesc.x, mapDesc.y, mapDesc.w, mapDesc.h);
      Matter.World.add(this.engine.world, floor);
    }
    for(mapDesc of level.walls) {
      var wall = newWallPiece(mapDesc.x, mapDesc.y, mapDesc.w, mapDesc.h);
      if(mapDesc.breakable) {
        wall.label = "breakblock";
        wall.render.fillStyle = '#C7F464';
        wall.breakenergy = mapDesc.breakenergy;
      }
      Matter.World.add(this.engine.world, wall);
    }
  }
  
  registerEnginePlayerLoop() {
    var player = this.player;
    
    Matter.Events.on(this.engine, "afterUpdate", function(event) {
      //console.log('Total floorcount : '+player.floorCount);
      if(player.spawnComplete == false) {
        console.log('position at '+player.position.x +','+player.position.y);
        //console.log('now stamp '+event.timestamp);
        if(event.timestamp - player.startSpawnStamp > player.spawnTimer) {
          player.spawnComplete = true;
          console.log('completed spawn');
        }
      }
      else if(player.floorCount < 1) {
        killPlayer(player);
        spawnPlayer(player, 10, 10);
      }
    });
    Matter.Events.on(this.engine, "beforeUpdate", function(event) {
      Matter.Body.applyForce(player, player.position, Matter.Vector.create(0.001*player.mass*this.aX,-0.001*player.mass*this.aY));
    });
  }
  spawnPlayer(p, x, y) {
    if(x !== undefined && y !== undefined) {
      Matter.Body.setPosition(p, Matter.Vector.create(x*mapUnitSize,y*mapUnitSize));
    }
    p.floorCount = 0;
    p.spawnTimer = 0;
    p.spawnComplete = false;
    p.startSpawnStamp = engine.timing.timestamp;
    console.log('start stamp of '+p.startSpawnStamp);
    console.log('Start position at '+p.position.x +','+p.position.y);
    Matter.World.add(this.engine.world, p);
  }
  killPlayer(p) {
    Matter.World.remove(this.engine.world, p);
    console.log("You died");
  }
  
  // Checks if a new client is allowed to join. (default: `return true`)
  requestJoin (options/**any*/, isNew/**boolean*/) {
    return true;
  }

  // When client successfully join the room
  onJoin (client/**Client*/) {
    //dunno..
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
        
    if(data.type == 'accel') {
      this.aX = data.x;
      this.aY = data.y;
    }
  }

  // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
  onDispose () {
    Matter.Engine.clear(this.engine)
  }
}


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

class TestRoom extends Room {
  // When room is initialized
  onInit (options) {    
    //max number of clients
    this.maxClients = 4;
    
    //Colyseus's clock timer; use this instead of standard setTimeout and setInterval
    //this.clock
    this.setState({
      array:[],
      dummy:"hello",
      map:options.map
    });
  }
  
  // Checks if a new client is allowed to join. (default: `return true`)
  requestJoin (options/**any*/, isNew/**boolean*/) {
    return true;
  }

  // When client successfully join the room
  onJoin (client/**Client*/) {
    //dunno..
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
    this.state.array.push(data);
  }

  // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
  onDispose () {
  }
}


const httpServer = http.createServer();
var foserver = new Server();


foserver.register("sample", TestRoom, {map:sampleLevel});

foserver.attach({ server: httpServer });
foserver.listen(4000)


