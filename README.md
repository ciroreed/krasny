# krasny

krasny is a lightweight framework that has two dependencies:

- https://github.com/mde/ejs
- https://github.com/jquery/jquery

krasny is under developement, feel free to contribute.

How to use it.

In browser as script.

> place the script after jquery and ejs. Then follow the guide.

As npm package in node or using browserify:

> npm install krasny [--save]. npm krasny will download the dependencies to work as spected.

### guide

K is defined as a global variable containing the framework instance when scripts loads.

methods
- _.app_ : @param Object configuration
must be called to create an application. One object parameter is mandatory where you must define models, views and controller for this application:

Here is a running example -> http://ciroreed.net:8080
