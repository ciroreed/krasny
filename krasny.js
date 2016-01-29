var krasny = function (jquery, ejs) {

  var SELF_KRASNY = this;

  var models = {};

  var views = {};

  var firstModelSync = [];

  var viewTemplates = [];

  var currentSessionToken;

  var MAIN = {
    uid: "main-app"
  };

  var HTTP = {
    get: "GET",
    post: "POST",
    put: "PUT",
    delete: "DELETE"
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
    var _changeEvent = new CustomEvent("update", {
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

      SELF_MODEL.isAuth = function(){
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

    SELF_MODEL.filter = function (k, v) {
      _filter(k, v, SELF_MODEL);
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

    SELF_VIEW.serializeForm = function (selector) {
      return _serializeForm(SELF_VIEW, selector);
    };

    return Type.call(SELF_VIEW, args);
  };

  var _getResource = function (uid, resource, callback) {
    _restAdapter(uid, resource, undefined, callback);
  };

  var _restAdapter = function (uid, uri, body, call, args, recursiveFn,
    callback) {
    var req = uri.split(":");
    var httpverb;
    if (req[0] === HTTP.delete || req[0] === HTTP.put || req[0] === HTTP.post)
      httpverb = req[0];
    req = req.pop();
    jquery.ajax({
      url: req,
      method: httpverb || HTTP.get,
      data: body || {},
      success: function (data) {
        if (data.token && config.sessionModel === uid) {
          currentSessionToken = data.token;
        }
        call(uid, data);
        if (typeof recursiveFn !== "undefined") recursiveFn(args,
          call,
          callback);
      },
      error: function (req, status, errMsg) {
        // console.log(req);
        // console.log(status);
        console.log(errMsg);
      }
    });
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
      config.sessionModel = prop.uid;
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
    if (tmpview.get("scope")) {
      models[tmpview.get("scope")].set("scopedView", tmpview.getUID());
    }
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
    models[uid].all();
  };

  var _propertyChangeHandler = function (e) {
    var scopedView = models[e.detail.getUID()].get("scopedView");
    if (scopedView) {
      views[scopedView].invalidate();
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
      var context;
      if (handler.length === 1) context = document;
      else context = v.get("el").find(handler[1]);
      v.get("el").find(ev[1]).on(ev[0], function (e) {
        if (handler[1] === "target") context = e.target;
        v[handler[0]](v.get("el"), jquery(
          context), e);
      });
    });
  }

  var _clear = function (v) {
    jquery(v.get("root")).empty();
  };

  var _serializeForm = function (v, selector) {
    var serializedObject = {};
    var buildResult = function (inp) {
      serializedObject[inp.name] = inp.value;
    };
    v.get("el").find(selector || "form").serializeArray().forEach(
      buildResult);
    return serializedObject;
  }

  var _invalidate = function (v, i, hardScoped) {
    v.clear();
    v.set("el", jquery(v.get("root")), true);
    var compiledHtml = ejs.compile(v.get("html"));
    if (hardScoped) {
      compiledHtml = compiledHtml({
        scope: hardScoped
      });
    } else if (v.get("scope")) {
      compiledHtml = compiledHtml({
        scope: models[v.get("scope")].get("scope")
      });
    }
    jquery(v.get("root")).html(compiledHtml);
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
    var key = Object.keys(crit).shift();
    var result = m.collection.filter(
      function (i) {
        return i.get(key) === crit[key]
      });
    return result.shift();
  }

  var _buildModelUrl = function (m) {
    return m.get("token") ? "?token=" +
      currentSessionToken : "";
  };

  var _readInstances = function (m) {
    if (m.local) {
      m.local.read();
      return;
    }
    _getResource(m.getUID(), SELF_KRASNY.get("config").api + m.getUID() +
      _buildModelUrl(m),
      _fetchModel);
  };

  var _createNewInstance = function (values, callback, m) {
    if (m.local) {
      m.local.create(values);
      callback();
      return;
    }
    var uri = HTTP.post + ":" + SELF_KRASNY.get("config").api + m.getUID();
    _restAdapter(m.getUID(), uri + _buildModelUrl(m), values, callback);
  };

  var _updateInstance = function (i, values, callback, m) {
    if (m.local) {
      m.local.update(i, values);
      callback();
      return;
    }
    var uri = HTTP.put + ":" + SELF_KRASNY.get("config").api + m.getUID() +
      "/" +
      m.collection[i].get("id");
    _restAdapter(m.getUID(), uri + _buildModelUrl(m), values, callback);
  };

  var _deleteInstance = function (i, callback, m) {
    if (m.local) {
      m.local.delete(i)
      callback();
      return;
    }
    var uri = HTTP.delete + ":" + SELF_KRASNY.get("config").api + m.getUID() +
      "/" +
      m.collection[i].get("id");
    _restAdapter(m.getUID(), uri + _buildModelUrl(m), undefined, callback);
  };

  var _authModel = function (values, callback, m) {
    var uri = HTTP.post + ":" + SELF_KRASNY.get("config").api + "session/" +
      m.getUID() + "/";
    _restAdapter(m.getUID(), uri, values, callback);
  };

  var _modelUpdates = function (m) {
    document.addEventListener("update", _propertyChangeHandler);
  };

  var _forIn = function (coll, fn) {
    Object.keys(coll).forEach(function (o) {
      fn(coll[o], o);
    });
  };

  SELF_KRASNY.start = function () {
    var _controllerMatcherArr = [];

    var _checkRequiredKeys = function (k) {
      if (!SELF_KRASNY.get(k)) throw new Error(k +
        " is not defined in main app");
    };

    var _prepareRoutes = function (controller, name) {
      var _parts;
      var _params;
      var _result;
      if (controller.route === "/") {
        _params = {};
        _result = new RegExp("\/");
      } else {
        _parts = controller.route.split("/");
        _params = _parts.filter(function (x) {
          return x.search(":") === 0
        });
        _params = _params.map(function (x) {
          return x.replace(":", "")
        });
        _result = new RegExp(_parts.join("\/").replace(/:[a-z]+/g,
          "(.+)"))
      }
      _controllerMatcherArr.push({
        regex: _result,
        paramList: _params,
        loadViews: controller.load || [],
        func: controller.context
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
        if (!contMatch.regex.test(_newHash)) {
          if (_controllerMatcherArr.length === i + 1) {
            window.location.hash = "/";
          }
          return;
        } else {
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
          contMatch.func(models, views, $, _hashParams);
        }
      });
    };

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

  ejs.delimiter = '?';

  return Type.call(SELF_KRASNY, MAIN);
};

if (typeof module !== "undefined") module.exports = new krasny(require(
    "jquery"),
  require("ejs"));
else window.K = new krasny($, ejs);
