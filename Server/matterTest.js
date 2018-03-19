//const Matter = require('matter-js');

var engine = Matter.Engine.create();

const playerDiameter = 10;
const mapUnitSize = 15;


function newPlayer(x, y) {
  var player = Matter.Bodies.circle(x*mapUnitSize, y*mapUnitSize, playerDiameter/2.0, {frictionAir : 0.7, isStatic: false});
  return player;
}

function newSquareWall(x,y,w,h) {
  var ox = x + w/2;
  var oy = y + h/2;
  var wall = Matter.Bodies.rectangle(ox*mapUnitSize, oy*mapUnitSize, w*mapUnitSize, h*mapUnitSize, {isStatic : true});
  console.log("added wall "+wall);
  return wall;
}

var sampleLevel = {
  "floor" : [
    {x:0,y:0,w:100,h:100,surf:"grass"}
  ],
  "map" : [
    {x:1,y:1,w:1,h:1,surf:"grass"},
    {x:1,y:2,w:1,h:2,surf:"stone"}
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



function loadLevel(level) {
  for(mapDesc of level.map) {
    var wall = newSquareWall(mapDesc.x, mapDesc.y, mapDesc.w, mapDesc.h);
    Matter.World.add(engine.world, wall);
  }
}


var renderOpts = {
  width: 800,
  height: 600,
  pixelRatio: 1,
  background: '#fafafa',
  wireframeBackground: '#222',
  hasBounds: false,
  enabled: true,
  wireframes: true,
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
var player = newPlayer(10,10);
Matter.World.add(engine.world, player);

Matter.Engine.run(engine);
Matter.Render.run(render);


var accelX = 0; var accelY = 0;

function handleMotionEvent(event) {
    accelX = event.accelerationIncludingGravity.x;
    accelY = event.accelerationIncludingGravity.y;
    //var z = event.accelerationIncludingGravity.z;
    // Do something awesome.
}

Matter.Events.on(engine, "beforeUpdate", function() {
  Matter.Body.applyForce(player, player.position, Matter.Vector.create(0.0001*accelX,0.0001*accelY));
  //console.log("x is "+accelX+", y is "+accelY);
  console.log("called me")
});

window.addEventListener("devicemotion", handleMotionEvent, true)