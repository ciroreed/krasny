var KRASNY = function (ejs) {

  var SELF_KRASNY = this;

  var viewTemplates = [];

  var CONS = {
    templateEngine: ejs,
    MODELS: {},
    VIEWS: {},
    socket: null,
    currentToken: null,
    currentController: null,
    controllerMatchArray: [],
    HTTP: {
      read: "GET",
      create: "POST",
      update: "PUT",
      remove: "DELETE"
    }
  };

  var _initController = function (e) {
    var _newHash;
    var _hashParams = {};
    if (e) {
      _newHash = e.newURL.split("#").pop();
    } else {
      _newHash = "/";
    }
    SELF_KRASNY.utils._forIn(CONS.MODELS, function (m) {
      m.lay();
    });
    CONS.controllerMatchArray.forEach(function (contMatch) {
      if (contMatch.__regex.test(_newHash)) {
        CONS.currentController = contMatch;
        var _matches = contMatch.__regex.exec(_newHash);
        _matches.shift();
        _matches.forEach(function (mat, i) {
          _hashParams[contMatch.__paramList[i]] = mat;
        });
        SELF_KRASNY.utils._forIn(CONS.VIEWS, function (view, name) {
          if (contMatch.load.indexOf(name) === -1) {
            view.clear();
          }
        });
        contMatch.__func(_hashParams);
      }
    });
  };

  var _prepareRoutes = function (controller) {
    var _parts;
    var _params;
    var _result;
    var _cont;
    if (controller.route === "/") {
      _params = {};
      _result = new RegExp(/^\/$/);
    } else {
      _parts = controller.route.split("/");
      _params = _parts.filter(function (x) {
        return x.search(":") === 0
      });
      _params = _params.map(function (x) {
        return x.replace(":", "")
      });
      var _tmp = "^" + _parts.join("\/") + "$";
      _result = new RegExp(_tmp.replace(/:[a-z]+/g, "(.+)"));
    }
    _cont = {
      __regex: _result,
      __paramList: _params,
      __func: controller.init,
      MODELS: CONS.MODELS,
      VIEWS: CONS.VIEWS,
      APP: SELF_KRASNY
    };
    var _keys = Object.keys(controller);
    for (var i = 0; i < _keys.length; i++) {
      _cont[_keys[i]] = controller[_keys[i]];
    }
    CONS.controllerMatchArray.push(_cont);
  };

  var _checkRequiredKeys = function (k) {
    if (!SELF_KRASNY.property(k)) throw new Error(k +
      " is not defined in main app");
  };

  var _createModel = function (prop, uid) {
    prop["uid"] = uid;
    if (prop.session) {
      SELF_KRASNY.property("sessionModel", prop.uid);
    }
    CONS.MODELS[uid] = new SELF_KRASNY.types.Model(prop);
    CONS.MODELS[uid].collection = [];
  };

  var _createView = function (prop, uid) {
    prop["uid"] = uid;
    CONS.VIEWS[uid] = new SELF_KRASNY.types.View(prop);

    viewTemplates.push({
      uid: uid,
      uri: CONS.VIEWS[uid].property("path")
    });
  };

  var _bindViewContent = function (uid, html) {
    CONS.VIEWS[uid].init(html);
  };

  SELF_KRASNY.navigate = function (controllerName) {
    var controllerFound = false;
    SELF_KRASNY.utils._forIn(SELF_KRASNY.property("controllers"), function (
      controller, name) {
      if (controllerName === name) {
        controllerFound = !controllerFound;
        window.location.hash = controller.route;
      }
    });
    if (!controllerFound) {
      window.location.hash = controllerName;
    }
  };

  SELF_KRASNY.upload = function (formData, callback) {
    SELF_KRASNY.utils._restAdapter(SELF_KRASNY.property("config").fileinput,
      CONS.HTTP.create +
      "@" +
      SELF_KRASNY.property("config").api + "/" + SELF_KRASNY.property(
        "config").fileinput,
      formData, callback);
  };

  SELF_KRASNY.build = function (configuration) {

    if(configuration){
      SELF_KRASNY.utils._forIn(configuration, function(object, name){
        SELF_KRASNY.property(name, object)
      });
    }

    var _requiredKeys = ["views", "models", "controllers", "config"];
    _requiredKeys.forEach(_checkRequiredKeys);
    if (SELF_KRASNY.property("config").persistanceAdapter.type ===
      "websocket") {
      var socketUrl = "ws://" + SELF_KRASNY.property("config").persistanceAdapter
        .url;
      CONS.socket = new WebSocket(socketUrl);
      CONS.socket.onmessage = SELF_KRASNY.utils._onMessageReceived;
      CONS.socket.onerror = SELF_KRASNY.utils._onSocketClosed;
      CONS.socket.onclose = SELF_KRASNY.utils._onSocketError;
      CONS.socket.onopen = prepareApplication;
    } else if (SELF_KRASNY.property("config").persistanceAdapter.type ===
      "restfull") {
      prepareApplication();
    }
  };

  var prepareApplication = function () {

    SELF_KRASNY.utils._forIn(SELF_KRASNY.property("models"), _createModel);
    SELF_KRASNY.utils._forIn(SELF_KRASNY.property("views"), _createView);
    SELF_KRASNY.utils._retrieveSync(viewTemplates, _bindViewContent,
      function () {
        SELF_KRASNY.utils._forIn(SELF_KRASNY.property("controllers"),
          _prepareRoutes);
        window.location.hash = "/";
        window.onhashchange = _initController;
        _initController({
          newURL: window.location.href
        });
      }
    );

    if (typeof SELF_KRASNY.property("postStart") === "function"){
      SELF_KRASNY.property("postStart").call(SELF_KRASNY);
    }
  };

  var utilsConstructor = require("./utils.js");
  var typesConstructor = require("./types.js");
  SELF_KRASNY.utils = new utilsConstructor(SELF_KRASNY, CONS);
  SELF_KRASNY.types = new typesConstructor(SELF_KRASNY, CONS);

  return SELF_KRASNY.types.Base.call(SELF_KRASNY, {
    uid: "main-app"
  });
};

module.exports = KRASNY;
