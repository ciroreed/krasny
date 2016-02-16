var krasny = function (ejs) {

  var SELF_KRASNY = this;

  var models = {};

  var views = {};

  var firstModelSync = [];

  var viewTemplates = [];

  var currentSessionToken;

  var _controllerMatcherArr = [];

  var MAIN = {
    uid: "main-app"
  };

  var METHODS = {
    read: "GET",
    create: "POST",
    update: "PUT",
    delete: "DELETE",
    GET: "read",
    POST: "create",
    PUT: "update",
    DELETE: "delete"
  };

  var TYPES = {
    view: "VIEW",
    model: "MODEL"
  };

  var LocalStorageAdapter = function (uid) {
    var LOCAL_STORAGE = this;
    var _storageColl = [];

    LOCAL_STORAGE.read = function () {
      _fetchModel(uid, _storageColl);
    };
    LOCAL_STORAGE.create = function (val) {
      _storageColl.push(val);
    };
    LOCAL_STORAGE.update = function (i, val) {
      _storageColl[i] = val;
    };
    LOCAL_STORAGE.delete = function (i) {
      delete _storageColl[i];
    };
    return LOCAL_STORAGE;
  };

  var Type = function (args) {
    if (!args.uid) throw new Error(args.type +
      " needs an uid predefined property");
    var SELF_TYPE = this;
    var _changeEvent = new CustomEvent(METHODS.PUT, {
      detail: SELF_TYPE
    });
    var _UID = args.uid;
    var _PROPERTYES = {};
    Object.keys(args).forEach(function (k) {
      _PROPERTYES[k] = args[k] === _UID ? undefined : args[k];
    });
    SELF_TYPE.getUID = function () {
      return _UID;
    };
    SELF_TYPE.get = function (k) {
      return _PROPERTYES[k];
    };
    SELF_TYPE.set = function (k, v, silent) {
      _PROPERTYES[k] = v;
      if (!silent) document.dispatchEvent(_changeEvent);
    };
    return SELF_TYPE;
  };

  var Model = function (args) {
    var SELF_MODEL = this;
    args.type = TYPES.model;
    args.scope = [];

    if (args.local) {
      SELF_MODEL.local = new LocalStorageAdapter(args.uid);
    }

    if (args.session) {
      SELF_MODEL.authenticate = function (values, callback) {
        _authModel(values, callback, SELF_MODEL);
      }

      SELF_MODEL.isAuth = function () {
        return currentSessionToken !== undefined;
      }
    }

    SELF_MODEL.Instance = function (raw) {
      var INST = Type.call(this, args);
      _forIn(SELF_MODEL.get("defaults"), function (v, k) {
        INST.set(k, raw[k] || v, true);
      });
      _forIn(SELF_MODEL.get("methods") || {}, function (v, k) {
        INST[k] = v;
      });
      return INST;
    };

    SELF_MODEL.search = function (k, v) {
      _search(k, v, SELF_MODEL);
    };

    SELF_MODEL.filter = function (obj) {
      var firstKey = Object.keys(obj).pop();
      _filter(firstKey, obj[firstKey], SELF_MODEL);
    };

    SELF_MODEL.all = function () {
      _all(SELF_MODEL);
    };

    SELF_MODEL.sort = function (crit) {
      _sort(SELF_MODEL, crit);
    };

    SELF_MODEL.getInstance = function (crit) {
      return _getInstance(SELF_MODEL, crit);
    }

    SELF_MODEL.fetch = function () {
      _readInstances(SELF_MODEL);
    };

    SELF_MODEL.create = function (values, callback) {
      _createNewInstance(values, callback, SELF_MODEL);
    };

    SELF_MODEL.update = function (i, values, callback) {
      _updateInstance(i, values, callback, SELF_MODEL)
    };

    SELF_MODEL.delete = function (i, callback) {
      _deleteInstance(i, callback, SELF_MODEL)
    };

    return Type.call(SELF_MODEL, args);
  };

  var View = function (args) {
    var SELF_VIEW = this;
    args.type = TYPES.view;

    SELF_VIEW.init = function (html) {
      SELF_VIEW.set("html", html);
    };

    SELF_VIEW.invalidate = function (hardScoped) {
      _invalidate(SELF_VIEW, undefined, hardScoped);
    };

    SELF_VIEW.listen = function () {
      _listen(SELF_VIEW);
    };

    SELF_VIEW.render = function () {
      _render(SELF_VIEW);
    };

    SELF_VIEW.clear = function () {
      _clear(SELF_VIEW);
    };

    SELF_VIEW.getFormData = function (selector) {
      return _getFormData(SELF_VIEW, selector);
    };

    return Type.call(SELF_VIEW, args);
  };

  var _getResource = function (uid, resource, callback) {
    _restAdapter(uid, resource, undefined, callback);
  };

  var _restAdapter = function (uid, uri, bodyData, call, args, recursiveFn,
    callback) {

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
            if (typeof data === "object" && data.token && SELF_KRASNY.get(
                "sessionModel") === uid) {
              currentSessionToken = data.token;
            }
            call(uid, data);
            if (typeof recursiveFn !== "undefined") recursiveFn(args,
              call,
              callback);
            break;
          default:
            console.log(xhttp.status);
        }
      }
    }
    var req = uri.split(":");
    var httpverb = METHODS[req[0]];
    req = req.pop();
    xhttp.onreadystatechange = stateChanged;
    xhttp.open(httpverb || METHODS.read, req, true);
    xhttp.send(bodyData);
  };

  var _retrieveSync = function (resourceArray, call, callback) {
    if (resourceArray.length) {
      var resource = resourceArray.shift();
      _restAdapter(resource.uid, resource.uri, undefined, call,
        resourceArray,
        _retrieveSync, callback);
    } else callback();
  };

  var _createModel = function (prop, uid) {
    prop["uid"] = uid;
    if (prop.session) {
      SELF_KRASNY.set("sessionModel", prop.uid, true);
    }
    var tmpmodel = new Model(prop);
    models[uid] = tmpmodel;
    models[uid].collection = [];
    if (tmpmodel.get("auto")) {
      firstModelSync.push({
        uid: tmpmodel.getUID(),
        uri: SELF_KRASNY.get("config").api + tmpmodel.getUID()
      });
    }
  };

  var _createView = function (prop, uid) {
    prop["uid"] = uid;
    var tmpview = new View(prop);
    views[tmpview.getUID()] = tmpview;
    viewTemplates.push({
      uid: tmpview.getUID(),
      uri: tmpview.get("path")
    });
  };

  var _fetchModel = function (uid, resp) {
    models[uid].collection = [];
    _forIn(resp, function (f) {
      models[uid].collection.push(new models[uid].Instance(f));
    });
    if (models[uid].get("defaultFilter")) {
      models[uid].filter(models[uid].get("defaultFilter"));
    } else {
      models[uid].all();
    }
  };

  var _propertyChangeHandler = function (e) {
    if(e.detail instanceof Model && typeof e.detail.onchange === "function"){
      e.detail.onchange();
    }
  };

  var _renderView = function (uid, html) {
    views[uid].init(html);
  };

  var _render = function (v) {
    _getResource(v.getUID(), v.get("path"), _renderView);
  };

  var _listen = function (v) {
    _forIn(v.get("events") || {}, function (handler, ev) {
      ev = ev.split(" ");
      handler = handler.split(" ");
      _forIn(v.get("el").querySelectorAll(ev[1]), function (htmlElement,
        k) {
        if (typeof htmlElement === "object") {
          htmlElement.addEventListener(ev[0], function (e) {
            v[handler[0]](v.get("el"), e.target, e);
          });
        }
      });
    });
  }

  var _clear = function (v) {
    if (v.get("el")) {
      v.get("el").innerHTML = "";
    }
  };

  var _getFormData = function (v, selector) {
    return new FormData(v.get("el").querySelector(selector || "form"));
  }

  var _invalidate = function (v, i, hardScoped) {
    v.clear();
    v.set("el", document.body.querySelector(v.get("root")), true);
    var compiledHtml = ejs.compile(v.get("html"));
    if (hardScoped) {
      compiledHtml = compiledHtml(hardScoped);
    } else {
      compiledHtml = compiledHtml();
    }
    v.get("el").innerHTML = compiledHtml;
    v.listen();
  }

  var _filter = function (k, v, m) {
    m.set("scope", m.collection.filter(function (i) {
      return i.get(k) === v
    }));
  };

  var _search = function (k, v, m) {
    m.set("scope", m.collection.filter(
      function (i) {
        return i.get(k).indexOf(v) > -1
      }));
  };

  var _all = function (m) {
    if (m.get("sorting")) {
      m.sort(m.get("sorting"));
    }
    m.set("scope", m.collection);
  };

  var _sort = function (m, crit) {
    var key = Object.keys(crit).shift();
    if (typeof m.get("defaults")[key] === "number") {
      m.set("scope", m.collection.sort());
      return;
    }
    m.set("scope", m.collection.sort(function (a, b) {
      return a.get(key).localeCompare(b.get(key));
    }));
  };

  var _getInstance = function (m, crit) {
    if (typeof crit === "number") {
      return m.collection[crit]
    }
    var key = Object.keys(crit).shift();
    var result = m.collection.filter(
      function (i) {
        return i.get(key) === crit[key]
      });
    return result.shift();
  };

  var _readInstances = function (m) {
    if (m.local) {
      m.local.read();
      return;
    }
    _getResource(m.getUID(), _formatURI(METHODS.GET, m),
      _fetchModel);
  };

  var _createNewInstance = function (values, callback, m) {
    if (m.local) {
      m.local.create(values);
      callback();
      return;
    }
    _restAdapter(m.getUID(), _formatURI(METHODS.POST, m), values, callback);
  };

  var _updateInstance = function (i, values, callback, m) {
    if (m.local) {
      m.local.update(i, values);
      callback();
      return;
    }
    _restAdapter(m.getUID(), _formatURI(METHODS.PUT, m, false, i), values,
      callback);
  };

  var _deleteInstance = function (i, callback, m) {
    if (m.local) {
      m.local.delete(i)
      callback();
      return;
    }
    _restAdapter(m.getUID(), _formatURI(METHODS.DELETE, m, false, i),
      undefined,
      callback);
  };

  var _authModel = function (values, callback, m) {
    _restAdapter(m.getUID(), _formatURI(METHODS.POST, m, true), values,
      callback);
  };

  var _formatURI = function (base, m, session, i) {
    var token = "";
    var uri = m.getUID();
    if (typeof i === "number") {
      uri += "/" + i;
    }
    if (!session && m.get("crud") && m.get("crud")[base] && m.get("crud")[
        base].length === 2) {
      token = "?token=" + currentSessionToken;
    }
    return base + ":" + SELF_KRASNY.get("config").api + "/" + (session ?
      "session/" : "") + uri + token;
  };

  var _modelUpdates = function (m) {
    document.addEventListener(METHODS.PUT, _propertyChangeHandler);
  };

  var _forIn = function (coll, fn) {
    Object.keys(coll).forEach(function (o) {
      fn(coll[o], o);
    });
  };

  var _initController = function (e) {
    var _newHash;
    var _hashParams = {};
    if (e) {
      _newHash = e.newURL.split("#").pop();
    } else {
      _newHash = "/";
    }
    _controllerMatcherArr.forEach(function (contMatch, i) {
      if (contMatch.regex.test(_newHash)) {
        var _matches = contMatch.regex.exec(_newHash);
        _matches.shift();
        _matches.forEach(function (mat, i) {
          _hashParams[contMatch.paramList[i]] = mat;
        });
        _forIn(views, _clear);
        var contextViews = contMatch.loadViews.map(function (vuid) {
          return views[vuid]
        });
        _forIn(contextViews, _invalidate);
        contMatch.func(models, views, _hashParams, SELF_KRASNY);
      }
    });
  };

  var _prepareRoutes = function (controller, name) {
    var _parts;
    var _params;
    var _result;
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
    _controllerMatcherArr.push({
      regex: _result,
      paramList: _params,
      loadViews: controller.load || [],
      func: controller.context
    });
  };

  var _checkRequiredKeys = function (k) {
    if (!SELF_KRASNY.get(k)) throw new Error(k +
      " is not defined in main app");
  };

  SELF_KRASNY.navigate = function (controllerName) {
    _forIn(SELF_KRASNY.get("controllers"), function (controller, name) {
      if (controllerName === name) {
        window.location.hash = controller.route;
      }
    });
  };

  SELF_KRASNY.upload = function (formData, callback) {
    _restAdapter(SELF_KRASNY.get("config").fileinput, METHODS.POST + ":" +
      SELF_KRASNY.get("config").api + "/" + SELF_KRASNY.get("config").fileinput,
      formData, callback);
  };

  SELF_KRASNY.setConfiguration = function(c){
    SELF_KRASNY.set("config", c, true);
  };

  SELF_KRASNY.addModel = function(n, c){
    var _models = SELF_KRASNY.get("models") || {};
    _models[n] = c;
    SELF_KRASNY.set("models", _models, true);
  };

  SELF_KRASNY.addView = function(n, c){
    var _views = SELF_KRASNY.get("views") || {};
    _views[n] = c;
    SELF_KRASNY.set("views", _views, true);
  };

  SELF_KRASNY.addController = function(n, c){
    var _controllers = SELF_KRASNY.get("controllers") || {};
    _controllers[n] = c;
    SELF_KRASNY.set("controllers", _controllers, true);
  };

  SELF_KRASNY.start = function () {

    var _requiredKeys = ["views", "models", "config", "controllers"];

    _requiredKeys.forEach(_checkRequiredKeys);

    _forIn(SELF_KRASNY.get("models"), _createModel);
    _retrieveSync(firstModelSync, _fetchModel, function () {
      _forIn(SELF_KRASNY.get("views"), _createView);
      _retrieveSync(viewTemplates, _renderView, function () {
        _forIn(SELF_KRASNY.get("controllers"), _prepareRoutes);
        window.location.hash = "/";
        window.onhashchange = _initController;
        _modelUpdates();
        _initController({
          newURL: window.location.href
        });
      });
    });
  };

  return Type.call(SELF_KRASNY, MAIN);
};

if (typeof module !== "undefined") module.exports = new krasny(require("ejs"));
else window.K = new krasny(ejs);
