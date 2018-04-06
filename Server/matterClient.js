// ==================================================================
// Constants
// ==================================================================
const playerDiameter = 10;
const mapUnitSize = 15;
var loadedMap = false;
var isLoadingMap = false;
var accelX = 0; var accelY = 0;


// ==================================================================
// New Entity in the world
// ==================================================================
var Entity = function (_status) {
    
    var matterOpts = {
        frictionStatic: 0,
        friction: 0,
        frictionAir: 0.005,
        restitution: 1,
        label: "player", // label = type of body
        floorCount: 0,
        isStatic: false
    }
    
    this.label = "player";
    this.labelname = _status.name;
    this.spawnPosition = Matter.Vector.crete(_status.spawn.x,_status.spawn.y);
    this.size = _status.diameter/2.0;
    this.accelMultiplier = _status.accelMultiplier || 1;
    this.floorcount = 0;

    this.body = Matter.Bodies.circle(this.spawnPosition.x, this.spawnPosition.y, this.size, matterOpts);
    Matter.Body.setMass(this.body, _status.mass || 2000);

    this.state_buffer = [];
}

Entity.prototype.applyForce = function (x,y) {
    var Force = Matter.Vector.create(x*this.accelMultiplier, y*this.accelMultiplier);
    Matter.Body.applyForce (this.body, this.body.position,Force);
}

Entity.prototype.killPlayer = function () {
    Matter.World.remove(engine.world, this.body);
    console.log("You died");
}

Entity.prototype.spawnPlayer = function (x, y) {
    if(x !== undefined && y !== undefined)
        this.body.setPosition (x, y);
    else
        this.body.setPosition (this.spawnPosition.x, this.spawnPosition.y);
    this.floorCount = 0;
    this.spawnTimer = 0;
    this.spawnComplete = false;
    this.startSpawnStamp = engine.timing.timestamp;
    console.log('start stamp of '+this.startSpawnStamp);
    console.log('Start position at '+this.position.x +','+this.position.y);
    this.body.setVelocity (0, 0);
    Matter.World.add(engine.world, p);
}

// ==================================================================
// World setting (Client)
// ==================================================================
var World = function (status) {

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
    for(var mapDesc of level.floor) {
      var floor = newFloorPiece(mapDesc.x, mapDesc.y, mapDesc.w, mapDesc.h);
      Matter.World.add(engine.world, floor);
    }
    for(var mapDesc of level.walls) {
      var wall = newWallPiece(mapDesc.x, mapDesc.y, mapDesc.w, mapDesc.h);
      if(mapDesc.breakable) {
        wall.label = "breakblock";
        wall.render.fillStyle = '#C7F464';
        wall.breakenergy = mapDesc.breakenergy;
      }
      Matter.World.add(engine.world, wall);
    }
  }
  

// ==================================================================
// New Matter Engine
// ==================================================================
var engine = Matter.Engine.create();
engine.world.gravity = Matter.Vector.create(0,0);

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

Matter.Engine.run(engine);
Matter.Render.run(render);
  
// ==================================================================
// Input
// ==================================================================
var keys = {};
var keyboardInput = false;
var gyroargs = {
	frequency:50,					// ( How often the object sends the values - milliseconds )
	gravityNormalized:false,			// ( If the gravity related values to be normalized )
	orientationBase:GyroNorm.WORLD,		// ( Can be GyroNorm.GAME or GyroNorm.WORLD. gn.GAME returns orientation values with respect to the head direction of the device. gn.WORLD returns the orientation values with respect to the actual north direction of the world. )
	decimalCount:2,					// ( How many digits after the decimal point will there be in the return values )
	logger:null,					// ( Function to be called to log messages from gyronorm.js )
	screenAdjusted:false			// ( If set to true it will return screen adjusted values. )
};
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
      keys[e.key] = true;
    }, false);
  window.addEventListener('keyup',
    function(e){
      keys[e.key] = false;
    }, false);
});

var inputTimer = setInterval(function() {
  var ax = 0; var ay = 0;
  if(keyboardInput) {
    if(keys["ArrowDown"]) {ay -= 1;}
    if(keys["ArrowUp"]) {ay += 1;}
    if(keys["ArrowLeft"]) {ax -= 1;}
    if(keys["ArrowRight"]) {ax += 1;}
  }
  accelX = ax; accelY = ay;
  room.send({type:'accel',x:accelX, y:accelY});
}, 30);

// ==================================================================
// Server connection setup
// ==================================================================
var client = new Colyseus.Client('ws://localhost:4000')//new Colyseus.Client('wss://fighto.herokuapp.com');
var room = client.join("sample");

room.onUpdate.add(function(state) {
    //console.log(room.name, "has new state:", state)
    if(!loadedMap && !isLoadingMap) {
      isLoadingMap = true;
      loadLevel(state.map);
      spawnPlayer(player);
      loadedMap = true;
    }
    Matter.Body.setPosition(player, Matter.Vector.create(state.position.x, state.position.y));
  })

