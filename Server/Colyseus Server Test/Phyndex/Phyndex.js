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

const forceScaling = 100.0;

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
  
  setAcceleration(index, x, y) {
    var player = this.getPlayerFromBodyId(index);
    if(!player)
      return false;
    player.lastAccel.x = x;
    player.lastAccel.y = y;
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

  getPlayerFromBodyId (index) {
    for (var player of this.players) {
      if (player.bodyId==index)
        return player;
    }
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
      var data = this.timeline.get
      for(var i = 0; i < self.players.length; i++) {
        var player = self.players[i];
//         console.log("player is "+JSON.stringify(player));
        var force = Matter.Vector.create(player.lastAccel.x*forceScaling,-player.lastAccel.y*forceScaling);
        

//TODO: Champ, tap force input here.        
//        var force = self.timeline.forceAtTime((new Date()).milliseconds());
        
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
      var player = this.getPlayerFromBodyId(bodyindex);
      var bodystats = {"idx":bodyindex, "p":body.position, "v":body.velocity, "a":player.lastAccel};
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

//    Doubly linkedlist for timeline
//    methods:
//    1. addValue (ts,val) //add obj(val) at timeline(ts) - [should round down to common denominator first to make it faster]
//          ts: timestamp (absolute milisecond)
//          val: object... which
//                  - each bodyindex [1,2,3,4] of
//                    - each property [a:,p:,v:] (as 0,1,2) of
//                      - each value {x:,y:}
//    2. getValue (ts) // get obj(val) at timeline(ts) - [If no obj at ts, return obj at latest time avaliable that less than ts; If no such obj return null]
//    3. removeUntil (ts) // set target at obj which maximally less or equal than ts; then remove data from timeline since start until before that obj without delete that obj
//             - intended to clearing the memories since older version of state is no use
//    4. size () // return number of nodes in linklist
//    5. printlist () // print linklist to console log
class LinkedList { // Timeline Doubly Linked List
  constructor () {
    this._head = null;
    this._tail = null;
    this._length = 0;
  }
  arrayHasOwnIndex(array, prop) {
    return array.hasOwnProperty(prop) && /^0$|^[1-9]\d*$/.test(prop) && prop <= 4294967294; // something for loop in array
  }
  nodeCreate (ts,val) {
      var temp = {};
      temp.ts = Number(ts); // to eliminate WTF events like javascript thinking that "ts" is string, so ("5" > "15") is "true" => wasted 6 hrs finding this bug.
      temp.data = val;
      temp.prev = null;
      temp.next = null;
      return temp;
  }
  findBound (ts) { // return maximum Node which (node.ts <= ts) // return null if no such node
    var iterator = this._head;
    while (iterator!==null) {
      if (ts < iterator.ts)
          return null; // as first node is (ts < iterator.ts), return null
      if (iterator.next===null)
        return iterator; // return this.tail -> maximum in this list, not yet (node.ts > ts)
      if (ts < iterator.next.ts)
        return iterator; // return the correct node since next node is (node.ts > ts)
      iterator = iterator.next;
    }
    return null; // no node avaliable, return null
  }
  addAtFront (ts, val) {
      var temp = this.nodeCreate(ts, val);
      if (this._head === null) { //This is first node
          this._head = temp;
          this._tail = temp;
      } else {
          if (this._head.ts==ts) {
              this._head.data = val;
              return;
          }
          temp.next = this._head;
          this._head.prev = temp;
          this._head = temp;
      }
      this._length++;
  }
  addAtBack (ts, val) {
      var temp = this.nodeCreate(ts, val);
      if (this._tail === null) { //This is first node
          this._tail = temp;
          this._head = temp;
      } else {
          if (this._tail.ts==ts) {
              this._tail.data = val;
              return;
          }
          temp.prev = this._tail;
          this._tail.next = temp;
          this._tail = temp;
      }
      this._length++;
  }
  removeAtFront () {
    var toReturn = null;
    if (this._head) {
      toReturn = this._head.data;
      if (this._tail===this._head) {
        this._head = null;
        this._tail = null;
      } else {
        this._head = this._head.next;
        this._head.prev = null;
      }
      this._length--;
    }
    return toReturn;
  }
  removeAtBack () {
    var toReturn = null;
    if (this._tail) {
      toReturn = this._tail.data;
      if (this._head===this._tail) {
        this._head = null;
        this._tail = null;
      } else {
        this._tail = this._tail.prev;
        this._tail.next = null;
      }
      this._length--;
    }
    return toReturn;
  }
  merge (node, val) {
    for (var key in val) {
      if (arrayHasOwnIndex(val, key)) {
          node[key] = {...node[key], ...val[key]};
      }
    }
  }
  addValue (ts,val) { // add new node at/just after ts
    var insert = this.findBound(ts);
    if (insert===null) 
        this.addAtFront(ts,val); // add new node at front
    else if (insert===this._tail)
        this.addAtBack(ts,val); // add new node at back
    else if (insert.ts===ts) {
        this.merge(insert, val); // found same ts => merge data
    } else {
        var temp = this.nodeCreate(ts, val);
        temp.prev = insert; // add new node inbetween
        temp.next = insert.next;
        temp.prev.next = temp;
        temp.next.prev = temp;
        this._length++;
    }
  }
  removeUntil (ts) { // remove unused node (until >= ts) for sake of freeing memory
      var target = this.findBound(ts);
      if (target===null)
          return; //mission complete
      if (target===this._head)
          return; //mission complete
      var iterator = target.prev;
      while (iterator!=this._head) {
          iterator = iterator.prev; // move to prev
          iterator.next.prev = null; // begin deconstruction at iterator.next node
          iterator.next.next = null;
          iterator.next.ts = null;
          iterator.next.data = null;
          iterator.next = null;
          this._length--;
      }
      this._head = target; // move head to target
      iterator.next = null; //begin deconstruction at iterator node
      iterator.ts = null;
      iterator.data = null;
      iterator.prev = null;
      iterator = null; // mission complete
      this._length--;
  }
  getValue (ts) { // get data (Object) that is ts maximally <=ts
      var find = this.findBound(ts);
      if (!find)
          return null;
      return find.data;
  }
  size () {
      return this._length;
  }
  printlist () {//test printing
      var iterator = this._head;
      var i=0;
      console.log(this._head)
      console.log(this._tail);
      console.log("LENGTH: " + this._length);
      while (iterator!==null) {
          console.log ("No." + (++i));
          console.log(iterator);
          if (iterator.next === null)
          break;
          iterator = iterator.next;
      }
  }
  stringify () {
    var payload = {};
    if (this._head!==null) {
      var iterator = this._head;
      while (true) {
          payload[iterator.ts] = iterator.data;
          if (iterator===this._tail)
            break;
          iterator = iterator.next;
      };
    }
    return JSON.stringify(payload);
  }
  parse (str) {
    var payload = JSON.parse(str);
    this.removeUntil(4294967294);
    this.removeAtFront();
    for (var key in payload) {
      if (this.arrayHasOwnIndex(payload, key)) {
        this.addValue(key, payload[key]);
      }
    }
  }
}

// Data object {core of every node} is
//     ActivebodyIDs [] = {
//         'p' = {x:,y:},
//         'v' = {x:,y:},
//         'a' = {x:,y:} };

// Timeline methods:
//
//        Constructor: (room, isServer) // isServer = true / false
//
//     1. set (rel_time)
//            setActiveMessage into relative time of timeline
//     2. set (rel_time, key, bodyidx, val)
//            set specific key into timeline
//            eg. set key 'a' in bodyidx by val{x:,y:}
//     3. get (rel_time)
//            get Data object from timeline at relative time
//     4. stringify ()
//            parse all timeline data into string
//     5. parse (string)
//            parse string into timeline

class Timeline {
  constructor (room, isServer) {
    this.room = room;
    this.isServer = isServer;
    // timeline is doubly linked list wtih methods:
    this.timeline = new LinkedList();

    this.com_dom = 20; //common denominator = 20 ms
    if (!this.isServer)
      setMessageSyncronization(); // set up receive message function 
  }
  
  setMessageSyncronization () { // add onData for message reciever
    this.room.onData.add( function (message) {
      if (message.type == 'TL') { // Timeline
        this.timeline.addValue(ts,val);
      }
    });
  }

  stringify () {
    return this.timeline.stringify();
  }

  parse (str) {
    this.timeline.parse(str);
  }

  clock_now () {
    return (new Date()).getTime();
  }

  roundToCM (number) { // round number to nearest common denominator
    return this.com_dom * Math.round(number*1.0/this.com_dom); 
  }

  relTime_to_Epoch (rel_time) { // change relative time to absolute time
    return this.roundToCM(this.clock_now() + rel_time);
  }

  bakeActiveIndex () { // return payload = ActiveUpdateMessages
    var payload = [];
    var iterator = this.phyndex.activeIndices.keys();
    var it;
    while (it = iterator.next(), !it.done) {
      var bodyidx = it.value;
      var body = this.phyndex.getBody(bodyidx);
      payload[bodyidx].p = body.position; // {x,y}
      payload[bodyidx].v = body.velocity; // {x,y}
    }
    return payload;
  }

  get_ts (rel_time) {
    return this.relTime_to_Epoch(rel_time);
  }

  set (rel_time, key, bodyidx, val) { // if (one argument) {setActiveMessage}  else {set specific key} eg. set key 'a' in bodyidx in val
    var abs_time; // get absolute time
    var payload = [];
    if (key===undefined) { // if only one argument
      abs_time = this.relTime_to_Epoch(rel_time);
      payload = bakeActiveIndex(); // payload = AUM
    } else { // else have 4 arguments
      abs_time = rel_time;
      payload[bodyidx] = {[key]: val}; // payload = specific value
    }
    this.timeline.addValue(abs_time, payload); // merge payload into timeline
    if (this.isServer)
      this.room.broadcast({type:'TL',ts:abs_time,val:payload}); // broadcast to all clients
  }

  get (rel_time) {
    var abs_time = this.relTime_to_Epoch(rel_time); // get absolute time
    return this.timeline.getValue(abs_time); // return data object from timeline
  }
  
}