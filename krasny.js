var K = function(){
  var self = this;
  self._ = require('underscore');
  self.$ = require('jquery');
  self.VERSION = '1.0.0';
  self.models = {}
  self.views = {}
  var config;
  var _connect = function(httpverb, url, callback){
    self.$.ajax({
      url: url,
      method: httpverb
    })
    .done(callback)
    .error(function(){
      throw new Error('Request failed for ' + url);
    });
  }
  var events = function(evname, uid, instid){
    return new Event(evname + '-' + uid + '-' + instid);
  }
  var View = function(prop){
    var self = this;
    self.cfg = prop;
    if(typeof self.cfg.uid === 'undefined'){
      throw new Error('View must have `uid` property');
    }
    self.uid = self.cfg.uid;
  }
  var Model = function(prop){
    var self = this;
    self.cfg = prop;
    if(typeof self.cfg.uid === 'undefined'){
      throw new Error('Model must have `uid` property');
    }
    self.uid = self.cfg.uid;
    self.construct = function(fresh, i){
      var instance = function(){
        var inst = this;
        inst.uid = self.uid;
        inst.attr = {}
        inst.get = function(k){
          return inst.attr[k];
        }
        inst.set = function(k, v){
          dispatchEvent(events('change', inst.uid, i));
          dispatchEvent(events('change', inst.uid, ""));
          return inst.attr[k] = v;
        }
        for(var p in self.cfg.defaults) {
          if(typeof self.cfg.defaults[p] !== 'function'){
            inst.attr[p] = fresh[p] || self.cfg.defaults[p];
          }else{
            inst[p] = self.cfg.defaults[p];
          }
        }
      };
      return new instance();
    }
  }
  self.config = function(cfg){
    config = cfg;
  }
  self.createModel = function(prop){
    var tmpmodel = new Model(prop);
    self.models[prop.uid] = tmpmodel;
    self[tmpmodel.uid] = [];
    return tmpmodel;
  }
  self.createView = function(prop){
    var tmpview = new View(prop);
    self.views[prop.uid] = tmpview;
    return tmpview;
  }
  self.handle = function(evname, sub, callback){
    var subid, model;
    if(sub instanceof Array){
      subid = "";
      model = sub[0].uid;
    }else{
      subid = self[sub.uid].indexOf(sub);
      model = sub.uid;
    }
    addEventListener(evname + '-' + model + '-' + subid, function(){
      callback(sub);
    });
  }
  self.fetch = function(m){
    _connect('GET', config.api + m.uid, function(resp, status){
      self._.each(resp,function(o, i){
        self[m.uid].push(self.models[m.uid].construct(o, i));
      });
    });
  }
  self.render = function(v){
    _connect('GET', v.cfg.path, function(html){
      self.$(v.cfg.root).html(self._.template(html));
    });
  }
}

module.exports = new K;
