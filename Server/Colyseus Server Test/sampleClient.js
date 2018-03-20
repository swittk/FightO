var client = new Colyseus.Client('ws://localhost:4000');


var room = client.join("sample");

room.onUpdate.add(function(state) {
  console.log(room.name, "has new state:", state)
})