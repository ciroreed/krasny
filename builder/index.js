var COMPONENTS = function(krasnyApp, c){

    var components = this;

    var SELF_KRASNY = krasnyApp;

    var SELF_CONS = c;

    var componentsAutoincrement = 0;

    var componentUniqueId = function(){
        return ++componentsAutoincrement;
    };

    var BaseComponent = function(base){
        var BC = this;
        var props = {};
        BC.rootElement = document.createElement(base);
        BC.base = base;
        BC.uid = base + componentUniqueId();
        BC.children = {};
        BC.attach = function(ch){
            BC.children[ch.uid] = ch;
            BC.render();
        };
        BC.detach = function(ch){
            delete BC.children[ch.uid];
            BC.render();
        };
        BC.css = function(k, v){
            BC.rootElement.style[k] = v;
        };
        BC.prop = function(k, v){
            if(typeof v === "undefined"){
                return props[k];
            }else{
                props[k] = v;
            }
            return null;
        };
        BC.render = function(inner){
            var htmlTemp = "";
            var childrenKeys = Object.keys(BC.children);
            childrenKeys.forEach(function(chk){
                htmlTemp += BC.children[chk].render(true);
            });
            if(inner){
                return BC.rootElement.outerHTML;
            }else{
                BC.rootElement.innerHTML = htmlTemp;
                return null;
            }
        };
        return BC;
    };

    components.VLAYOUT = function(){
        var SUBCOMP = BaseComponent.call(this, "LAYOUT");
        SUBCOMP.defineRoot = function(){
            document.body.appendChild(SUBCOMP.rootElement);
        };
        SUBCOMP.css("display", "block");
        return SUBCOMP;
    };
    components.HLAYOUT = function(){
        var SUBCOMP = BaseComponent.call(this, "LAYOUT");
        SUBCOMP.rootElement = document.createElement(SUBCOMP.base);
        SUBCOMP.defineRoot = function(){
            document.body.appendChild(SUBCOMP.rootElement);
        };
        SUBCOMP.css("display", "flex");
        return SUBCOMP;
    };
    components.TEXTVIEW = function(){
        var SUBCOMP = BaseComponent.call(this, "TEXTVIEW");
        SUBCOMP.rootElement = document.createElement(SUBCOMP.base);
        SUBCOMP.setText = function(string){
            SUBCOMP.rootElement.innerHTML = string;
        };
        SUBCOMP.getText = function(){
            return SUBCOMP.rootElement.innerHTML;
        };
        return SUBCOMP;
    };
    components.TEXTEDIT = function(){
        var SUBCOMP = BaseComponent.call(this, "INPUT");
        SUBCOMP.rootElement = document.createElement(SUBCOMP.base);
        SUBCOMP.setText = function(string){
            SUBCOMP.rootElement.innerHTML = string;
        };
        SUBCOMP.getText = function(){
            return SUBCOMP.rootElement.innerHTML;
        };
        return SUBCOMP;
    };
    components.NAVIGATION = function(){
        return BaseComponent.call(this);
    };
    components.BUTTON = function(){
        return BaseComponent.call(this);
    };

    //TODO create more components;
    return components;
};

module.exports = COMPONENTS;