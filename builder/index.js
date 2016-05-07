var COMPONENTS = function (krasnyApp, c) {

    var components = this;

    var SELF_KRASNY = krasnyApp;

    var SELF_CONS = c;

    var componentsAutoincrement = 0;

    var componentUniqueId = function () {
        return ++componentsAutoincrement;
    };

    var BaseComponent = function (base) {
        var BC = this;
        var props = {};
        BC.rootElement = document.createElement(base);
        BC.base = base;
        BC.uid = base + componentUniqueId();
        BC.children = {};
        BC.attach = function () {
            for(var i = 0; i < arguments.length; i++){
                BC.children[arguments[i].uid] = arguments[i];
                BC.render();
            }
        };
        BC.detach = function (ch) {
            delete BC.children[ch.uid];
            BC.render();
        };
        BC.css = function (k, v) {
            BC.rootElement.style[k] = v;
        };
        BC.attr = function (k, v) {
            if (typeof v === "undefined") {
                return BC.rootElement.getAttribute(k);
            } else {
                BC.rootElement.setAttribute(k, v)
            }
            return null;
        };
        BC.prop = function (k, v) {
            if (typeof v === "undefined") {
                return props[k];
            } else {
                props[k] = v;
            }
            return null;
        };
        BC.render = function (inner) {
            var htmlTemp = "";
            var childrenKeys = Object.keys(BC.children);
            childrenKeys.forEach(function (chk) {
                htmlTemp += BC.children[chk].render(true);
            });
            if (inner) {
                return BC.rootElement.outerHTML;
            } else {
                BC.rootElement.innerHTML = htmlTemp;
                return null;
            }
        };
        return BC;
    };

    components.VLAYOUT = function () {
        var SUBCOMP = BaseComponent.call(this, "LAYOUT");
        SUBCOMP.rows = [];
        SUBCOMP.css("display", "block");
        SUBCOMP.defineRoot = function () {
            document.body.appendChild(SUBCOMP.rootElement);
        };
        SUBCOMP.defineRows = function(n){
            for(var i = 0; i < n; i++){
                SUBCOMP.rows.push(new components.ROW);
            }
        };
        return SUBCOMP;
    };
    components.HLAYOUT = function () {
        var SUBCOMP = new components.VLAYOUT;
        SUBCOMP.css("display", "flex");
        return SUBCOMP;
    };
    components.LISTVIEW = function(){
        var SUBCOMP = BaseComponent.call(this, "LISTVIEW");
        SUBCOMP.setAdapter = function(fnc){
            SUBCOMP.listAdapter = fnc;
        };
        SUBCOMP.renderInstances = function(instances){
            SUBCOMP.innerHTML = "";
            instances.forEach(function(i){
                var row = document.createElement("element");
                row.innerHTML = i[SUBCOMP.listAdapter];
                SUBCOMP.rootElement += row;
            });
        };
        return SUBCOMP;
    };
    components.ROW = function(){
        var SUBCOMP = BaseComponent.call(this, "ROW");
        SUBCOMP.css("margin", "auto");
        return SUBCOMP;
    };
    components.HBOX = function () {
        var SUBCOMP = BaseComponent.call(this, "BOX");
        SUBCOMP.css("display", "flex");
        return SUBCOMP;
    };
    components.VBOX = function () {
        var SUBCOMP = new components.HBOX;
        SUBCOMP.css("display", "block");
        return SUBCOMP;
    };
    components.CHECKBOX = function () {
        var SUBCOMP = BaseComponent.call(this, "CHECKBOX");
        var htmlStr = "<span><label></label><input type='checkbox'/></span>";
        SUBCOMP.rootElement.innerHTML = htmlStr;
        SUBCOMP.attr("type", "checkbox");
        SUBCOMP.setTextLabel = function(text){
            SUBCOMP.rootElement.querySelector("span label").innerHTML = text;
        };
        return SUBCOMP;
    };
    components.TEXTVIEW = function () {
        var SUBCOMP = BaseComponent.call(this, "TEXTVIEW");
        SUBCOMP.setText = function (string) {
            SUBCOMP.rootElement.innerHTML = string;
        };
        SUBCOMP.getText = function () {
            return SUBCOMP.rootElement.innerHTML;
        };
        return SUBCOMP;
    };
    components.TEXTEDIT = function () {
        var SUBCOMP = BaseComponent.call(this, "INPUT");
        SUBCOMP.setText = function (string) {
            SUBCOMP.rootElement.innerHTML = string;
        };
        SUBCOMP.getText = function () {
            return SUBCOMP.rootElement.innerHTML;
        };
        return SUBCOMP;
    };
    components.NAVIGATION = function () {
        return BaseComponent.call(this);
    };
    components.BUTTON = function () {
        return BaseComponent.call(this);
    };

    //TODO create more components;
    return components;
};

module.exports = COMPONENTS;