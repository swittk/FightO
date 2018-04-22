// Engine rewinder thing

const mapUnitSize = 15;
const playerDiameter = 2; //player diameter in units

const forceScaling = 20.0;

const {Phyndex, FightOEngine, FightOMessage} = require('./Phyndex.js');

if ( typeof Matter !== 'undefined' && Matter ) {
  //do stuff if Matter is defined and not null
}
else {
  Matter = require('matter-js');
}

var replayEngine = 

var startingStateObject = {};
replayEngine.loadStateFromStateObject(startingStateObject);



class Timeline {
  constructor(id) {
  }
  
  firstTimestamp() {
    //return first timestamp
  }
  
  lastTimestamp() {
    //return last timestamp
  }
  
  addData(timestamp, data) {
    this.timestamp = timestamp;
    this.data = data;
  }
}

class SnapManager {
  constructor() {
    this.lastTimestamp = undefined;
    this.frames = {};
    this.snapInterval = 50; //50 ms
  }
  
  at(timestamp) {
    
  }
  
  addFrame(frame, timestamp) {
    var timestamp = frame.timestamp;
    
  }
}

class ReplayEngine {
  constructor(startingState) {
    this.gameEngine = new FightOEngine();
    this.gameEngine.loadStateFromStateObject(startingState);
  }
  
  rewindStartFrom(timestamp) {
    
  }
}