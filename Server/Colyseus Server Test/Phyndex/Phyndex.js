/**
  Body specification rules.
  
  Types for collisions, etc. will be specified using a property called 
  - "typeLabel"
  
  Collision processing is to be done using 2 callbacks specified as properties on bodies
  - "collisionStartCallback", and
  - "collisionEndCallback"
*/

const playerDiameter = 10;
const mapUnitSize = 15;


const Matter = require('matter-js');


class Phyndex {
  constructor(engine) {
    this.lastIndex = -1;
    if(!engine) {
      this.engine = Matter.Engine.create();
    }
    else {this.engine = engine;}
    this.indices = new Map();
  }
  
  lastIndex() { return this.lastIndex; }
  newIndex() {
    this.lastIndex++;
    while(this.indices.has(this.lastIndex)) {this.lastIndex++;}
    return this.lastIndex;
  }
  
  /**
    @return {Integer} index : The index added.
  */
  add(body) {
    Matter.World.add(this.engine.world, body);
    var index = this.newIndex();
    body.index = index;
    this.indices.set(index, body);
    return index;
  }
  
  /**
    @return undefined
  */
  remove(index) {
    var body = this.indices.get(index);
    delete body.index;
    Matter.World.remove(this.engine.world, body);
    this.indices.delete(index);
  }
  
  /**
    @param {Integer} index The index of the body
    @return {Matter.Body} The body with the index
  */
  get(index) { return this.indices.get(index); }
  
  /** Alternative to Phyndex.has*/
  exists(index) { return this.has(index); }
  /** @return {boolean} If there is a body with the index specified*/
  has(index) { return this.indices.has(index); }
  
  /** 
    Adds the body to the world, replacing the index if it was in use
   */
  set(index, body) {
    if(this.has(index)) { this.remove(index); }
    
    Matter.World.add(this.engine.world, body);
    body.index = index;
    this.indices.set(index, body);
    return index;
  }
  
  find(body) {
    //convert entries ( iterator[[key, value]] ) to array
    var array = Array.from(this.indices.entries());
    
    //find [key,value] pair in array
    var bodypair = array.find(function(element) {
      return (element[1] == body);
    });
    
    if(bodypair != undefined) {
      //index 0 is key
      return bodypair[0];
    }
    return undefined;
  }
  
  step(dt) {
    Matter.Engine.update(this.engine, dt);
  }
}

class FightOPlayer {
  constructor(name, bodyId) {
    this.name = name;
    this.bodyId = bodyId;
    this.lastAccel = {
      x : 0, y : 0
    };
    this.lives = 4;
  }
  
  die() {this.lives -= 1;}
  turnDead() {this.lives = 0;}
} 


/**
  
  - Call step(dt) to step the physics engine by the specified amount of time
  - Use indexes to manage physics bodies
    - CreateRetrieveUpdateDelete : addBody, getBody, setBody, removeBody
    - findBody to get index as needed.
  - createBodyWithDescriptor(descriptor, _index)
    - Creates AND adds body with descriptor to the world
    ** Implement all map body descriptor parsing here
  
  - Convenience methods to set & get body properties by index
    - Setters
      - setPosition(index, x, y)
      - setVelocity(index, x, y)
      - setAngle(index, a)
      - setAngularVelocity(index, w)
    Getters
      - getPosition(index)
      - getVelocity(index)
      - getAngle(index)
      - getAngularVelocity(index)
    
  
  - Collisions
    - Process collisions exclusively via Callback properties on physics bodies
      - collisionStartCallback(ownerbody, otherbody, event.timestamp)
      - collisionEndCallback(ownerbody, otherbody, event.timestamp)
  - "typeLabel"
    - Please specify object types (when used in collisions, etc.) by setting this property
  
  - Player Management
    - addPlayerWithName(name) -- As the name says
  */
class FightOEngine {
  constructor(engine) {
    if(!engine) {
      this.engine = Matter.Engine.create();
    }
    else this.engine = engine;    
    this.phyndex = new Phyndex(this.engine);    
    this.players = [];
    
    this.engine.world.gravity = Matter.Vector.create(0,0);
    this.registerEngineForPlayerFloor();
    this.registerEngineForForces();
    this.registerEngineForCollisions();
  }
  
  step(dt) {
    //console.log("stepping..");
    this.phyndex.step(dt);
  }
  
  setPosition(index, x, y) { Matter.Body.setPosition(this.getBody(index), Matter.Vector.create(x, y)); }
  
  setVelocity(index, x, y) { Matter.Body.setVelocity(this.getBody(index), Matter.Vector.create(x, y)); }
  
  setAngle(index, a) { Matter.Body.setAngle(this.getBody(index), a); }
  
  setAngularVelocity(index, w) { Matter.Body.setAngularVelocity(this.getBody(index), w); }
  
  getPosition(index) {return this.getBody(index).position;}
  getVelocity(index) {return this.getBody(index).velocity;}
  getAngle(index) {return this.getBody(index).angle;}
  getAngularVelocity(index) {return this.getBody(index).angularVelocity;}
  
  getBody(index) { return this.phyndex.get(index); }
    
  addPlayerWithName(name) {
//     if(this.players.length >= this.map.playerCount) {
//       //If playerCount is invalid, return.
//       return;
//     }
    var r = playerDiameter/2.0;
    var pIndex = this.players.length;
    var x = this.map.spawnpoints[pIndex].x;
    var y = this.map.spawnpoints[pIndex].y;
    
    var self = this;
    var startcallback = function(playerbody, otherbody, timestamp) {
      if(otherbody.typeLabel == "floor") {
        playerbody.floorCount += otherbody.floorIncrement;
      }
    };
    var endcallback = function(playerbody, otherbody, timestamp) {
      if(otherbody.typeLabel == "floor") {
        playerbody.floorCount -= otherbody.floorIncrement;
      }
    }
    var body = Matter.Bodies.circle(x, y, r, {
      typeLabel:"player",
      floorCount : 0,
      collisionStartCallback:startcallback,
      collisionEndCallback:endcallback
    });
    var bodyIndex = this.addBody(body);
    var player = new FightOPlayer(name, bodyIndex);
    console.log("created player");    
    this.players.push(player);
    console.log("pushed player");    
    return player;
  }
  
  /**
    @param descriptor {Object} : Object descriptor
    @param _index {Integer} (Optional) If used, will replace object which has index 
  */
  createBodyWithDescriptor(descriptor, _index) {
    var body;
    
    //TODO: add code to generate types of bodies here
    switch(descriptor.type) {
      case "circle" : {
        body = Matter.Bodies.circle(
          descriptor.x * mapUnitSize, 
          descriptor.y * mapUnitSize, 
          descriptor.r * mapUnitSize, 
          descriptor.options
        );
      } break;
      case "rectangle" : {
        body = Matter.Bodies.rectangle(
          descriptor.x * mapUnitSize,
          descriptor.y * mapUnitSize,
          descriptor.w * mapUnitSize,
          descriptor.h * mapUnitSize,
          descriptor.options
        );
      } break;
      
      default : break;
    }
    
    //The index of this body, obtained after calling addBody
    var index = this.addBody(body, _index);
    
    // Add collision callbacks here
    // The reason for this is because in case we want to add/remove/replace bodies, 
    // indexes are needed before we can do so.
    
    var self = this;
    if(descriptor.breakable) {
      body.typeLabel = "breakblock";
      body.breakEnergy = descriptor.breakEnergy;
      
      //Add callback to be destroyed if collision is higher than "breakEnergy"
      body.collisionStartCallback = function(breakbody, otherbody, timestamp) {
        var bodyEnergy = 0.5*otherbody.mass*(otherbody.speed*otherbody.speed);
        if(bodyEnergy > breakbody.breakEnergy) {
          self.removeBody(breakbody.index);
        }
      };
    }
    
    //Return the index
    return index;
  }
  
  /**
    @param {Matter.Body} body : The body to be added
    @param {Integer} _index : (Optional) Mostly used when we want to replace a previous index
    
    @return {Integer} the index where the body was added
    */
  addBody(body, _index) {
    var index;
    if(_index !== undefined) {
      this.phyndex.set(_index, body);
      index = _index;
    }
    else {
      index = this.phyndex.add(body);
    }
    return index;
  }
  
  findBody(body) {
    return this.phyndex.find(body);
  }
  
  removeBody(index) {
    this.phyndex.remove(index);
  }
  removeBodyWithBody(body) {
    var index = this.phyndex.find(body);
    if(index != undefined) {
      this.phyndex.remove(index);
      return true;
    }
    else return false;
  }
  
  
  registerEngineForPlayerFloor() {
    var engine = this.phyndex.engine;
    var self = this;
    Matter.Events.on(engine, "afterUpdate", function(event) {
      for(var i = 0; i < self.players.length; i++) {
        var player = self.players[i];
        var body = self.getBody(player.bodyId);
        if(body.floorCount < 1) {
          //TODO: KILL PLAYER
          
          //TODO: SPAWN PLAYER
        }
      }
    });
  }
  registerEngineForForces() {
    var engine = this.phyndex.engine;
    var self = this;
    Matter.Events.on(engine, "beforeUpdate", function(event) {
      //console.log("Applying force");
      for(var i = 0; i < self.players.length; i++) {
        var player = self.players[i];
        var force = Matter.Vector.create(player.lastAccel.x,-player.lastAccel.y);
        var body = self.getBody(player.bodyId);
        Matter.Body.applyForce(body, body.position, force);
      }
    });
  }
  
  registerEngineForCollisions() {
    var engine = this.phyndex.engine;
    Matter.Events.on(engine, "collisionStart", function(event) {
    //   pairs : List of affected pairs
    //   timestamp Number : The engine.timing.timestamp of the event
    //   source : The source object of the event
    //   name : The name of the event
      var pairs = event.pairs;

      // change object colours to show those ending a collision
      for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];
        console.log("collision between "+pair.bodyA.typeLabel+" and "+pair.bodyB.typeLabel);
        
        if(pair.bodyA.collisionStartCallback) {
          pair.bodyA.collisionStartCallback(pair.bodyA, pair.bodyB, event.timestamp);
        }
        if(pair.bodyB.collisionStartCallback) {
          pair.bodyB.collisionStartCallback(pair.bodyB, pair.bodyA, event.timestamp);
        }
      }
    });
    Matter.Events.on(engine, "collisionEnd", function(event) {
      var pairs = event.pairs;
      // change object colours to show those ending a collision
      for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];
        console.log("collision end between "+pair.bodyA.typeLabel+" and "+pair.bodyB.typeLabel);
        if(pair.bodyA.collisionEndCallback) {
          pair.bodyA.collisionEndCallback(pair.bodyA, pair.bodyB, event.timestamp);
        }
        if(pair.bodyB.collisionEndCallback) {
          pair.bodyB.collisionEndCallback(pair.bodyB, pair.bodyA, event.timestamp);
        }
      }
    });
  }
  
  loadMap(map) {
    this.map = map;
    for(var mapDesc of map.floor) {
      mapDesc.type = "rectangle";
      mapDesc.options = {
        isStatic : true,
        isSensor : true,
        typeLabel : "floor",
        floorIncrement : 1
      };
      var index = this.createBodyWithDescriptor(mapDesc);
      //we have the index, but we don't really need it here...
    }
    for(var mapDesc of map.walls) {
      mapDesc.type = "rectangle";
      mapDesc.options = {
        isStatic : true,
        breakable : true,
        breakenergy : 4.5
      };
      var wallindex = this.createBodyWithDescriptor(mapDesc);
      //we have the index, but we don't really need it here...
    }
    console.log("loaded Map");
  }
}

module.exports = {
  Phyndex : Phyndex,
  FightOEngine : FightOEngine
}