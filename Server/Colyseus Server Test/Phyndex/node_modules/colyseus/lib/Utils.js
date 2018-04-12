"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const querystring = require("querystring");
const Debug_1 = require("./Debug");
//
// nodemon sends SIGUSR2 before reloading
// (https://github.com/remy/nodemon#controlling-shutdown-of-your-script)
//
const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];
function registerGracefulShutdown(callback) {
    const calledOnce = false;
    signals.forEach((signal) => process.once(signal, () => callback(signal)));
}
exports.registerGracefulShutdown = registerGracefulShutdown;
class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
    then(func) {
        return this.promise.then(func);
    }
    catch(func) {
        return this.promise.catch(func);
    }
}
exports.Deferred = Deferred;
function spliceOne(arr, index) {
    // manually splice availableRooms array
    // http://jsperf.com/manual-splice
    if (index === -1 || index >= arr.length) {
        return false;
    }
    const len = arr.length - 1;
    for (let i = index; i < len; i++) {
        arr[i] = arr[i + 1];
    }
    arr.length = len;
    return true;
}
exports.spliceOne = spliceOne;
function parseQueryString(query) {
    const data = querystring.parse(query.substr(1));
    for (const k in data) {
        if (!Object.prototype.hasOwnProperty.call(data, k)) {
            continue;
        }
        let typedValue;
        try {
            typedValue = JSON.parse(data[k]);
        }
        catch (e) {
            typedValue = data[k];
        }
        data[k] = typedValue;
    }
    return data;
}
exports.parseQueryString = parseQueryString;
function merge(a, ...objs) {
    for (let i = 0, len = objs.length; i < len; i++) {
        const b = objs[i];
        for (const key in b) {
            if (b.hasOwnProperty(key)) {
                a[key] = b[key];
            }
        }
    }
    return a;
}
exports.merge = merge;
function logError(err) {
    if (err) {
        Debug_1.debugError(`websocket error: ${err.message}\n${err.stack}`);
    }
}
exports.logError = logError;
