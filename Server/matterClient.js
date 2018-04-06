// ==================================================================
// New Entity in the world
// ==================================================================
var Entity = function () {
    var options = {
        frictionStatic: 0,
        friction: 0,
        frictionAir: 0.005,
        restitution: 1,
        label: "player", // label = type of body
        floorCount: 0,
        isStatic: false
    }
    sampleLevel.spawnpoints[pname].x*mapUnitSize
    this.size = playerDiameter/2.0;
    this.body = Matter.Bodies.circle(this.spawn[0], this.spawn[1], this.size, options);
}