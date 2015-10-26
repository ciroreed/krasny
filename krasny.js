var krasny = function(underscore, jquery){
  var self = this;
  self.VERSION = '1.0.0';
  var _ = underscore || require('underscore');
  var $ = jquery || require('jquery');
  var models = {}
  var views = {}
  var config = {};
  var connect = function(httpverb, url, callback){
    $.ajax({
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
      selfView.el = $(selfView.cfg.root).children();
      _.each(selfView.events, function(v){
        var tmp = v.split('-');
        selfView.el.on(tmp[0], tmp[1], function(){
          dispatchEvent(events(v, selfView.uid, "", this));
        });
      });
      selfView.html = html;
    }
    selfView.handle = function(ev, handler){
      handle(selfView, ev, handler);
    }
    selfView.listen = function(ev){
      selfView.events.push(ev);
    }
    selfView.render = function(){
      render(selfView);
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
        _.each(selfModel.cfg.defaults, function(v, k){
          if(typeof v !== 'function') inst.attr[k] = fresh[k] || v; else inst[k] = v;
        });
      };
      return new instance();
    }
    selfModel.search = function(prop, val){
      return _.filter(selfModel.all(), function(m){ return m.get(prop).indexOf(val) > -1 });
    }
    selfModel.filter = function(predicate){
      return _.filter(selfModel.all(), function(m){ return _.isMatch(m.attr, predicate) });
    }
    selfModel.all = function(){
      return models[prop.uid].collection;
    }
    selfModel.fetch = function(){
      fetch(selfModel);
    }
  }
  var createModel = function(prop){
    var tmpmodel = new Model(prop);
    models[prop.uid] = tmpmodel;
    models[prop.uid].collection = [];
    tmpmodel.fetch();
  }
  var createView = function(prop){
    var tmpview = new View(prop);
    views[prop.uid] = tmpview;
    tmpview.render();
  }
  var handle = function(ctx, evname, callback){
    var ctxid, obj;
    if(ctx instanceof Model){
      if(ctx instanceof Array) ctxid = "", obj = ctx[0].uid; else ctxid = self[ctx.uid].indexOf(ctx), obj = ctx.uid;
    }
    if(ctx instanceof View){
      ctxid = "", obj = ctx.uid;
      ctx.listen(evname);
    }
    addEventListener(evname + '-' + obj + '-' + ctxid, function(ev){
      callback(ev.detail, ev);
    });
  }
  var fetch = function(m){
    connect('GET', config.api + m.uid, function(resp, status){
      _.each(resp,function(o, i){
        models[m.uid].collection.push(models[m.uid].construct(o, i));
      });
    });
  }
  var render = function(v){
    if(v.html){
      $(v.cfg.root).html(_.template(v.html));
    }else{
      connect('GET', v.cfg.path, function(html){
        $(v.cfg.root).html(_.template(html));
        v.init(html);
      });
    }
  }
  self.app = function(configuration){
    config.api = configuration.apihost || '/';
    _.each(configuration.models, createModel);
    _.each(configuration.views, createView);
    configuration.controller(models, views);
  }
}

if(typeof module !== 'undefined') module.exports = new krasny; else window.K = new krasny(_, $);
