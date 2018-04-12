/**
  Body specification rules.
  
  Types for collisions, etc. will be specified using a property called 
  - "typeLabel"
  
  Collision processing is to be done using 2 callbacks specified as properties on bodies
  - "collisionStartCallback", and
  - "collisionEndCallback"
*/
var root = this; 
// Create a reference to this
var _ = new Object();
var isNode = false;
// Export the Underscore object for **CommonJS**, with backwards-compatibility
// for the old `require()` API. If we're not in CommonJS, add `_` to the
// global object.
if (typeof module !== 'undefined' && module.exports) {
        module.exports = _;
        root._ = _;
        isNode = true;
} else {
        root._ = _;
}

const mapUnitSize = 15;
const playerDiameter = 2; //player diameter in units

const forceScaling = 20.0;

const MessageType_ActiveUpdateMessage = "AUM";


if ( typeof Matter !== 'undefined' && Matter )
{
  //do stuff if Matter is defined and not null
}
else {
  Matter = require('matter-js');
}

function FightOMessage(type, payload) {
  this.type = type;
  
  //getTime returns epoch time in milliseconds (an integer)
  this.timestamp = (new Date()).getTime();
  this.payload = payload;
}

function ActiveUpdateMessage(items) {
  FightOMessage.call(this, MessageType_ActiveUpdateMessage, items);
}
extend(FightOMessage, ActiveUpdateMessage);


class GameObjectDesc {
  constructor(bodyd, assetd, active) {
    this.bodyd = bodyd;
    this.assetd = assetd;
    this.active = active;
    this.position = {x : this.bodyd.x, y : this.bodyd.y };
  }
}


class Phyndex {
  constructor(engine) {
    this.lastIndex = -1;
    if(!engine) {
      this.engine = Matter.Engine.create();
    }
    else {this.engine = engine;}
    this.indices = {};
  }
  
  lastIndex() { return this.lastIndex; }
  newIndex() {
    this.lastIndex++;
    while(this.lastIndex in this.indices) {this.lastIndex++;}
    return this.lastIndex;
  }
  
  /**
    @return {Integer} index : The index added.
  */
  add(body) {
    Matter.World.add(this.engine.world, body);
    var index = this.newIndex();
    body.index = index;
    this.indices[index] = body;
    return index;
  }
  
  /**
    @return undefined
  */
  remove(index) {
    var body = this.indices[index];
    delete body.index;
    Matter.World.remove(this.engine.world, body);
    delete this.indices[index];
  }
  
  /**
    @param {Integer} index The index of the body
    @return {Matter.Body} The body with the index
  */
  get(index) { return this.indices[index]; }
  
  /** Alternative to Phyndex.has*/
  exists(index) { return this.has(index); }
  /** @return {boolean} If there is a body with the index specified*/
  has(index) { return index in this.indices; }
  
  /** 
    Adds the body to the world, replacing the index if it was in use
   */
  set(index, body) {
    if(this.has(index)) { this.remove(index); }
    
    Matter.World.add(this.engine.world, body);
    body.index = index;
    this.indices[index] = body;
    //console.log("added body "+JSON.stringify(body)+" to index "+index);
    return index;
  }
  
  find(body) {
    //convert entries ( iterator[[key, value]] ) to array
    var array = this.indices.keys;
    
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
    - Retrieve(Create/Update)Delete : getBody, setBody, removeBody
    - findBody to get index as needed.
  - createBodyWithDescriptor(descriptor, _index)
    - Creates AND adds body with descriptor to the world
    ** Implement all map body descriptor parsing here
  
  - Convenience methods to set & get body properties by index
    - Setters *** These functions are only able to be called once object is set as active!
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
  
  - Communication
    - setObjectAsActive(index), setObjectAsInactive(index) : Adds and removes indices of objects to be tracked
    - getActiveIndices() : Returns the currently tracked active indices.
    - createActiveUpdateMessage()
      - Creates an "active update message"; all the states of the bodies with indices added
      as "active"
    
    - "State Object" : stateObject -- A property of the engine
      - Contains a list of objects in the game
      - Used as "objectState" of the colyseus game room's state.
      
      - In order to load stateObject initially (useful mostly on the client side, 
      when starting, in order to populate the map)...
        Call this function --> loadStateFromStateObject(stateObject);
  
  - Debug/Display
    - createRenderTarget()
      - Call this to render the engine using Matter's default Renderer to the HTML document body
  */
class FightOEngine {
  constructor(engine) {
    if(!engine) {
      this.engine = Matter.Engine.create();
    }
    else this.engine = engine;    
    this.phyndex = new Phyndex(this.engine);    
    this.players = [];
    
    this.activeIndices = new Map();
    
    this.engine.world.gravity = Matter.Vector.create(0,0);
    this.registerEngineForPlayerFloor();
    this.registerEngineForForces();
    this.registerEngineForCollisions();
    
    this.stateObject = {};
    this.stateObjectIndex = 0;
  }
  
  step(dt) {
    //console.log("stepping..");
    this.phyndex.step(dt);
  }
  
  getBodyIfObjectIsActive(index) {
    var object = this.stateObject[index];
    if(!object) {console.log("no object"); return undefined;}
    if(!object.active) {console.log("cannot set value to inactive object"); return undefined;}
    return this.getBody(index);
  }
  
  setPosition(index, x, y) {
    var body = this.getBodyIfObjectIsActive(index); if(!body) return false; Matter.Body.setPosition(body, Matter.Vector.create(x, y));
    return true;
  }
  
  setVelocity(index, x, y) {
    var body = this.getBodyIfObjectIsActive(index); if(!body) return false; Matter.Body.setVelocity(body, Matter.Vector.create(x, y));
    return true;
  }
  
  setAngle(index, a) {
    var body = this.getBodyIfObjectIsActive(index); if(!body) return false; Matter.Body.setAngle(body, a);
    return true;
  }
  
  setAngularVelocity(index, w) {
    var body = this.getBodyIfObjectIsActive(index); if(!body) return false; Matter.Body.setAngularVelocity(body, w);
    return true;
  }
  
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
    
    var playerCreationDesc = {
      bodyd : {
        type:"circle", x:x, y:y, r:r,
        options: {
          typeLabel:"player",
          floorCount : 0,
          restitution: 0.6,
          collisionStartCallback:startcallback,
          collisionEndCallback:endcallback
        }
      },
      assetd : {
        type : "playerBall"
      },
      active : true
    };
    
    var bodyIndex = this.addObject(playerCreationDesc);
    var player = new FightOPlayer(name, bodyIndex);
    console.log("created player");
    this.players.push(player);
    console.log("pushed player");
    return player;
  }
  
  playerCanJoin(player) {
    //TODO: insert custom behaviour here
    if(this.players.length < this.map.spawnpoints.length) {
      return true;
    }
  }
    
  /**
    @param descriptor {Object} : Object descriptor
    @param index {Integer} Index to be used 
  */
  createBodyWithDescriptor(descriptor, index) {
    var body;
    
    var options = descriptor.options;
    
    //TODO: add code to generate types of bodies here
    switch(descriptor.type) {
      case "circle" : {
        body = Matter.Bodies.circle(
          descriptor.x * mapUnitSize, 
          descriptor.y * mapUnitSize, 
          descriptor.r * mapUnitSize, 
          options
        );
      } break;
      case "rectangle" : {
        var ox = descriptor.x + descriptor.w/2;
        var oy = descriptor.y + descriptor.h/2;
        body = Matter.Bodies.rectangle(
          ox * mapUnitSize,
          oy * mapUnitSize,
          descriptor.w * mapUnitSize,
          descriptor.h * mapUnitSize,
          options
        );
      } break;
      
      default : break;
    }
    
    //setBody used to set body's index...
    this.setBody(body, index);
    
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
  
  addObject(object) {
    //create
    this.stateObjectIndex++;
    var index = this.stateObjectIndex;
    this.stateObject[index] = object;
    object.id = index;
    this.createBodyWithDescriptor(object.bodyd, index);
    if(object.active) {
      this.setObjectAsActive(index, true);
    }
    return index;
  }
  setObject(object, index) {
    //update
    object.id = index;
    this.stateObject[index] = object;
    this.createBodyWithDescriptor(object.bodyd, index);
    if(object.active) {
      this.setObjectAsActive(index, true);
    }
  }
  retrieveObject(index) {
    return this.stateObject[index];
  }
  
  setObjectAsActive(index) {
    var obj = this.stateObject[index];
    if(obj) {
      obj.active = true; 
      this.activeIndices.set(index, true);
      return true;
    }
    return false;
  }
  setObjectAsInactive(index) {
    var obj = this.stateObject[index];
    if(obj) {
      obj.active = true; 
      this.activeIndices.delete(index);
      return true;
    }
    return false;
  }
  
  setObjectPosition(index, x, y) {
    obj.position.x = x;
    obj.position.y = y;
  }
  
  removeObject(index) {
    var obj = this.stateObject[index];
    if(!obj) {return false;}
    delete this.stateObject[index];
    return true;
  }
  
  /**
    @param {Matter.Body} body : The body to be added
    @param {Integer} _index : (Optional) Mostly used when we want to replace a previous index
    
    @return {Integer} the index where the body was added
    */
  addBody(body, _index) {
    console.log("WARNING : EXTREME BUG. DO NOT CALL ADDBODY ON SERVER")
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
  
  setBody(body, index) {
    this.phyndex.set(index, body);
    return index;
  }
  
  findBody(body) {
    return this.phyndex.find(body);
  }
  
  removeBody(index) {
    this.removeActive(index); //Don't forget to remove this body from the active list :)
    this.phyndex.remove(index);
  }
  removeBodyWithBody(body) {
    var index = this.phyndex.find(body);
    if(index != undefined) {
      this.remove(index);
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
//         console.log("player is "+JSON.stringify(player));
        var force = Matter.Vector.create(player.lastAccel.x*forceScaling,-player.lastAccel.y*forceScaling);
        var body = self.getBody(player.bodyId);
//         console.log("body is "+JSON.stringify(body));
        console.log("force is " + JSON.stringify(force));
        try {
          Matter.Body.applyForce(body, body.position, force);
        }
        catch(error) {
          console.log("can't apply force error "+error);
        }
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
    this.parseMapToStateObjectAndLoad(map);
    console.log("loaded Map");
  }
  
  parseMapToStateObjectAndLoad(map) {
    for(var object of map.floor) {
      var bodyd = object.bodyd;
      
      var options = {
        isStatic : true,
        isSensor : true,
        typeLabel : "floor",
        floorIncrement : ((object.floorIncrement !== undefined) ? object.floorIncrement : 1)
      };
      bodyd.options = options;
      
      var assetd = object.assetd;
      
      var isActive = object.isActive ? true : false;
      this.addObject(new GameObjectDesc(bodyd, assetd, isActive));
    }
    for(var object of map.wall) {
      var bodyd = object.bodyd;
      var assetd = object.assetd;
      var options = {
        isStatic : true,
        typeLabel : "wall"
      }
      bodyd.options = options;
      var isActive = object.isActive ? true : false;
      this.addObject(new GameObjectDesc(bodyd, assetd, isActive));
    }
  }
  
  //useful for client side
  loadStateFromStateObject(stateObject) {
    for(var id in stateObject) {
      var object = stateObject[id];
      this.addObject(object);
    }
  }
  
  addActive(index) {
    console.log("addActive not supposed to be call")
    this.activeIndices.set(index, true);
  }
  removeActive(index) {
    console.log("removeActive not supposed to be call")
    this.activeIndices.delete(index);
  }
  getActiveIndices() {
    return Array.from(this.activeIndices.keys());
  }
    
  createActiveUpdateMessage() {    
    var items = [];
    var iterator = this.activeIndices.keys();
    var item;
    while (item = iterator.next(), !item.done) {
      var bodyindex = item.value;
      var body = this.getBody(bodyindex);
      var bodystats = {"idx":bodyindex, "p":body.position, "v":body.velocity};
      items.push(bodystats);
    }
    
    return new ActiveUpdateMessage(items);
  }
  
  
  createRenderTarget() {
    var renderOpts = {
      width: 800, height: 600,
      pixelRatio: 1, 
      background: '#fafafa', wireframeBackground: '#222',
      hasBounds: false,
      enabled: true,
      wireframes: false,
      showSleeping: true,
      showDebug: false,
      showBroadphase: false,
      showBounds: false,
      showVelocity: false,
      showCollisions: false,
      showSeparations: false,
      showAxes: false,
      showPositions: false,
      showAngleIndicator: false,
      showIds: false,
      showShadows: false,
      showVertexNumbers: false,
      showConvexHulls: false,
      showInternalEdges: false,
      showMousePosition: false
    }

    var render = Matter.Render.create({
        element: document.body,
        engine: this.engine,
        options: renderOpts
    });
    
    Matter.Render.run(render);
  }
}

if(isNode) {
  module.exports = {
    Phyndex : Phyndex,
    FightOEngine : FightOEngine,
    FightOMessage : FightOMessage,
    ActiveUpdateMessage : ActiveUpdateMessage
  }
}

function extend(base, sub) {
  // Avoid instantiating the base class just to setup inheritance
  // Also, do a recursive merge of two prototypes, so we don't overwrite 
  // the existing prototype, but still maintain the inheritance chain
  // Thanks to @ccnokes
  var origProto = sub.prototype;
  sub.prototype = Object.create(base.prototype);
  for (var key in origProto)  {
     sub.prototype[key] = origProto[key];
  }
  // The constructor property was set wrong, let's fix it
  Object.defineProperty(sub.prototype, 'constructor', { 
    enumerable: false, 
    value: sub 
  });
}
