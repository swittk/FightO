"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const timer_1 = require("@gamestdio/timer");
exports.Clock = timer_1.default;
exports.Delayed = timer_1.Delayed;
const shortid = require("shortid");
// Core classes
var Server_1 = require("./Server");
exports.Server = Server_1.Server;
var Room_1 = require("./Room");
exports.Room = Room_1.Room;
var Protocol_1 = require("./Protocol");
exports.Protocol = Protocol_1.Protocol;
var RegisteredHandler_1 = require("./matchmaker/RegisteredHandler");
exports.RegisteredHandler = RegisteredHandler_1.RegisteredHandler;
var LocalPresence_1 = require("./presence/LocalPresence");
exports.LocalPresence = LocalPresence_1.LocalPresence;
var RedisPresence_1 = require("./presence/RedisPresence");
exports.RedisPresence = RedisPresence_1.RedisPresence;
var MemsharedPresence_1 = require("./presence/MemsharedPresence");
exports.MemsharedPresence = MemsharedPresence_1.MemsharedPresence;
var nonenumerable_1 = require("nonenumerable");
exports.nosync = nonenumerable_1.nonenumerable;
function generateId() { return shortid.generate(); }
exports.generateId = generateId;
function isValidId(id) { return shortid.isValid(id); }
exports.isValidId = isValidId;
