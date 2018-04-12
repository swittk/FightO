//var {Phyndex, FightOEngine} = require('./Phyndex.js');

var client = new Colyseus.Client('ws://localhost:4000')//new Colyseus.Client('wss://fighto.herokuapp.com');

function nameSet() {
  var name = document.getElementById("nameInput").value;
  var now = (new Date()).getTime();
  client.setClientName(name, now);
  removeById("enternametostarttext");
  removeById("nameInput");
  removeById("buttonInput");
}
function removeById(id) {
  var element = document.getElementById(id);

  // A bit of robustness helps...
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

class FightOJSClient {
  constructor(roomname) {
    var self = this;
    this.buffer = [];
    this.self_id = null;
    this.fightEngine = new FightOEngine();
    this.room = client.join(roomname);
    
    this.room.onJoin.add(function() {
      console.log("joined successfully");
      self.fightEngine.createRenderTarget();
    });
    this.room.onUpdate.add(function(state) {
      if(!self.loadedObjectState) {
        self.loadInitialObjectState(state.objectState);
        self.room.send({type:'init'});
        self.loadedObjectState = true;
        console.log("map is "+JSON.stringify(state));
        self.startListeningToNewChanges();
      }
    });
//     self.startListeningToNewChanges();
    this.room.onData.add(function(message) {
      self.onData(message);
    });
    
    this.setUpdateRate(30);
  }
  
  startListeningToNewChanges() {
    var self = this;
    this.room.listen("objectState/:number", function(change){
      console.log("Operation :"+change.operation); // => "replace" (can be "add", "remove" or "replace")
      console.log("ID was "+change.path["number"]);
      //console.log(change.path["attribute"]); // => "y"
      console.log("value was"+JSON.stringify(change.value)); // => 1
      switch(change.operation) {
        case "add" : {
          //this.object;
          self.addObject(change.value, change.path["number"]);
        } break;
        case "remove" : {
          self.removeObject(change.path["number"]);
        } break;
      }
    })
  }
  
  onData(message) {
    console.log(message);
    switch(message.type) {
      case "AUM" : {
        this.buffer.push(message);
      } break;
      case "identify" : {
        console.log("identification received");
        this.self_id = message.payload;
      } break;
    }
  }
  
  sendInput(x, y) {
    this.room.send({type:'accel',x:x, y:y});
  }
  
  setClientName(name, now) {
    this.room.send({type:"nameset", name : name, ts : now});
  }
  
  loadInitialObjectState(objectState) {
    this.fightEngine.loadStateFromStateObject(objectState);
  }
  addObject(object) {
    this.fightEngine.setObject(object, object.id);
  }

  setUpdateRate (hz) {
    this.update_rate = hz;
    clearInterval(this.update_interval);
    var self = this;
    this.update_interval = setInterval (
      function () {
        self.update();
      },
      1000 / this.update_rate);
  }

  update () {
    this.processBuffer();
    if (!this.self_id) {
      return;
    }
    this.processInputs();
    this.interpolateOthers();
    this.adjustrendering();
  }
  processInputs () {}
  interpolateOthers () {}
  adjustrendering () {}

  processBuffer () {
    while (this.buffer.length) {
      //active update message
      var timestamp = this.buffer[0].timestamp;
      var updatelist = this.buffer[0].payload;
      this.buffer.splice(0,1);
      console.log("BUFFER" + this.buffer);
      var no_buffer = true;////////////////////////////////////////
      for (var item of updatelist) {
        if (no_buffer) {
          this.fightEngine.setPosition(item.idx, item.p.x, item.p.y);
          this.fightEngine.setVelocity(item.idx, item.v.x, item.v.y);
        }
        else {
          if (this.bodyId == item.idx) {
            // Received true position of this body from server in the past
            this.fightEngine.setPosition(item.idx, item.p.x, item.p.y);
            this.fightEngine.setVelocity(item.idx, item.v.x, item.v.y);
            //Server Reconciliation. Re-apply all inputs not yet processed by server
            var i = 0;
            while (i < this.pending_inputs.length) {
              var input = this.pending_inputs[i];
              if (input.input_sequence_number <= state.last_processed_input) {
                // Already processed. -> can safely drop pending inputs
                this.pending_inputs.splice (i,1);
              }
              else {
                // Not processed by server yet, Re-apply it.
                applyingput(input);
                i++;
              }
            }
          }
          else {

            // Add for interpolation
          }
        }
      }
    }
  }

  /*
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
  */

}


var client = new FightOJSClient("sample");


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

var gyrocaller;
function gyroRealCaller(data) {
  console.log(JSON.stringify(data));
  accelX = data.dm.gx		//( devicemotion event accelerationIncludingGravity x value )
  accelY = data.dm.gy		//( devicemotion event accelerationIncludingGravity y value )
  //data.dm.gz		( devicemotion event accelerationIncludingGravity z value )
  logGyro(accelX, accelY);
}
function gyroInitialCaller(data) {
  if(data.dm.gx == 0 && data.dm.gy == 0) {
    keyboardInput = true;
    gyrocaller = function(){};
    logOutput("gyroInitial got 0,0; setting gyrocaller to stupid blank")
  }
  else {
    gyrocaller = gyroRealCaller;
    logOutput("gyroRealCaller is set..")
  }
}
gyrocaller = gyroInitialCaller;

gn.init(gyroargs).then(function(){
  gn.start(function(data){
    gyrocaller(data);
  });
}).catch(function(e){
  // Catch if the DeviceOrientation or DeviceMotion is not supported by the browser or device
  console.log('no devicemotion present on device');
  console.log('should try keyboard input');
});
if(window.DeviceMotionEvent) {
  keyboardInput = false;
  logOutput("using device motion; keyboardInput = false;")
}
else {
  keyboardInput = true;
  logOutput("not using device motion; keyboardInput = true;")
}

window.addEventListener("keydown",
function(e){
  keys[e.key] = true;
}, false);
window.addEventListener('keyup',
function(e){
  keys[e.key] = false;
}, false);


var inputTimer = setInterval(function() {
  var ax = 0; var ay = 0;
  if(keyboardInput) {
    if(keys["ArrowDown"]) {ay -= 1;}
    if(keys["ArrowUp"]) {ay += 1;}
    if(keys["ArrowLeft"]) {ax -= 1;}
    if(keys["ArrowRight"]) {ax += 1;}
    accelX = ax; accelY = ay;
  }
  client.sendInput(accelX, accelY);
  logGyro(accelX, accelY);
}, 30);

function logOutput(message) {
  var output = document.getElementById("messagedisplay");
  output.innerHTML = output.innerHTML + message;
}

function logGyro(x, y) {
  var output = document.getElementById("accelDisplay");
  output.innerHTML = "accel ("+x+","+y+")";
}

logOutput("console:")