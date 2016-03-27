var krasny = function (ejs) {

    var SELF_KRASNY = this;

    var CONS = {
        templateEngine: ejs,
        MODELS: {},
        VIEWS: {},
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

    var viewTemplates = [];

    var _initController = function (e) {
        var _newHash;
        var _hashParams = {};
        if (e) {
            _newHash = e.newURL.split("#").pop();
        } else {
            _newHash = "/";
        }
        CONS.MODELS.forIn(function (m) {
            m.lay();
        });
        CONS.VIEWS.forIn(function (v) {
            if (typeof v.property("alwaysVisible") === "undefined") {
                v.clear();
            }
        });
        CONS.controllerMatchArray.forEach(function (contMatch) {
            if (contMatch.__regex.test(_newHash)) {
                CONS.currentController = contMatch;
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

    var _renderView = function (uid, html) {
        CONS.VIEWS[uid].init(html);
    };

    SELF_KRASNY.navigate = function (controllerName) {
        SELF_KRASNY.property("controllers").forIn(function (controller, name) {
            if (controllerName === name) {
                window.location.hash = controller.route;
            }
        });
    };

    SELF_KRASNY.upload = function (formData, callback) {
        SELF_KRASNY.utils. _restAdapter(SELF_KRASNY.property("config").fileinput, CONS.HTTP.create +
            "@" +
            SELF_KRASNY.property("config").api + "/" + SELF_KRASNY.property(
            "config").fileinput,
            formData, callback);
    };

    SELF_KRASNY.setConfiguration = function (c) {
        SELF_KRASNY.property("config", c);
    };

    SELF_KRASNY.addModel = function (n, c) {
        var _models = SELF_KRASNY.property("models") || {};
        _models[n] = c;
        SELF_KRASNY.property("models", _models);
    };

    SELF_KRASNY.addView = function (n, c) {
        var _views = SELF_KRASNY.property("views") || {};
        _views[n] = c;
        SELF_KRASNY.property("views", _views);
    };

    SELF_KRASNY.addController = function (n, c) {
        var _controllers = SELF_KRASNY.property("controllers") || {};
        _controllers[n] = c;
        SELF_KRASNY.property("controllers", _controllers);
    };

    SELF_KRASNY.start = function (init) {

        var _requiredKeys = ["views", "models", "controllers", "config"];

        _requiredKeys.forEach(_checkRequiredKeys);

        SELF_KRASNY.property("models").forIn(_createModel);
        SELF_KRASNY.property("views").forIn(_createView);
        SELF_KRASNY.utils._retrieveSync(viewTemplates, _renderView, function () {
            SELF_KRASNY.property("controllers").forIn(_prepareRoutes);
            window.location.hash = "/";
            window.onhashchange = _initController;
            _initController({
                newURL: window.location.href
            });
        });
        if (typeof init === "function") init.call(SELF_KRASNY);
    };

    var utilsConstructor = require("./utils/index.js");
    var builderConstructor = require("./builder/index.js");
    var typesConstructor = require("./types/index.js");

    SELF_KRASNY.utils = new utilsConstructor(SELF_KRASNY, CONS);

    SELF_KRASNY.builder = new builderConstructor(SELF_KRASNY, CONS);

    SELF_KRASNY.types = new typesConstructor(SELF_KRASNY, CONS);

    return SELF_KRASNY.types.Base.call(SELF_KRASNY, { uid: "main-app" });
};

if (typeof module !== "undefined") module.exports = new krasny(require("ejs"));
else window.K = new krasny(ejs);
