var client = new Colyseus.Client('ws://localhost:4000');


var room = client.join("sample");

room.onUpdate.add(function(state) {
  console.log(room.name, "has new state:", state)
})


var accelX = 0; var accelY = 0;

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