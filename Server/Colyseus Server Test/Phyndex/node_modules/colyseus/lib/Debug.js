"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debug = require("debug");
exports.debugMatchMaking = debug('colyseus:matchmaking');
exports.debugPatch = debug('colyseus:patch');
exports.debugPatchData = debug('colyseus:patch:data');
const debugErrors = debug('colyseus:errors');
exports.debugError = (...args) => {
    console.error(...args);
    debugErrors.apply(exports.debugError, args);
};
