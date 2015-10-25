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
  var events = function(evname, uid, instid, data){
    return new CustomEvent(evname + '-' + uid + '-' + instid, {detail: data});
  }
  var View = function(prop){
    var selfView = this;
    selfView.cfg = prop;
    selfView.events = [];
    if(typeof selfView.cfg.uid === 'undefined') throw new Error('View must have `uid` property');
    selfView.uid = selfView.cfg.uid;
    selfView.init = function(html){
      selfView.el = self.$(selfView.cfg.root).children();
      self._.each(selfView.events, function(v){
        var tmp = v.split('-');
        selfView.el.on(tmp[0], tmp[1], function(){
          dispatchEvent(events(v, selfView.uid, "", this));
        });
      });
      selfView.html = html;
    }
    selfView.listen = function(ev){
      selfView.events.push(ev);
    }
    selfView.update = function(){
      self.render(selfView);
    }
  }
  var Model = function(prop){
    var selfModel = this;
    selfModel.cfg = prop;
    if(typeof selfModel.cfg.uid === 'undefined') throw new Error('Model must have `uid` property');
    selfModel.uid = selfModel.cfg.uid;
    selfModel.construct = function(fresh, i){
      var instance = function(){
        var inst = this;
        inst.uid = self.uid;
        inst.attr = {}
        inst.get = function(k){
          return inst.attr[k];
        }
        inst.set = function(k, v){
          dispatchEvent(events('change', inst.uid, i, {prop: k, newvalue: v}));
          dispatchEvent(events('change', inst.uid, "", {prop: k, newvalue: v}));
          return inst.attr[k] = v;
        }
        self._.each(selfModel.cfg.defaults, function(v, k){
          if(typeof v !== 'function') inst.attr[k] = fresh[k] || v; else inst[k] = v;
        });
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
  self.filterModel = function(m, predicate){
    return self._.filter(self[m.uid], function(m){ return self._.isMatch(m.attr, predicate) });
  }
  self.handle = function(evname, sub, callback){
    var subid, obj;
    if(sub instanceof Model){
      if(sub instanceof Array) subid = "", obj = sub[0].uid; else subid = self[sub.uid].indexOf(sub), obj = sub.uid;
    }
    if(sub instanceof View){
      subid = "", obj = sub.uid;
      sub.listen(evname);
    }
    addEventListener(evname + '-' + obj + '-' + subid, function(ev){
      callback(sub, ev.detail);
    });
  }
  self.fetch = function(m){
    var fetchlist = [];
    if(m) fetchlist.push(m); else fetchlist = self._.toArray(self.models);
    self._.each(fetchlist, function(m){
      _connect('GET', config.api + m.uid, function(resp, status){
        self._.each(resp,function(o, i){
          self[m.uid].push(self.models[m.uid].construct(o, i));
        });
      });
    });
  }
  self.render = function(v){
    var renderlist = [];
    if(v) renderlist.push(v); else renderlist = self._.toArray(self.views);
    self._.each(renderlist, function(v){
      if(v.html){
        self.$(v.cfg.root).html(self._.template(v.html));
      }else{
        _connect('GET', v.cfg.path, function(html){
          self.$(v.cfg.root).html(self._.template(html));
          v.init(html);
        });
      }
    });
  }
  self.start = function(){
    if(!self.build) throw new Error('build function must be declared');
    self.build();
    if(!self.init) throw new Error('init function must be declared');
    self.init();
  }
}

module.exports = new K;
