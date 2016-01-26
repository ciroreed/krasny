var krasny = function (jquery, ejs) {

  var SELF_KRASNY = this;

  var models = {};

  var views = {};

  var config = {};

  var firstModelSync = [];

  var viewTemplates = [];

  var currentSessionToken;

  var apiHost;

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

    if (args.session) {
      SELF_MODEL.authenticate = function (values, callback) {
        _authModel(values, callback, SELF_MODEL);
      }
    }

    SELF_MODEL.instance = function (raw) {
      var INST = Type.call(this, args);
      _forIn(SELF_MODEL.get("defaults"), function (v, k) {
        INST.set(k, raw[k] || v, true);
      });
      _forIn(SELF_MODEL.get("methods"), function (v, k) {
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
      if (args.auto) {
        SELF_VIEW.invalidate();
      }
    };

    SELF_VIEW.invalidate = function (hardScoped) {
      SELF_VIEW.clear();
      SELF_VIEW.set("el", jquery(SELF_VIEW.get("root")));
      var compiledHtml = ejs.compile(SELF_VIEW.get("html"));
      if (hardScoped) {
        compiledHtml = compiledHtml({
          scope: hardScoped
        });
      } else if (SELF_VIEW.get("scope")) {
        compiledHtml = compiledHtml({
          scope: models[SELF_VIEW.get("scope")].get("scope")
        });
      }
      jquery(SELF_VIEW.get("root")).html(compiledHtml);
      SELF_VIEW.listen();
    };

    SELF_VIEW.listen = function () {
      _forIn(SELF_VIEW.get("events") || {}, function (handler, ev) {
        ev = ev.split(" ");
        handler = handler.split(" ");
        var context;
        if (handler.length === 1) context = document;
        else context = SELF_VIEW.get("el").find(handler[1]);
        SELF_VIEW.get("el").find(ev[1]).on(ev[0], function (e) {
          if (handler[1] === "target") context = e.target;
          SELF_VIEW[handler[0]](SELF_VIEW.get("el"), jquery(
            context), e);
        });
      });
    };

    SELF_VIEW.render = function () {
      _render(SELF_VIEW);
    };

    SELF_VIEW.clear = function () {
      jquery(SELF_VIEW.get("root")).empty();
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

  var _createModel = function (prop) {
    if (prop.session) {
      config.sessionModel = prop.uid;
    }
    var tmpmodel = new Model(prop);
    models[tmpmodel.getUID()] = tmpmodel;
    models[tmpmodel.getUID()].collection = [];
    if (tmpmodel.get("auto")) {
      firstModelSync.push({
        uid: tmpmodel.getUID(),
        uri: apiHost + tmpmodel.getUID()
      });
    }
  };

  var _createView = function (prop) {
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
      models[uid].collection.push(new models[uid].instance(f));
    });
    models[uid].all();
  };

  var _propertyChangeHandler = function (e) {
    _forIn(views, function (v) {
      if (v.get("scope") === e.detail.getUID()) {
        v.invalidate();
      }
    });
  };

  var _renderView = function (uid, html) {
    views[uid].init(html);
  };

  var _render = function (v) {
    _getResource(v.getUID(), v.get("path"), _renderView);
  };

  var _listenEvents = function (v) {
    v.listen();
  };

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
    if(typeof m.get("defaults")[key] === "number"){
      m.set("scope", m.collection.sort());
      return;
    }
    m.set("scope", m.collection.sort(function(a, b){
      return a.get(key).localeCompare(b.get(key));
    }));
  };

  var _buildModelUrl = function (m) {
    return m.get("token") ? "?token=" +
      currentSessionToken : "";
  };

  var _readInstances = function (m) {
    _getResource(m.getUID(), apiHost + m.getUID() + _buildModelUrl(m),
      _fetchModel);
  };

  var _createNewInstance = function (values, callback, m) {
    var uri = HTTP.post + ":" + apiHost + m.getUID();
    _restAdapter(m.getUID(), uri + _buildModelUrl(m), values, callback);
  };

  var _updateInstance = function (i, values, callback, m) {
    var uri = HTTP.put + ":" + apiHost + m.getUID() + "/" +
      m.collection[i].get("id");
    _restAdapter(m.getUID(), uri + _buildModelUrl(m), values, callback);
  };

  var _deleteInstance = function (i, callback, m) {
    var uri = HTTP.delete + ":" + apiHost + m.getUID() +
      "/" +
      m.collection[i].get("id");
    _restAdapter(m.getUID(), uri + _buildModelUrl(m), undefined, callback);
  };

  var _authModel = function (values, callback, m) {
    var uri = HTTP.post + ":" + apiHost + "session/" + m.getUID() + "/";
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

  SELF_KRASNY.app = function (configuration) {
    config = configuration;
    apiHost = config.config.api + "/" || "/";
    configuration.models.forEach(_createModel);
    _retrieveSync(firstModelSync, _fetchModel, function () {
      configuration.views.forEach(_createView);
      _retrieveSync(viewTemplates, _renderView, function () {
        configuration.controller(models, views, jquery);
        _modelUpdates();
      });
    });
  }
}
if (typeof module !== "undefined") module.exports = new krasny(require(
    "jquery"),
  require("ejs"));
else window.K = new krasny($, ejs);
