# krasny

krasny is a lightweight framework that has two dependencies:

- https://github.com/jashkenas/underscore
- https://github.com/jquery/jquery

krasny is under developement, feel free to contribute.

How to use it.

In browser as script.

> place the script after jquery and underscore. Then follow the guide.

As npm package in node or using browserify:

> npm install krasny [--save]. npm krasny will download the dependencies to work as spected.

### guide

K is defined as a global variable containing the fw instance when scripts loads.

methods
- _.app_ : @param Object configuration
must be called to create an application. One object parameter is mandatory where you must define models, views and controller for this application:

Example:

``` javascript
K.app({
        models: [
          {
            uid: 'person',
            defaults: {
              id: null,
              name: '',
              surname: '',
              age: 0,
              address: '',
              city: ''
            }
            methods: {
              summary: function(){
                return this.get("name") + ' ' + this.get("surname") + ', ' + this.get("age");
              }
            }
          }
        ],
        views: [
          {
            uid: 'personlist',
            path: './views/main.tpl',
            root: '.person-list'
          },
          {
            uid: 'personsearch',
            path: './views/search.tpl',
            root: '.search-bar'
          }
        ],
        controller: function(m, v){
          K.scope = m.person.all();
          v.personsearch.handle('keyup-input[type=search]', function(el, ev){
            K.scope = m.person.search('name', el.value);
            v.personlist.render();
          });
        }
      });
```
This example is very self descriptive about how it works.
1. we define a model called 'person'
2. we define two views:
  - personlist prints one <p> for each 'person' that K.scope has ATM.
  - personsearch only has an input[type=search].
3. we define a controller which:
  - asign all the instances of model 'person' to K.scope.
  - listen in personsearch to any *keyup* at 'input[type=search]' and declares a handler which:
    - filter/search by name
    - asign the filter/search result to K.scope
    - render another time the view personlist therefore DOM is updated.

### API

*models*

- _.fetch_ :
updates the model collection against the defined datasource (RESTapi datasource definition..).
- _.all_ :
retrieve all the model instances in the model collection.
- _.search_ : @param String property, @param String value
filter the model collection with *softmatch*.
- _.filter_ : @param String property, @param String value
filter the model collection with *strictmatch*.

*views*

- _.invalidate_ :
compiles the html in the template unsing underscore's _.template method.

TODO ->
- fetch async but wait until all calls are performed
