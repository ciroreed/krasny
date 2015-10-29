var krasny = function(underscore, jquery){
  var self = this;
  self.VERSION = '0.0.5';
  var models = {};
  var views = {};
  var config = {};
  var modelData = [];
  var viewTemplates = [];
  var getResource = function(uid, resource, callback){
    connect(uid, resource, callback);
  }
  var connect = function(uid, uri, call, args, recursiveFn, callback){
    jquery.get(uri, function(data){
      call(uid, data);
      if(typeof recursiveFn !== 'undefined') recursiveFn(args, call, callback);
    });
  }
  var retrieveSync = function(resourceArray, call, callback){
    if(resourceArray.length){
      var resource = resourceArray.shift();
      connect(resource.uid, resource.uri, call, resourceArray, retrieveSync, callback);
    } else callback();
  }
  var View = function(prop){
    var selfView = this;
    selfView.cfg = prop;
    selfView.events = [];
    if(typeof selfView.cfg.uid === 'undefined') throw new Error('View must have `uid` property');
    selfView.uid = selfView.cfg.uid;
    selfView.init = function(html){
      selfView.invalidate(html);
      selfView.el = jquery(selfView.cfg.root).children();
      selfView.html = html;
    }
    selfView.invalidate = function(html){
      var compiledHtml = underscore.template(html || selfView.html);
      if(selfView.cfg.scope) compiledHtml = compiledHtml({scope: models[selfView.cfg.scope].scope});
      jquery(selfView.cfg.root).html(compiledHtml);
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
          return inst.attr[k] = v;
        }
        underscore.each(selfModel.cfg.defaults, function(v, k){
          inst.attr[k] = fresh[k] || null;
        });
        underscore.each(selfModel.cfg.methods, function(v, k){
          inst[k] = v;
        });
      };
      return new instance();
    }
    selfModel.search = function(k, v){
      selfModel.scope = underscore.filter(models[prop.uid].collection, function(m){ return m.get(k).indexOf(v) > -1 });
    }
    selfModel.filter = function(k, v){
      selfModel.scope = underscore.filter(models[prop.uid].collection, function(m){ return m.get(k) === v });
    }
    selfModel.all = function(){
      selfModel.scope = models[prop.uid].collection;
    }
    selfModel.fetch = function(){
      fetch(selfModel);
    }
  }
  var createModel = function(prop){
    var tmpmodel = new Model(prop);
    models[tmpmodel.uid] = tmpmodel;
    models[tmpmodel.uid].collection = [];
    modelData.push({uid: tmpmodel.uid, uri: config.api + tmpmodel.uid});
  }
  var createView = function(prop){
    var tmpview = new View(prop);
    views[tmpview.uid] = tmpview;
    viewTemplates.push({uid: tmpview.uid, uri: tmpview.cfg.path});

  }
  var fetchModel = function(uid, resp){
    underscore.each(resp, function(o, i){
      models[uid].collection.push(models[uid].construct(o, i));
    });
    models[uid].all();
  }
  var renderView = function(uid, html){
    views[uid].init(html);
  }
  var fetch = function(m){
    getResource(m.uid, config.api + m.uid, fetchModel);
  }
  var render = function(v){
    getResource(v.iud, v.cfg.path, renderView);
  }
  self.app = function(configuration){
    config.api = configuration.apihost || '/';
    underscore.each(configuration.models, createModel);
    retrieveSync(modelData, fetchModel, function(){
      underscore.each(configuration.views, createView);
      retrieveSync(viewTemplates, renderView, function(){
        configuration.controller(models, views);
      });
    });
  }
}

if(typeof module !== 'undefined') module.exports = new krasny(require('underscore'), require('jquery')); else window.K = new krasny(_, $);
