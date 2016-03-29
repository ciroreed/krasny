#Krasny

>Krasny is a soft framework environment for npm which provides structure for fast developing apps.

Krasny has 3 components: models, views and controllers.

Models try to represent the data structure.

Views are what user sees.

Controllers are for listen events from views and perform request to the server to retrieve data.

---------
##How it works: 

(note: as a javascript framwwork krasny optionaly uses a node package named "krasny-server" which provides an APIrest service as a persistance layer of the project).

###Models

If we need to build a todo application we need to define at least one model, which represent the "todo" item, with, at least, the following properties: id, title, checked [,...].

krasny will create an Object that can be accessed at controllers functions.

This object has the following methods/properties:

-set(key, value): this method updates or creates a property in the model, this function triggers an "change" event to the LifeCycle of the model. it also updates the "change" attribute of the model with the provided key.

-get(key): this method returns the stored property.

-create(values, callback): this method creates a new instance of the model with the given values, if some value is not provided it will be initialize to its default. callback is the function to be performed when creation request is perform. This request is a POST request "/modelName --data (multipart)".

-update(id, values, callback): same as above, id represents the internal id of the model. This request is a PUT request "/modelName/:id --data (multipart)"

-delete(id, callback): performs a DELETE request "/modelName/:id"

-fetch(): performs a GET request "/modelName". Before this request, the model will internally update its collection and the scope property firing a "change" over scope or "read", both over LifeCycle.

-getInstance({prop: val}): search an instance with the provided criteria and returns it

-search(key, value): search for occurrences in all of the instances of the model, then update the scope property with them.

-getReference(key): returns an array with POJOS with only the id and the value of the provided key

-filter({key: value}): filter the collection of the model and update the scope property only with the models that apply for this criteria

-all(): update the scope property with all of the model instances, if defaultFilter exist it will be applied

-sort(crit, reverse): sort the instances in the scope property using the provided criteria, if reverse is true then the sorting is reversed upside

-force(action): launch the stored callback for the given action

-lay(): removes all the callbacks for this models

-when(action, callback): store a callback to be executed when action is fired. nowadays "create", "update", "read", "delete", "change" are available. 

(if model is "sessionModel" [session: true])
-authenticate(values, callback): try to login a model with the provided values 

-isAuth(): returns true if the model is logged

(model instance constructor)
-Instance(raw values): creates and return new model instance, for internal purposes.

###model declaration

A model is declared as plain object and added to the framework instance with "addModel" method. This is an example..
```javascript
{
  defaults: {
    id: 0,
    name: "",
    checked: 0,
    timestamp: 0
  },
  methods: {
    summary: function(){
      return this.property("id") + " - " + this.property("name") + this.property("checked") === 0 ? " done " : " not done";
    }
  },
  crud: {
    GET: function(todo[, authModel]){
      return todo;
    },
    PUT: function(){},
    DELETE: function(){},
    POST: function(todo[, authModel]){
      todo.timestamp = Date.now();
      return todo;
    }
  }
  [, session: true]
}
```
defaults entrie define which properties must have all the instances and its defaults values.
methods define utility fuctions that will inherit all of the instances, for example we can define validation or toString functions..
crud define a behavior for each interaction with the server, we can filter a get request having the session model as an argument or initialize some properties when creating the model, returning false will abort the operation/request.
session define if the model will act as login bridge, this means that can be used in crud operations with it self or other models and use isAuth method.
