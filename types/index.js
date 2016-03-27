var TYPES = function(krasnyApp, CONS){

    var SELF_TYPES = this;

    var SELF_KRASNY = krasnyApp;

    var SELF_CONS = CONS;

    SELF_TYPES.LocalStorageAdapter = function (uid) {
        var LOCAL_STORAGE = this;
        var _storageColl = [];

        LOCAL_STORAGE.read = function () {
            SELF_KRASNY.utils._fetchModel(uid, _storageColl);
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
                    SELF_KRASNY.utils._formatURI(SELF_CONS.METHODS.create, SELF_MODEL, true),
                    values,
                    callback);
            };

            SELF_MODEL.isAuth = function () {
                return SELF_CONS.currentSessionToken !== null;
            };
        }

        SELF_MODEL.Instance = function (raw) {
            var INST = SELF_TYPES.Base.call(this, args);
            SELF_MODEL.property("defaults").forIn(function (v, k) {
                INST.property(k, raw[k] || v);
            });
            SELF_MODEL.property("methods").forIn(function (v, k) {
                INST[k] = v;
            });

            INST.getJSON = function () {
                var pjo = {};
                SELF_MODEL.property("defaults").forIn(function (m, k) {
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
            SELF_KRASNY.utils._getResource(
                SELF_MODEL.getUID(),
                SELF_KRASNY.utils._formatURI(SELF_CONS.METHODS.read,
                SELF_MODEL), SELF_KRASNY.utils._fetchModel);
        };

        SELF_MODEL.create = function (values, callback) {
            if (SELF_MODEL.local) {
                SELF_MODEL.local.create(values);
                callback();
                return;
            }
            SELF_KRASNY.utils._restAdapter(
                SELF_MODEL.getUID(),
                SELF_KRASNY.utils._formatURI(SELF_CONS.METHODS.create,
                SELF_MODEL), values, callback);
        };

        SELF_MODEL.update = function (i, values, callback) {
            if (SELF_MODEL.local) {
                SELF_MODEL.local.update(i, values);
                callback();
                return;
            }
            SELF_KRASNY.utils._restAdapter(
                SELF_MODEL.getUID(),
                SELF_KRASNY.utils._formatURI(SELF_CONS.METHODS.update,
                SELF_MODEL, false, i), values,
                callback);
        };

        SELF_MODEL.remove = function (i, callback) {
            if (SELF_MODEL.local) {
                SELF_MODEL.local.remove(i);
                callback();
                return;
            }
            SELF_KRASNY.utils._restAdapter(
                SELF_MODEL.getUID(),
                SELF_KRASNY.utils._formatURI(SELF_CONS.METHODS.remove,
                SELF_MODEL, false, i),
                undefined,
                callback);
        };

        SELF_MODEL.when = function (action, handler) {
            SELF_MODEL.lifecycle.addSubscriber(action, handler);
        };

        SELF_MODEL.force = function (action) {
            SELF_MODEL.lifecycle.fire(action);
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
            SELF_LIFECYCLE.fire = function (action) {
                actions.forEach(function (a) {
                    if (action === a.type && typeof a.fn === "function") {
                        a.fn.call(SELF_KRASNY.currentController, SELF_MODEL);
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

        SELF_VIEW.init = function (html) {
            SELF_VIEW.property("html", html);
        };

        SELF_VIEW.invalidate = function (hardScoped) {
            SELF_VIEW.clear();
            hardScoped = hardScoped || {};
            if (SELF_KRASNY.property("i18n")) {
                hardScoped.i18n = SELF_KRASNY.property("i18n");
            }
            SELF_VIEW.property("el", document.body.querySelector(SELF_VIEW.property("root")));
            var compiledHtml = SELF_CONS.templateEngine.compile(SELF_VIEW.property("html"));
            compiledHtml = compiledHtml(hardScoped);
            SELF_VIEW.property("el").innerHTML = compiledHtml;
            SELF_VIEW.listen();
        };

        SELF_VIEW.listen = function () {
            SELF_VIEW.property("events").forIn(function (handler, ev) {
                ev = ev.split(" ");
                handler = handler.split(" ");
                SELF_VIEW.property("el").querySelectorAll(ev[1]).forIn(function (htmlElement) {
                        if (typeof htmlElement === "object") {
                            htmlElement.addEventListener(ev[0], function (e) {
                                SELF_VIEW[handler[0]].call(
                                    SELF_KRASNY.currentController,
                                    SELF_VIEW,
                                    e.target,
                                    e
                                );
                            });
                        }
                    });
            });
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
            inputs.forIn(function(inp){
                formObject[inp.getAttribute("name")] = inp.value;
            });
            return formObject;
        };

        return SELF_TYPES.Base.call(SELF_VIEW, args);
    };
    return SELF_TYPES;
}

module.exports = TYPES;