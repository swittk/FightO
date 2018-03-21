//const Matter = require('matter-js');

var engine = Matter.Engine.create();
engine.world.gravity = Matter.Vector.create(0,0);

const playerDiameter = 10;
const mapUnitSize = 15;
const N_Player = 4; // number of players
var player = [];

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
    {x:0, y:0},  // Player 0 spawnpoints
    {x:10, y:10}, // Player 1 spawnpoints
    {x:35, y:10},
    {x:10, y:30},
    {x:35, y:30}
  ] // corrected by champ according to new map
}

var keyLegendGlobal = [];
keyLegendGlobal[1] = ["KeyW","KeyS","KeyA","KeyD"];
keyLegendGlobal[2] = ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"];
keyLegendGlobal[3] = ["KeyI","KeyK","KeyJ","KeyL"];
keyLegendGlobal[4] = ["Numpad5","Numpad2","Numpad1","Numpad3"];

var directionLegend = [];
directionLegend[0] = {x:0, y:1};  //Up
directionLegend[1] = {x:0, y:-1}; //Down
directionLegend[2] = {x:-1, y:0}; //Left
directionLegend[3] = {x:1, y:0};  //Right

function newPlayer(pname) {
  var varPlayer = Matter.Bodies.circle(sampleLevel.spawnpoints[pname].x*mapUnitSize, sampleLevel.spawnpoints[pname].y*mapUnitSize, playerDiameter/2.0, {
    frictionStatic: 0,
    friction: 0,
    frictionAir: 0.005,
    restitution: 1,
    label: "player", // label = type of body
    floorCount: 0,
    isStatic: false
  });
  varPlayer.labelname = pname; // pname = {1,2,3,4}
  varPlayer.spawnX = sampleLevel.spawnpoints[pname].x; // location from sample level spawnpoints array
  varPlayer.spawnY = sampleLevel.spawnpoints[pname].y;
  var temp_keyLegend = [];
  for (var i = 0; i < N_Player; i++){
    var temp_keyType = {};                       // Set direction {  0,   1,   2,   3   } as
    temp_keyType.key = keyLegendGlobal[pname][i];           // Key:  Up  Down Left Right
    temp_keyType.moveX = directionLegend[i].x;            // moveX:  0    0   -1    1
    temp_keyType.moveY = directionLegend[i].y;            // moveY:  1   -1    0    0
    temp_keyLegend[i] = temp_keyType;
  }
  varPlayer.keyLegend = temp_keyLegend;
  Matter.Body.setMass(varPlayer,2000); // Set mass to 2000
  console.log(varPlayer);
  return varPlayer;
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

function loadLevel(level) {
  for(mapDesc of level.floor) {
    var floor = newFloorPiece(mapDesc.x, mapDesc.y, mapDesc.w, mapDesc.h);
    Matter.World.add(engine.world, floor);
  }
  for(mapDesc of level.walls) {
    var wall = newWallPiece(mapDesc.x, mapDesc.y, mapDesc.w, mapDesc.h);
    if(mapDesc.breakable) {
      wall.label = "breakblock";
      wall.render.fillStyle = '#C7F464';
      wall.breakenergy = mapDesc.breakenergy;
    }
    Matter.World.add(engine.world, wall);
  }
}

function killPlayer(pName) {
  Matter.World.remove(engine.world, player[pName]);
  console.log("You died");
}

function spawnPlayer(pName, x, y) {
  var setSpawnX, setSpawnY;
  if(x !== undefined && y !== undefined) {
    setSpawnX = x*mapUnitSize;
    setSpawnY = y*mapUnitSize;
  }
  else {
    setSpawnX = sampleLevel.spawnpoints[pName].x*mapUnitSize;
    setSpawnY = sampleLevel.spawnpoints[pName].y*mapUnitSize;    
  }
  player[pName].floorCount = 0;
  player[pName].spawnTimer = 0;
  player[pName].spawnComplete = false;
  player[pName].startSpawnStamp = engine.timing.timestamp;
  Matter.Body.setPosition(player[pName], Matter.Vector.create(setSpawnX,setSpawnY));
  Matter.Body.setVelocity(player[pName], Matter.Vector.create(0,0));
  console.log('start stamp of '+player[pName].startSpawnStamp);
  console.log('Start position at '+player[pName].position.x +','+player[pName].position.y);
  Matter.World.add(engine.world, player[pName]);
}

var renderOpts = {
  width: 800,
  height: 600,
  pixelRatio: 1,
  background: '#fafafa',
  wireframeBackground: '#222',
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
    engine: engine,
    options: renderOpts
});

loadLevel(sampleLevel);
for (var i = 1; i <= N_Player; i++) {
  player[i] = newPlayer(i);
  spawnPlayer(i);
}
Matter.Engine.run(engine);
Matter.Render.run(render);

var gyroargs = {
	frequency:50,					// ( How often the object sends the values - milliseconds )
	gravityNormalized:false,			// ( If the gravity related values to be normalized )
	orientationBase:GyroNorm.WORLD,		// ( Can be GyroNorm.GAME or GyroNorm.WORLD. gn.GAME returns orientation values with respect to the head direction of the device. gn.WORLD returns the orientation values with respect to the actual north direction of the world. )
	decimalCount:2,					// ( How many digits after the decimal point will there be in the return values )
	logger:null,					// ( Function to be called to log messages from gyronorm.js )
	screenAdjusted:false			// ( If set to true it will return screen adjusted values. )
};

var keyboardInput = false;

var keyLegends = {
  
};

var keys = {};

var gn = new GyroNorm();
gn.init(gyroargs).then(function(){
  gn.start(function(data){
   accelX = data.dm.gx		//( devicemotion event accelerationIncludingGravity x value )
   accelY = data.dm.gy		//( devicemotion event accelerationIncludingGravity y value )
   //data.dm.gz		( devicemotion event accelerationIncludingGravity z value )
  });
}).catch(function(e){
  // Catch if the DeviceOrientation or DeviceMotion is not supported by the browser or device
  console.log('no devicemotion present on device');
  console.log('should try keyboard input');
  keyboardInput = true;
  window.addEventListener("keydown",
    function(e){
      keys[e.code] = true;
    }, false);
  window.addEventListener('keyup',
    function(e){
<<<<<<< HEAD
=======
      keys[e.code] = false;
    }, false);/*
});*/
>>>>>>> cb451d805c0bc5416ae84f72467869f92bde77d7



Matter.Events.on(engine, "afterUpdate", function(event) {
  //console.log('Total floorcount : '+player.floorCount);
  for (var i = 1; i <= N_Player; i++) {
    if(player[i].spawnComplete == false) {
      console.log('position at '+player[i].position.x +','+player[i].position.y);
      //console.log('now stamp '+event.timestamp);
      if(event.timestamp - player[i].startSpawnStamp > player[i].spawnTimer) {
        player[i].spawnComplete = true;
        console.log('completed spawn');
      }
    }
    else if(player[i].floorCount < 1) {
      console.log("Player " + i + " : killed");
      killPlayer(i);
      spawnPlayer(i);
    }
  }
});

Matter.Events.on(engine, "beforeUpdate", function(event) {
  var accelX, accelY;
  if(keyboardInput) {
    for (var i = 1; i <= N_Player; i++) { // loop player 1 to 4
      accelX = 0;
      accelY = 0;
      for (var j = 0; j < 4; j++) { // loop key legend "up" "down" "left" "right"
        if (keys[player[i].keyLegend[j].key]) { // check if key legend pressed
          accelX += player[i].keyLegend[j].moveX; // add "+1" or "-1" [according to key legend j of player i] into accelX
          accelY += player[i].keyLegend[j].moveY; // add "+1" or "-1" [according to key legend j of player i] into accelY
        }
      }
      //console.log("ax and ay are "+accelX+","+accelY);
      Matter.Body.applyForce(player[i], player[i].position, Matter.Vector.create(accelX,-accelY));
    }
  }
});

function bodyEnergy(body) {
  return 0.5*body.mass*Math.pow(body.speed,2);
}
function logPlayerCollision(body) {
  console.log("energy:"+bodyEnergy(body)+".vel:"+body.velocity+".mass:"+body.mass);
}


Matter.Events.on(engine, "collisionStart", function(event) {
//   pairs : List of affected pairs
//   timestamp Number : The engine.timing.timestamp of the event
//   source : The source object of the event
//   name : The name of the event
  var pairs = event.pairs;

  // change object colours to show those ending a collision
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i];
    console.log("collision between "+pair.bodyA.label+" and "+pair.bodyB.label);
    
    if(pair.bodyA.label == "player") {
      if(pair.bodyB.label == "breakblock") {
        logPlayerCollision(pair.bodyA);
        if(bodyEnergy(pair.bodyA) > pair.bodyB.breakenergy) {
          Matter.World.remove(engine.world, pair.bodyB);
        }
      }
      else if(pair.bodyB.isFloor) {
        player[pair.bodyA.labelname].floorCount++;
        console.log('added floor');
      }
    }
    else if(pair.bodyB.label == "player") {
      if(pair.bodyA.label == "breakblock") {
        logPlayerCollision(pair.bodyB);
        if(bodyEnergy(pair.bodyB) > pair.bodyA.breakenergy) {
          Matter.World.remove(engine.world, pair.bodyA); 
        }
      }
      else if(pair.bodyA.isFloor) {
        player[pair.bodyB.labelname].floorCount++;
        console.log('added floor');
      }
    }
  }
});

Matter.Events.on(engine, "collisionEnd", function(event) {
  var pairs = event.pairs;
  // change object colours to show those ending a collision
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i];
    console.log("collision end between "+pair.bodyA.label+" and "+pair.bodyB.label);
    if(pair.bodyA.label == "player") {
      if(pair.bodyB.isFloor) {
        player[pair.bodyA.labelname].floorCount--;
        console.log('removed floor');
      }
    }
    else if(pair.bodyB.label == "player") {
      if(pair.bodyA.isFloor) {
        player[pair.bodyB.labelname].floorCount--;
        console.log('removed floor');
      }
    }
  }
});