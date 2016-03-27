var UTILS = function(krasnyApp, CONS){

    var SELF_UTILS = this;

    var SELF_CONS = CONS;

    var SELF_KRASNY = krasnyApp;

    SELF_UTILS._getResource = function (uid, resource, callback) {
        SELF_UTILS._restAdapter(uid, resource, undefined, callback);
    };

    SELF_UTILS._restAdapter = function (uid, uri, bodyData, eachFn, args, recursiveFn, callback) {
        var httpverb;
        var xhttp = new XMLHttpRequest();
        var stateChanged = function () {
            if (xhttp.readyState == 4) {
                switch (xhttp.status) {
                    case 200:
                        var data;
                        try {
                            data = JSON.parse(xhttp.responseText);
                        } catch (e) {
                            data = xhttp.responseText;
                        }
                        if (typeof data === "object" && data.token && SELF_KRASNY.property(
                            "sessionModel") === uid) {
                            SELF_CONS.currentSessionToken = data.token;
                        }
                        if (typeof eachFn === "function") {
                            eachFn.call(SELF_CONS.currentController, uid, data);
                        }
                        if (typeof recursiveFn !== "undefined"){
                            recursiveFn(args, eachFn, callback);
                        }
                        SELF_CONS.METHODS.forIn(function(verb, k){
                            if(httpverb === verb && SELF_CONS.MODELS[uid]){
                                SELF_CONS.MODELS[uid].force(k, "server");
                            }
                        });
                        break;
                    default:
                        if (typeof SELF_CONS.MODELS[uid].get("error") === "function") {
                            SELF_CONS.MODELS[uid].get("error")(xhttp);
                        }
                }
            }
        };
        var req = uri.split("@");
        var request = req.pop();
        httpverb = req.pop() || SELF_CONS.METHODS.read;
        xhttp.onreadystatechange = stateChanged;
        xhttp.open(httpverb, request, true);
        xhttp.send(bodyData);
    };
    SELF_UTILS._retrieveSync = function (resourceArray, call, callback) {
        if (resourceArray.length) {
            var resource = resourceArray.shift();
            SELF_UTILS._restAdapter(resource.uid, resource.uri, undefined, call,
                resourceArray,
                SELF_UTILS._retrieveSync, callback);
        } else callback();
    };

    SELF_UTILS._postForm = function (uri, body) {
        SELF_UTILS._restAdapter(undefined, SELF_CONS.METHODS.create + "@" + uri, body);
    };


    SELF_UTILS._formatURI = function (base, m, session, i) {
        var token = "";
        var uri = m.getUID();
        if (typeof i === "number") {
            uri += "/" + i;
        }
        if (!session && m.get("crud") && m.get("crud")[base] && m.get("crud")[
            base].length === 2) {
            token = "?token=" + SELF_CONS.currentSessionToken;
        }
        return base + "@" + SELF_KRASNY.property("config").api + "/" + (session ?
            "session/" : "") + uri + token;
    };

    SELF_UTILS._fetchModel = function (uid, resp) {
        resp.forIn(function (f) {
            SELF_CONS.MODELS[uid].collection.push(new SELF_CONS.MODELS[uid].Instance(f));
        });
        if (SELF_CONS.MODELS[uid].get("defaultFilter")) {
            SELF_CONS.MODELS[uid].filter(SELF_CONS.MODELS[uid].get("defaultFilter"));
        } else {
            SELF_CONS.MODELS[uid].all();
        }
    };

    /**
     * Native extension of javascript types.
     */

    Object.prototype.forIn = function (fn) {
        Object.keys(this).forEach(function (o) {
            fn(this[o], o);
        });
    };

    Array.prototype.merge = function(arr){
        var result = this;
        arr.forEach(function(m){
            if(!result.some(function(o){
                return o === m;
            })){
                result.push(m);
            }
        });
        return result;
    }
    return SELF_UTILS;
}

module.exports = UTILS;




