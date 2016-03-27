/**
 * Created by ciroreed on 3/23/16.
 */

window.onload = function(){
	window.components = require("./../builder");

	var layout = new components.HLAYOUT;
	var textview1 = new components.TEXTVIEW;
	var textview2 = new components.TEXTVIEW;

	textview1.setText("basura");
	textview2.setText("mierda");

	layout.defineRoot();

	layout.attach(textview1);
	layout.attach(textview2);
}