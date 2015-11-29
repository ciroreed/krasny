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

K is defined as a global variable containing the framework instance when scripts loads.

methods
- _.app_ : @param Object configuration
must be called to create an application. One object parameter is mandatory where you must define models, views and controller for this application:

Example:

``` javascript
      K.app({
        models: [
          {
            uid: 'todo',
            defaults: {
              id: 0,
              value: '',
              done: 'false',
              timestamp: ''
            },
            sorting: {
              done: 'true'
            },
            methods: {
              summary: function(){
                var str = "";
                str.concat(this.get("id"));
                str.concat("\n");
                str.concat(this.get("value"));
                str.concat("\n");
                str.concat(this.get("timestamp"));
                return str;
              }
            }
          }
        ],
        views: [
          {
            uid: 'todocreate',
            path: './templates/todocreate.tpl',
            root: '.todo-create',
            events: {
              'click .btn-completed': 'filter target',
              'click .btn-active': 'filter target',
              'click .btn-all': 'filter target',
              'click .btn-search': 'toggle .control-bar',
              'keyup .search-text': 'search target',
              'click .new': 'submit .todo-value'
            }
          },
          {
            uid: 'todolist',
            path: './templates/todolist.tpl',
            root: '.todo-list',
            scope: 'todo',
            events: {
              'change .item-list': 'saveText target',
              'click input[type=checkbox]': 'saveCheck target',
              'click .btn-remove': 'remove target'
            }
          }
        ],
        controller: function(m, v, $, _){
          var fetch = function(){
            m.todo.fetch();
          }
          v.todocreate.filter = function(e, target){
            if(target.hasClass('btn-completed')){
              m.todo.filter('done', 'true');
            }
            if(target.hasClass('btn-active')){
              m.todo.filter('done', 'false');
            }
            if(target.hasClass('btn-all')){
              m.todo.all();
            }
          }
          v.todocreate.search = function(e, target){
            m.todo.search('value', target.val());
          }
          v.todocreate.toggle = function(e, target){
            target.find('.toggle').toggleClass('control-hidden');
          }
          v.todocreate.submit = function(e, target){
            m.todo.create({value: target.val(), timestamp: new Date()}, fetch);
            target.val('');
          }
          v.todolist.saveText = function(e, target){
            var i = target.parent().attr('data-index');
            var text = target.val();
            m.todo.update(i, {value: text, timestamp: new Date()}, fetch);
          }
          v.todolist.saveCheck = function(e, target){
            var i = target.parent().attr('data-index');
            var checked = target.prop('checked');
            m.todo.update(i, {done: checked, timestamp: new Date()}, fetch);
          }
          v.todolist.remove = function(e, target){
            var i = target.parent().attr('data-index');
            m.todo.delete(i, fetch);
          }
        }
      });
```
This example is very self descriptive about how it works.
1. we define a model called 'todo'
2. we define two views:
  - todolist where each model will be showed
  - todocreate it only has an input where the todo item will be named.
3. we define a controller which receives 4 parameters:
@Object with each view that you defined.
@Object with each model that you defined.
@Object with jquery instance.
@Object with underscore instance.

Here is a running example -> http://ciroreed.net:8080
