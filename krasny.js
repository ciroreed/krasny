/**
 * @class krasny receives underscore and jquery as parameters
 */
var krasny = function(underscore, jquery){

	/**
	* @constant SELF_KRASNY, Object which references 'this' inside the main function, avoiding 'this overlap'
	*/
	var SELF_KRASNY = this;

	/**
	* @constant HTTP, Object with 4 properties, to reference 4 http verbs as Strings
	*/
	var HTTP = {
	get: 	'GET',
	post: 	'POST',
	put: 	'PUT',
	delete: 'DELETE'
	};

	/**
	* @var models, Object to store predefined model instances as properties.
	*/
	var models = {};

	/**
	* @var views, Object to store predefined view instances as properties.
	*/
	var views = {};

	/**
	* @var config, Object to store relevant information about the built application as the domain or path to the rest API
	*/
    var config = {};

	/**
	* @var modelData, Array to fill with the model resources temporally when application is built
	*/
	var modelData = [];

	/**
	* @var viewTemplates, Array to fill with the view resources temporally when application is built
	*/
	var viewTemplates = [];

	/**
	* @function getResource, Function used to retrieve a resource through ajax. Receives the following parameters:
	* @param uid, String representing the unique id for this resource
	* @param resource, String representing the path or url for this resource
	* @param callback, Function to be executed when resource is available
	*/
	var getResource = function(uid, resource, callback){
		restAdapter(uid, resource, undefined, callback);
	}

	/**
	* @function restAdapter, Function used to retrieve a resource through several methods depending on uri
	* @param uid, String representing the unique id for this resource
	* @param uri, String formatted like <method:resource>, if there is no method the argument treated as a resource
	* @param body, Object which contains the request body to send
	* @param call, Function to be executed for each resource when ever it will available <call(uid, response)>
	* @param args, Array with queue of resources to be accessed
	* @param recursiveFn, Function which is the parent stack where arguments are treated
	* @param callback, Function is the last call that will be executed at the end of the stack
	*/
	var restAdapter = function(uid, uri, body, call, args, recursiveFn, callback){
		var req = uri.split(':');
		var httpverb;
		if(req[0] === HTTP.delete || req[0] === HTTP.put || req[0] === HTTP.post) httpverb = req[0];
		req = req.pop();
		jquery.ajax({
		  url: req,
		  method: httpverb || HTTP.get,
		  data: body || {},
		  success: function(data){
			call(uid, data);
			if(typeof recursiveFn !== 'undefined') recursiveFn(args, call, callback);
		  }
		});
	}

	/**
	* @function retrieveSync, Function which synchronous retrieve resources used by the application
	* recursive call will slice the resourceArray until length is 0
	* @param resurceArray, Array filled with Objects <{uid: resourceuid, uri: resourcepath}>
	* @param call, Function to be executed for each resource when ever it will available <call(uid, response)>
	* @param callback, Function is the last call that will be executed at the end of the stack
	*/
	var retrieveSync = function(resourceArray, call, callback){
		if(resourceArray.length){
		  var resource = resourceArray.shift();
		  restAdapter(resource.uid, resource.uri, undefined, call, resourceArray, retrieveSync, callback);
		} else callback();
	}

	/**
	* @class View
	* View represent a component where the models are rendered in the DOM, Views can be invalidated to
	* keep IU updated, it also are invalidated if attached models change. A View can have a defined scope
	* property, this object can be accessed in the template file to place data in the View. Views also
	* have a list of events that are triggered using jquery selectors.
	*
	* Views are defined in the main method 'app' which receives a plain Object which must have a 'views'
	* property, this property is an Array of configurations for each View. The format is the following:
	* 	{
  *   	uid: 'myView',
  *       path: './templates/myViewTempl.tpl',
  *       root: '.myElementPlaceHolder',
  *       events: {
  *         'keyup .search-text': 'search target',
  *         'click .new': 'submit .todo-value'
  *     	}
  *	},
	* @param prop, previous Object.
	*/
	var View = function(prop){

		/**
		* @constant SELF_VIEW, Object which references 'this' inside the View class, avoiding 'this overlap'
		*/
		var SELF_VIEW = this;

		/**
		* Check if uid is empty or undefined
		*/
		if(typeof prop.uid === 'undefined') throw new Error('View must have `uid` property');

		/**
		* @property SELF_VIEW.*, assign all properties to main class
		*/
		underscore.each(prop, function(v, k){ SELF_VIEW[k] = v });

		/**
		* @method SELF_VIEW.init, Function invalidates the view and assign the html to a property
		* @param html, String with the template
		*/
		SELF_VIEW.init = function(html){
			SELF_VIEW.invalidate(html);
			SELF_VIEW.html = html;
		}

		/**
		* @function listen, Function alias to iterate through View declared events:
		*        events: {
		*         'keyup .search-text': 'search target',
		*         'click .new': 'submit .todo-value'
		*     	}
		* Key contains the jquery event that will be handled for this view at the given css3 selector.
		* Value is the name of the function that will handle this event in Controller.
		* IE: '<jquery event> <selector>': '<handler> <jquery element as argument in handler (target is the event context)>'
		*/
		var listen = function(){
			underscore.each(SELF_VIEW.events || {}, function(handler, ev){
				ev = ev.split(" ");
				handler = handler.split(" ");
				var context = SELF_VIEW.el.find(handler[1]);
				SELF_VIEW.el.find(ev[1]).on(ev[0], function(e){
					if(handler[1] === 'target') context = e.target;
					SELF_VIEW[handler[0]](e, jquery(context), SELF_VIEW.el);
				});
			});
		}

    /**
    * @function SELF_VIEW.invalidate, Function to repaint inner DOM elements.
    * @param html, String with the whole template.
    */
		SELF_VIEW.invalidate = function(html){
			SELF_VIEW.el = jquery(SELF_VIEW.root);
			var compiledHtml = underscore.template(html || SELF_VIEW.html);
			if(SELF_VIEW.scope) compiledHtml = compiledHtml({scope: models[SELF_VIEW.scope].scope});
			jquery(SELF_VIEW.root).html(compiledHtml);
			if(!html) listen();
		}

    /**
    * @method SELF_VIEW.render, Function alias to render specific view
    */
		SELF_VIEW.render = function(){
		  render(SELF_VIEW);
		}
  }

  /**
  * @class Model
  * Models are Objects with contains application data, they keep data up to date
  * with the server. Models are entities which represent the behavior of this
  * entity. A model can contain custom methods to handle its data. IE:
  * {
  *   uid: 'todo',
  *    defaults: {
  *      id: 0,
  *      value: '',
  *      done: 'false',
  *      timestamp: ''
  *    },
  *    sorting: {
  *      done: 'true'
  *    },
  *    methods: {
  *      sayHello: function(){
  *        return "hi";
  *      },
	*			 summary: function(){
	*				 return this.get("value") + " created at: " + this.get("timestamp");
	*			 }
  *    }
  *  }
  * @param prop, preceding Object
  */
	var Model = function(prop){

    /**
		* @constant SELF_MODEL, Object which references 'this' inside the View class, avoiding 'this overlap'
		*/
		var SELF_MODEL = this;

    /**
    * @var scopedView, store the view which need this model at view rendering
    */
    var scopedView;

    /**
    * @var SELF_MODEL.cfg, property to reference initial values
    */
    SELF_MODEL.cfg = prop;

		if(typeof SELF_MODEL.cfg.uid === 'undefined') throw new Error('Model must have `uid` property');

    /**
    * @var SELF_MODEL.uid, String to reference the model as unique key
    */
		SELF_MODEL.uid = SELF_MODEL.cfg.uid;

    /**
    * @function invalidateScopedView, Function to force the scopedView to render again
    */
		var invalidateScopedView = function(){
		  scopedView = scopedView || underscore.find(views, underscore.matcher({scope: SELF_MODEL.uid}));
		  if(scopedView){
			scopedView.invalidate();
		  }
		}

    /**
    * @method SELF_MODEL.construct, Function to build an instance of the model with the data of the adapter
    * @param fresh, Object AKA response from the server
    */
		SELF_MODEL.construct = function(fresh){
      /**
      * @function instance which is the constructor of the class
      */
		  var instance = function(){
				var inst = this;
				inst.uid = SELF_MODEL.uid;

	      /**
	      * @var inst.attr is an Object to store defaults properties
	      */
				inst.attr = {};

	      /**
	      * @method model.get, Function to return a property from the model
	      */
				inst.get = function(k){
				  return inst.attr[k];
				}

				/**
				* @method model.set, Function to update a property from the model
				*/
				inst.set = function(k, v){
				  inst.attr[k] = v;
				}

				/**
				* The following two functions fill with properties the current instance,
				* both methods and values.
				*/
				underscore.each(SELF_MODEL.cfg.defaults, function(v, k){
				  inst.attr[k] = fresh[k] || v;
				});
				underscore.each(SELF_MODEL.cfg.methods, function(v, k){
				  inst[k] = v;
				});
		  };

			/**
			* We return the created instance as an object to store in models array.
			* This array is injected as a parameter in Controller function.
			*/
		  return new instance();
		}

		/**
		* @method SELF_MODEL.search, Function to filter collection by some attribute value.
		* Comparison is done using underscore:filter. However the criteria isn't exclusive.
		* Meaning that the result collection will contain values that match similar criteria.
		* Calling this function also invalidate the associated view, if exists.
		* @param k, key of the property
		* @param v, needle of the property
		*/
		SELF_MODEL.search = function(k, v){
		  SELF_MODEL.scope = underscore.filter(models[prop.uid].collection, function(m){ return m.get(k).indexOf(v) > -1 });
		  invalidateScopedView();
		}

		/**
		* @method SELF_MODEL.filter, Function to filter collection by some attribute value.
		* Comparison is done using underscore:filter. However the criteria IS exclusive.
		* Meaning that the result collection will have ONLY values that match the value @param.
		* Calling this function also invalidate the associated view, if exists.
		* @param v, value of the property
		* @param k, key of the property
		*/
		SELF_MODEL.filter = function(k, v){
		  SELF_MODEL.scope = underscore.filter(models[prop.uid].collection, function(m){ return m.get(k) === v });
		  invalidateScopedView();
		}

		/**
		* @method SELF_MODEL.all, Function to scope all the model instances, clearing current
		* filters if they exists.
		* Calling this function also invalidate the associated view, if exists.
		*/
		SELF_MODEL.all = function(){
		  if(SELF_MODEL.cfg.sorting){
				SELF_MODEL.sort(SELF_MODEL.cfg.sorting);
		  }
		  SELF_MODEL.scope = models[prop.uid].collection;
		  invalidateScopedView();
		}

		/**
		* @method SELF_MODEL.sort, Function sorts a collection.
		* @param crit, normally accessed by default through the model definition.
		*/
		SELF_MODEL.sort = function(crit){
		  var key = underscore.keys(crit).shift();
		  var predicate = function(m){ return m.get(key) === crit[key]};
		  models[prop.uid].collection = underscore.sortBy(models[prop.uid].collection, predicate);
		}

		/**
		* @method SELF_MODEL.fetch, Function alias to fetch.
		*/
		SELF_MODEL.fetch = function(){
		  fetch(SELF_MODEL);
		}

		/**
		* @method SELF_MODEL.create, Function to create a new instance through user
		* user input.
		* @param values, Object with the associative key:values.
		* @param callback, Function callback can be provided to be handled by the restAdapter.
		*/
		SELF_MODEL.create = function(values, callback){
		  var uri = HTTP.post + ':' + config.api + SELF_MODEL.uid;
		  restAdapter(SELF_MODEL.uid, uri, values, callback);
		}

		/**
		* @method SELF_MODEL.update, Function to update a existing instance in the
		* collection through user user input.
		* @param i, integer existing index in the collection.
		* @param values, Object with the associative key:values.
		* @param callback, Function callback can be provided to be handled by the restAdapter.
		*/
		SELF_MODEL.update = function(i, values, callback){
		  var uri = HTTP.put + ':' + config.api + SELF_MODEL.uid + '/' + models[prop.uid].collection[i].get('id');
		  restAdapter(SELF_MODEL.uid, uri, values, callback);
		}

		/**
		* @method SELF_MODEL.delete, Function to delete a existing instance in the
		* collection through user user input.
		* @param i, integer existing index in the collection.
		* @param callback, Function callback can be provided to be handled by the restAdapter.
		*/
		SELF_MODEL.delete = function(i, callback){
		  var uri = HTTP.delete + ':' + config.api + SELF_MODEL.uid + '/' + models[prop.uid].collection[i].get('id');
		  restAdapter(SELF_MODEL.uid, uri, undefined, callback);
		}
	}

	/**
	* @function createModel, Function to create a Model with its default properties.
	* @param prop, properties predefined.
	*/
  var createModel = function(prop){
    var tmpmodel = new Model(prop);
    models[tmpmodel.uid] = tmpmodel;
    models[tmpmodel.uid].collection = [];
    modelData.push({uid: tmpmodel.uid, uri: config.api + tmpmodel.uid});
  }

	/**
	* @function createView, Function to create a View with its default properties.
	* @param prop, properties predefined.
	*/
  var createView = function(prop){
    var tmpview = new View(prop);
    views[tmpview.uid] = tmpview;
    viewTemplates.push({uid: tmpview.uid, uri: tmpview.path });
  }

	/**
	* @function fetchModel, Function used to synchronize a Model collection
	* against the database values obtained through restAdapter.
	* @param uid, String unique identifier of the model.
	* @param resp, Object obtained from database.
	*/
  var fetchModel = function(uid, resp){
    models[uid].collection = [];
    underscore.each(resp, function(f){
      models[uid].collection.push(models[uid].construct(f));
    });
    models[uid].all();
  }

		/**
		* @function renderView, Function used to 'compile' view template, injecting
		* scoped model if exist, in the DOM. Where root element is defined.
		* @param uid, String unique identifier of the model.
		* @param html, String template normally is received from a file.
		*/
  var renderView = function(uid, html){
    views[uid].init(html);
  }

	/**
	* @function fetch, Function used to synchronize a Model collection.
	* @param m, Object Model instance.
	*/
  var fetch = function(m){
    getResource(m.uid, config.api + m.uid, fetchModel);
  }

	/**
	* @function render, Function used to rebuild a View updating changes if existing.
	* @param v, Object View instance.
	*/
  var render = function(v){
    getResource(v.iud, v.path, renderView);
  }

	/**
	* @function listen, Function to create listeners to predefined events.
	* @param v, Object View instance.
	*/
  var listen = function(v){
    v.listen();
  }

	/**
	* @method app, Function build the application with the given @param configuration
	*/
  SELF_KRASNY.app = function(configuration){
    config.api = configuration.apihost || '/';
    underscore.each(configuration.models, createModel);
    retrieveSync(modelData, fetchModel, function(){
      underscore.each(configuration.views, createView);
      retrieveSync(viewTemplates, renderView, function(){
        configuration.controller(models, views, jquery, underscore);
        underscore.each(views, listen);
      });
    });
  }
}
if(typeof module !== 'undefined') module.exports = new krasny(require('underscore'), require('jquery')); else window.K = new krasny(_, $);
