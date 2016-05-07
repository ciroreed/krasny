var UTILS = function (krasnyApp, CONS) {

  var SELF_UTILS = this;
  var SELF_CONS = CONS;
  var SELF_KRASNY = krasnyApp;

  SELF_UTILS._getResource = function (uid, resource, callback) {
    SELF_UTILS._restAdapter(uid, resource, undefined, callback);
  };

  SELF_UTILS._onMessageReceived = function (msg) {
    var messageReceived = JSON.parse(msg.data);
    if (!messageReceived.error) {
      if (messageReceived.action) {
        SELF_CONS.MODELS[messageReceived.orm.entity].force(messageReceived.action,
          messageReceived);
        SELF_CONS.MODELS[messageReceived.orm.entity].force("any");
      } else {
        SELF_CONS.currentSessionToken = messageReceived.token;
      }
    }
  };

  SELF_UTILS._onSocketClosed = function () {
    console.log(" `_onSocketClosed` Todo, remove this");
  };

  SELF_UTILS._onSocketError = function () {
    console.log(" `_onSocketError` Todo, remove this");
  };

  SELF_UTILS._persistanceDispatcher = function (model, operation,
    persistanceAdapter, values, i) {
    if (persistanceAdapter.type === "local") {
      model.local[operation](values, i);
    } else if (persistanceAdapter.type === "restfull") {
      SELF_UTILS._restAdapter(
        model.getUID(),
        SELF_UTILS._formatURI(operation, persistanceAdapter.url, model, i),
        values
      );
    } else if (persistanceAdapter.type === "websocket") {
      var requestMessage = {
        orm: {}
      };
      requestMessage.action = operation;
      requestMessage.orm.entity = model.getUID();
      requestMessage.token = SELF_CONS.currentSessionToken;
      if (values) {
        requestMessage.orm.subject = values;
      }
      if (i) {
        requestMessage.orm.where = {
          id: i
        };
        requestMessage.id = i;
      }
      SELF_CONS.socket.send(JSON.stringify(requestMessage));
    }
  };

  SELF_UTILS._restAdapter = function (uid, uri, bodyData, eachFn, args,
    recursiveFn, callback) {
    var httpverb;
    var xhttp = new XMLHttpRequest();
    var stateChanged = function () {
      if (xhttp.readyState === 4) {
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
            if (typeof recursiveFn !== "undefined") {
              recursiveFn(args, eachFn, callback);
            }
            SELF_KRASNY.utils._forIn(SELF_CONS.HTTP, function (verb, k) {
              if (httpverb === verb && SELF_CONS.MODELS[uid]) {
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
    httpverb = req.pop() || SELF_CONS.HTTP.read;
    xhttp.onreadystatechange = stateChanged;
    xhttp.open(httpverb, request, true);
    if (bodyData && !(bodyData instanceof FormData)) {
      bodyData = SELF_KRASNY.utils._buildFormData(bodyData)
    }
    xhttp.send(bodyData);
  };

  SELF_UTILS._buildFormData = function (bodyRequest) {
    var formData = new FormData();
    SELF_KRASNY.utils._forIn(bodyRequest, function (val, k) {
      formData.append(k, val);
    });
    return formData;
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
    SELF_UTILS._restAdapter(undefined, SELF_CONS.HTTP.create + "@" + uri,
      body);
  };

  SELF_UTILS._requiresAuth = function (model, operation) {
    return model.get("crud")[operation].length > 1;
  };

  SELF_UTILS._formatURI = function (operation, restfullUrl, model, i) {
    var uri = "/" + model.getUID() + "/";

    if (operation === "auth") {
      operation === "create";
      restfullUrl += "/session";
    }
    if (model) {
      restfullUrl += "/" + model.getUID();
    }
    if (i) {
      restfullUrl += i + "/";
    }
    if (SELF_UTILS._requiresAuth(model, operation)) {
      uri += "?token=" + SELF_CONS.currentSessionToken;
    }
    return operation + "@" + restfullUrl;
  };

  SELF_UTILS._forIn = function (obj, fn) {
    Object.keys(obj).forEach(function (o) {
      fn(obj[o], o);
    });
  };

  SELF_UTILS._arrayMerge = function (arr1, arr2) {
    var result = arr1;
    arr2.forEach(function (m) {
      if (!result.some(function (o) {
          return o === m;
        })) {
        result.push(m);
      }
    });
    return result;
  }

  return SELF_UTILS;
}

module.exports = UTILS;
