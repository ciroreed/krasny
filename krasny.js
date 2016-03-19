var krasny = function (ejs) {

    var SELF_KRASNY = this;

    var models = {};

    var views = {};

    var firstModelSync = [];

    var viewTemplates = [];

    var currentSessionToken = null;

    var _controllerMatcherArr = [];

    var currentController = null;

    var MAIN = {
        uid: "main-app"
    };

    var METHODS = {
        read: "GET",
        create: "POST",
        update: "PUT",
        delete: "DELETE"
    };

    var TYPES = {
        view: "VIEW",
        model: "MODEL"
    };

    SELF_KRASNY.restutils = {
        doPost: function (uri, body) {
            _restAdapter(undefined, METHODS.create + "@" + uri, body);
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
        _forIn(models, function (m) {
            m.lay();
        });
        _forIn(views, function (v) {
            if (typeof v.property("alwaysVisible") === "undefined") {
                v.clear();
            }
        });
        _controllerMatcherArr.forEach(function (contMatch) {
            if (contMatch.__regex.test(_newHash)) {
                currentController = contMatch;
                var _matches = contMatch.__regex.exec(_newHash);
                _matches.shift();
                _matches.forEach(function (mat, i) {
                    _hashParams[contMatch.__paramList[i]] = mat;
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
            __loadViews: controller.load || [],
            __func: controller.init,
            MODELS: models,
            VIEWS: views,
            APP: SELF_KRASNY
        };
        var _keys = Object.keys(controller);
        for (var i = 0; i < _keys.length; i++) {
            _cont[_keys[i]] = controller[_keys[i]];
        }
        _controllerMatcherArr.push(_cont);
    };

    var _checkRequiredKeys = function (k) {
        if (!SELF_KRASNY.property(k)) throw new Error(k +
            " is not defined in main app");
    };


    var _getResource = function (uid, resource, callback) {
        _restAdapter(uid, resource, undefined, callback);
    };

    var _restAdapter = function (uid, uri, bodyData, eachFn, args, recursiveFn, callback) {
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
                            currentSessionToken = data.token;
                        }
                        if (typeof eachFn === "function") {
                            eachFn.call(currentController, uid, data);
                        }
                        if (typeof recursiveFn !== "undefined"){
                            recursiveFn(args, eachFn, callback);
                        }
                        _forIn(METHODS, function(verb, k){
                            if(httpverb === verb && models[uid]){
                                models[uid].force(k, "server");
                            }
                        });
                        break;
                    default:
                        if (typeof models[uid].get("error") === "function") {
                            models[uid].get("error")(xhttp);
                        }
                }
            }
        };
        var req = uri.split("@");
        var request = req.pop();
        httpverb = req.pop() || METHODS.read;
        xhttp.onreadystatechange = stateChanged;
        xhttp.open(httpverb, request, true);
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
            SELF_KRASNY.property("sessionModel", prop.uid, true);
        }
        var tmpmodel = new Model(prop);
        models[uid] = tmpmodel;
        models[uid].collection = [];
        if (tmpmodel.get("auto")) {
            firstModelSync.push({
                uid: tmpmodel.getUID(),
                uri: SELF_KRASNY.property("config").api + tmpmodel.getUID()
            });
        }
    };

    var _createView = function (prop, uid) {
        prop["uid"] = uid;
        var tmpview = new View(prop);
        views[tmpview.getUID()] = tmpview;
        if (tmpview.property("path").search("#") === 0) {
            var viewhtml = document.getElementById(tmpview.property("path"));
            _renderView(tmpview.getUID(), viewhtml);
        } else {
            viewTemplates.push({
                uid: tmpview.getUID(),
                uri: tmpview.property("path")
            });
        }
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

    var _renderView = function (uid, html) {
        views[uid].init(html);
    };

    var _authModel = function (values, callback, m) {
        _restAdapter(m.getUID(), _formatURI(METHODS.create, m, true), values,
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
        return base + "@" + SELF_KRASNY.property("config").api + "/" + (session ?
            "session/" : "") + uri + token;
    };

    var _forIn = function (coll, fn) {
        Object.keys(coll).forEach(function (o) {
            fn(coll[o], o);
        });
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
        LOCAL_STORAGE.remove = function (i) {
            delete _storageColl[i];
        };
        return LOCAL_STORAGE;
    };

    var Type = function (args) {
        if (!args.uid) throw new Error(args.type +
            " needs an uid predefined property");
        var SELF_TYPE = this;
        var _UID = args.uid;
        var _PROPERTYES = {};
        Object.keys(args).forEach(function (k) {
            _PROPERTYES[k] = args[k] === _UID ? undefined : args[k];
        });
        SELF_TYPE.getUID = function () {
            return _UID;
        };
        SELF_TYPE.property = function (k, v) {
            if (typeof v !== "undefined") {
                _PROPERTYES[k] = v;
            }
            return _PROPERTYES[k];
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
            };

            SELF_MODEL.isAuth = function () {
                return currentSessionToken !== null;
            };
        }

        SELF_MODEL.Instance = function (raw) {
            var INST = Type.call(this, args);
            _forIn(SELF_MODEL.get("defaults"), function (v, k) {
                INST.property(k, raw[k] || v, true);
            });
            _forIn(SELF_MODEL.property("methods") || {}, function (v, k) {
                INST[k] = v;
            });

            INST.getJSON = function () {
                var pjo = {};
                _forIn(SELF_MODEL.property("defaults"), function (m, k) {
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

        SELF_MODEL.search = function (k, v) {
            SELF_MODEL.set("scope", SELF_MODEL.collection.filter(
                function (i) {
                    return i.property(k).indexOf(v) > -1
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
            if (SELF_MODEL.local) {
                SELF_MODEL.local.read();
                return;
            }
            _getResource(SELF_MODEL.getUID(), _formatURI(METHODS.read,
                SELF_MODEL),
                _fetchModel);
        };

        SELF_MODEL.create = function (values, callback) {
            if (SELF_MODEL.local) {
                SELF_MODEL.local.create(values);
                callback();
                return;
            }
            _restAdapter(SELF_MODEL.getUID(), _formatURI(METHODS.create,
                SELF_MODEL), values, callback);
        };

        SELF_MODEL.update = function (i, values, callback) {
            if (SELF_MODEL.local) {
                SELF_MODEL.local.update(i, values);
                callback();
                return;
            }
            _restAdapter(SELF_MODEL.getUID(), _formatURI(METHODS.update,
                SELF_MODEL, false, i), values,
                callback);
        };

        SELF_MODEL.remove = function (i, callback) {
            if (SELF_MODEL.local) {
                SELF_MODEL.local.remove(i);
                callback();
                return;
            }
            _restAdapter(SELF_MODEL.getUID(), _formatURI(METHODS.delete,
                SELF_MODEL, false, i),
                undefined,
                callback);
        };

        SELF_MODEL.when = function (action, handler) {
            SELF_MODEL.lifecycle.addSubscriber(action, handler);
        };

        SELF_MODEL.force = function (action, prop) {
            SELF_MODEL.lifecycle.fire(action, prop);
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
                    funct: handler
                });
            };
            SELF_LIFECYCLE.fire = function (action) {
                actions.forEach(function (a) {
                    if (action === a.type && typeof a.funct === "function") {
                        a.funct.call(currentController, SELF_MODEL);
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

        return Type.call(SELF_MODEL, args);
    };

    var View = function (args) {
        var SELF_VIEW = this;
        args.type = TYPES.view;

        SELF_VIEW.init = function (html) {
            SELF_VIEW.property("html", html);
        };

        SELF_VIEW.invalidate = function (hardScoped) {
            SELF_VIEW.clear();
            hardScoped = hardScoped || {};
            if (SELF_KRASNY.property("i18n")) {
                hardScoped.i18n = SELF_KRASNY.property("i18n");
            }
            SELF_VIEW.property("el", document.body.querySelector(SELF_VIEW.property(
                "root")), true);
            var compiledHtml = ejs.compile(SELF_VIEW.property("html"));
            if (hardScoped) {
                compiledHtml = compiledHtml(hardScoped);
            } else {
                compiledHtml = compiledHtml();
            }
            SELF_VIEW.property("el").innerHTML = compiledHtml;
            SELF_VIEW.listen();
        };

        SELF_VIEW.listen = function () {
            _forIn(SELF_VIEW.property("events") || {}, function (handler, ev) {
                ev = ev.split(" ");
                handler = handler.split(" ");
                _forIn(SELF_VIEW.property("el").querySelectorAll(ev[1]),
                    function (htmlElement) {
                        if (typeof htmlElement === "object") {
                            htmlElement.addEventListener(ev[0], function (e) {
                                SELF_VIEW[handler[0]].call(
                                    currentController,
                                    SELF_VIEW,
                                    e.target,
                                    e
                                );
                            });
                        }
                    });
            });
        };

        SELF_VIEW.render = function () {
            _getResource(SELF_VIEW.getUID(), SELF_VIEW.property("path"),
                _renderView);
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
            var formEl = SELF_VIEW.property("el").querySelector(selector || "form");
            var inputs = formEl.querySelectorAll("input");
            var formObject = {};
            _forIn(inputs, function(inp){
                formObject[inp.getAttribute("name")] = inp.value;
            });
            return formObject;
        };

        return Type.call(SELF_VIEW, args);
    };

    SELF_KRASNY.navigate = function (controllerName) {
        _forIn(SELF_KRASNY.property("controllers"), function (controller, name) {
            if (controllerName === name) {
                window.location.hash = controller.route;
            }
        });
    };

    SELF_KRASNY.upload = function (formData, callback) {
        _restAdapter(SELF_KRASNY.property("config").fileinput, METHODS.create +
            "@" +
            SELF_KRASNY.property("config").api + "/" + SELF_KRASNY.property(
            "config").fileinput,
            formData, callback);
    };

    SELF_KRASNY.setConfiguration = function (c) {
        SELF_KRASNY.property("config", c, true);
    };

    SELF_KRASNY.addModel = function (n, c) {
        var _models = SELF_KRASNY.property("models") || {};
        _models[n] = c;
        SELF_KRASNY.property("models", _models, true);
    };

    SELF_KRASNY.addView = function (n, c) {
        var _views = SELF_KRASNY.property("views") || {};
        _views[n] = c;
        SELF_KRASNY.property("views", _views, true);
    };

    SELF_KRASNY.addController = function (n, c) {
        var _controllers = SELF_KRASNY.property("controllers") || {};
        _controllers[n] = c;
        SELF_KRASNY.property("controllers", _controllers, true);
    };

    SELF_KRASNY.start = function (init) {

        var _requiredKeys = ["views", "models", "controllers"];

        _requiredKeys.forEach(_checkRequiredKeys);

        _forIn(SELF_KRASNY.property("models"), _createModel);
        _retrieveSync(firstModelSync, _fetchModel, function () {
            _forIn(SELF_KRASNY.property("views"), _createView);
            _retrieveSync(viewTemplates, _renderView, function () {
                _forIn(SELF_KRASNY.property("controllers"), _prepareRoutes);
                window.location.hash = "/";
                window.onhashchange = _initController;
                _initController({
                    newURL: window.location.href
                });
            });
        });
        if (typeof init === "function") init();
    };

    return Type.call(SELF_KRASNY, MAIN);
};

if (typeof module !== "undefined") module.exports = new krasny(require("ejs"));
else window.K = new krasny(ejs);
