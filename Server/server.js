const { Room, Server } = require('colyseus');

const Matter = require('matter-js');


/**
Properties
==========
clients: WebSocket[]
  The array of connected clients. See Web-Socket Client.

maxClients: number

clock: ClockTimer
  A ClockTimer instance, used for timing events

Methods
=======
lock ()
  Locking the room will remove it from the pool of available rooms for new clients to connect to.

unlock ()
  Unlocking the room returns it to the pool of available rooms for new clients to connect to.

send (client, data)
  Send data to a particular client.

setState (object)
  Set the new room state
  * Call this method only once (on Room.onInit()) in your room handler
  * Do not call this method for updates in the room state. 
  * The binary patch algorithm is re-set every time you call it.

broadcast ( data )
  Send raw data to all connected clients
  e.g.
    Server : this.broadcast({ message: "Hello world!" });
    Client :  room.onData.add(function(data) {
                console.log(data); // => {message: "Hello world!"}
              });

disconnect ()
  Disconnect all clients, then dispose
*/

class FightOGame extends Room {
  // When room is initialized
  onInit (options) {
    this.engine = Matter.Engine.create();
    
    //Set patch rate in milliseconds, default is 50
    //this.setPatchRate(50);
    
    //max number of clients
    this.maxClients = 4;
    
    //Colyseus's clock timer; use this instead of standard setTimeout and setInterval
    //this.clock
    
    notsynched = 20;
  }
  
  // Checks if a new client is allowed to join. (default: `return true`)
  requestJoin (options/**any*/, isNew/**boolean*/) {
    
  }

  // When client successfully join the room
  onJoin (client/**Client*/) {
    
  }

  // When a client leaves the room
  onLeave (client/**Client*/) {
  }

  // When a client sends a message
  onMessage (client/**Client*/, data/**any*/) {
  }

  // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
  onDispose () {
  }
}



var Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies;