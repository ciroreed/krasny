var TYPES = function (krasnyApp, CONS) {

  var SELF_TYPES = this;

  var SELF_KRASNY = krasnyApp;

  var SELF_CONS = CONS;

  SELF_TYPES.LocalStorageAdapter = function (uid) {
    var LOCAL_STORAGE = this;
    var _storageColl = [];

    LOCAL_STORAGE.read = function () {
      SELF_KRASNY.utils._resetModel(uid, _storageColl);
    };
    LOCAL_STORAGE.create = function (val) {
      _storageColl.push(val);
    };
    LOCAL_STORAGE.update = function (val, i) {
      _storageColl[i] = val;
    };
    LOCAL_STORAGE.remove = function (val, i) {
      delete _storageColl[i];
    };
    return LOCAL_STORAGE;
  };

  SELF_TYPES.Base = function (args) {
    if (!args.uid) throw new Error(args.type +
      " needs an uid predefined property");
    var SELF_BASE = this;
    var _UID = args.uid;
    var _PROPERTIES = {};
    Object.keys(args).forEach(function (k) {
      _PROPERTIES[k] = args[k] === _UID ? undefined : args[k];
    });
    SELF_BASE.getUID = function () {
      return _UID;
    };
    SELF_BASE.property = function (k, v) {
      if (typeof v !== "undefined") {
        _PROPERTIES[k] = v;
      }
      return _PROPERTIES[k];
    };
    return SELF_BASE;
  };

  SELF_TYPES.Model = function (args) {
    var SELF_MODEL = this;
    args.scope = [];

    if (args.local) {
      SELF_MODEL.local = new SELF_TYPES.LocalStorageAdapter(args.uid);
    }

    if (args.session) {
      SELF_MODEL.authenticate = function (values, callback) {
        SELF_KRASNY.utils._restAdapter(
          SELF_MODEL.getUID(),
          SELF_KRASNY.utils._formatURI(SELF_CONS.METHODS.create,
            SELF_MODEL, true),
          values,
          callback);
      };

      SELF_MODEL.isAuth = function () {
        return SELF_CONS.currentSessionToken !== null;
      };
    }

    SELF_MODEL.Instance = function (raw) {
      var INST = SELF_TYPES.Base.call(this, args);
      SELF_KRASNY.utils._forIn(SELF_MODEL.property("defaults"), function (
        v, k) {
        INST.property(k, raw[k] || v);
      });
      SELF_KRASNY.utils._forIn(SELF_MODEL.property("methods"), function (
        v, k) {
        INST[k] = v;
      });
      INST.getJSON = function () {
        var pjo = {};
        SELF_KRASNY.utils._forIn(SELF_MODEL.property("defaults"),
          function (m, k) {
            pjo[k] = INST.property(k);
          });
        return pjo;
      };
      return INST;
    };

    SELF_MODEL.set = function (k, v, silent) {
      SELF_MODEL.property(k, v);
      SELF_MODEL.changed = k;
      if (!silent) SELF_MODEL.lifecycle.fire("change");
    };

    SELF_MODEL.get = function (k) {
      return SELF_MODEL.property(k);
    };

    SELF_MODEL.search = function (obj) {
      var firstKey = Object.keys(obj).pop();
      SELF_MODEL.set("scope", SELF_MODEL.collection.filter(
        function (i) {
          return i.property(firstKey).indexOf(obj[firstKey]) > -1
        }));
    };

    SELF_MODEL.getReference = function (p) {
      return SELF_MODEL.map(function (i) {
        var obj = {};
        obj["id"] = i.property("id");
        obj["value"] = i.property(p);
        return obj;
      });
    };

    SELF_MODEL.filter = function (obj) {
      var firstKey = Object.keys(obj).pop();
      SELF_MODEL.set("scope", SELF_MODEL.collection.filter(function (i) {
        return i.property(firstKey) === obj[firstKey]
      }));
    };

    SELF_MODEL.all = function () {
      SELF_MODEL.set("scope", SELF_MODEL.collection);
    };

    SELF_MODEL.sort = function (crit, reverse) {
      var tmp = SELF_MODEL.get("scope");
      if (typeof SELF_MODEL.get("defaults")[crit] === "number") {
        tmp.sort(function (a, b) {
          return a.property(crit) < b.property(crit);
        });
      } else {
        tmp.sort(function (a, b) {
          return a.property(crit).localeCompare(b.property(crit));
        });
      }
      if (reverse) {
        tmp.reverse();
      }
      SELF_MODEL.set("scope", tmp);
    };

    SELF_MODEL.getInstance = function (crit) {
      if (typeof crit === "number") {
        return SELF_MODEL.collection[crit]
      }
      var key = Object.keys(crit).shift();
      var result = SELF_MODEL.collection.filter(
        function (i) {
          return i.property(key) === crit[key]
        });
      return result.shift();
    };

    SELF_MODEL.fetch = function () {
      var persistanceAdapter = SELF_KRASNY.property("config").persistanceAdapter;
      SELF_KRASNY.utils._persistanceDispatcher(SELF_MODEL, "read",
        persistanceAdapter);
    };

    SELF_MODEL.create = function (values) {
      var persistanceAdapter = SELF_KRASNY.property("config").persistanceAdapter;
      SELF_KRASNY.utils._persistanceDispatcher(SELF_MODEL, "create",
        persistanceAdapter, values);
    };

    SELF_MODEL.update = function (i, values) {
      var persistanceAdapter = SELF_KRASNY.property("config").persistanceAdapter;
      SELF_KRASNY.utils._persistanceDispatcher(SELF_MODEL, "update",
        persistanceAdapter, values, i);
    };

    SELF_MODEL.remove = function (i) {
      var persistanceAdapter = SELF_KRASNY.property("config").persistanceAdapter;
      SELF_KRASNY.utils._persistanceDispatcher(SELF_MODEL, "remove",
        persistanceAdapter, {}, i);
    };

    SELF_MODEL.resetInstances = function (raw) {
      SELF_MODEL.collection = [];
      raw.response.forEach(function (f) {
        SELF_MODEL.collection.push(new SELF_MODEL.Instance(
          f));
      });
    };

    SELF_MODEL.updateInstance = function (raw) {
      SELF_MODEL.collection = SELF_MODEL.collection.map(function(i){
        if(i.property("id") === raw.id){
          SELF_KRASNY.utils._forIn(raw.orm.subject, function(v, k){
            i.property(k, v);
          });
        }
        return i;
      });
    };

    SELF_MODEL.createInstance = function (raw) {
      SELF_MODEL.collection.push(new SELF_MODEL.Instance(raw.response));
    };

    SELF_MODEL.removeInstance = function (raw) {
      SELF_MODEL.collection = SELF_MODEL.collection.filter(function(i){
        return i.property("id") !== raw.id;
      });
    };

    SELF_MODEL.when = function (action, handler) {
      SELF_MODEL.lifecycle.addSubscriber(action, handler);
    };

    SELF_MODEL.force = function (action, subject) {
      SELF_MODEL.lifecycle.fire(action, subject);
    };

    SELF_MODEL.lay = function (action) {
      SELF_MODEL.lifecycle.reset(action);
    };

    var LifeCycle = function () {
      var SELF_LIFECYCLE = this;
      var actions = [];
      SELF_LIFECYCLE.addSubscriber = function (action, handler) {
        actions.push({
          type: action,
          fn: handler
        });
      };
      SELF_LIFECYCLE.fire = function (action, subject) {
        actions.forEach(function (a) {
          if (action === a.type && typeof a.fn === "function") {
            a.fn.call(SELF_CONS.currentController, subject);
          }
        });
      };
      SELF_LIFECYCLE.reset = function (action) {
        var tmpActions = [];
        if (action) {
          actions.forEach(function (a) {
            if (a.type !== action) {
              tmpActions.push(a);
            }
          });
        }
        actions = tmpActions;
      };
      return SELF_LIFECYCLE;
    };

    SELF_MODEL.lifecycle = new LifeCycle;

    return SELF_TYPES.Base.call(SELF_MODEL, args);
  };

  SELF_TYPES.View = function (args) {
    var SELF_VIEW = this;

    var listen = function () {
      SELF_KRASNY.utils._forIn(SELF_VIEW.property("events"), function (
        handler, ev) {
        ev = ev.split(" ");
        SELF_KRASNY.utils._forIn(SELF_VIEW.property("el").querySelectorAll(
            ev[1]),
          function (htmlElement) {
            if (typeof htmlElement === "object") {
              htmlElement.addEventListener(ev[0], function (e) {
                handler.call(
                  SELF_CONS.currentController,
                  SELF_VIEW,
                  e.target,
                  e
                );
              });
            }
          });
      });
    };

    SELF_VIEW.selector = function(sel){
      var queryResult = SELF_VIEW.property("el").querySelectorAll(sel);
      if(queryResult.length === 1){
        return queryResult.item(0);
      }
      return queryResult;
    };

    SELF_VIEW.init = function (html) {
      SELF_VIEW.property("root", "#" + SELF_VIEW.getUID());
      SELF_VIEW.property("events", {});
      SELF_VIEW.property("html", html);
    };

    SELF_VIEW.invalidate = function (hardScoped) {
      SELF_VIEW.clear();
      hardScoped = hardScoped || {};
      if (SELF_KRASNY.property("i18n")) {
        hardScoped.i18n = SELF_KRASNY.property("i18n");
      }
      SELF_VIEW.property("el", document.body.querySelector(SELF_VIEW.property(
        "root")));
      var compiledHtml = SELF_CONS.templateEngine.compile(SELF_VIEW.property(
        "html"));
      compiledHtml = compiledHtml(hardScoped);
      SELF_VIEW.property("el").innerHTML = compiledHtml;
      listen();
    };

    SELF_VIEW.on = function (event, handler) {
      var events = SELF_VIEW.property("events");
      events[event] = handler;
      SELF_VIEW.property("events", events);
    };

    SELF_VIEW.clear = function () {
      if (SELF_VIEW.property("el")) {
        SELF_VIEW.property("el").innerHTML = "";
      }
    };

    SELF_VIEW.getFormData = function (selector) {
      return new FormData(SELF_VIEW.property("el").querySelector(selector ||
        "form"));
    };

    SELF_VIEW.getFormObject = function (selector) {
      var formEl = SELF_VIEW.property("el");
      if (selector) {
        formEl = SELF_VIEW.property("el").querySelector(selector);
      }
      var inputs = formEl.querySelectorAll("input, textarea");
      var formObject = {};
      SELF_KRASNY.utils._forIn(inputs, function (inp) {
        formObject[inp.getAttribute("name")] = inp.value;
      });
      return formObject;
    };

    return SELF_TYPES.Base.call(SELF_VIEW, args);
  };
  return SELF_TYPES;
}

module.exports = TYPES;
