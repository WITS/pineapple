/*
 * Utils.js - adds new methods to Elements
 * and defines some useful "constants"
 * Copyright (C) 2015  Ian Jones
 * http://pineapple.help/LICENSE.txt
 */

Element.prototype.hasClass = function(className) {

	return (new RegExp("\\b(?!-)" + className + "\\b(?!-)"
		).test(this.className));
}

Element.prototype.addClass = function(className) {

	if (!this.hasClass(className)) {
		this.className +=
			(this.className.length ? " " : "") +
			className;
	}
}

Element.prototype.appendTextNode = function(text) {
	var node = document.createTextNode(text);
	this.appendChild(node);
}

Element.prototype.removeClass = function(className) {

	this.className = this.className.replace(
		new RegExp("\\b(?!-)" + className + "\\b(?!-)", "g"),
			"").trim().replace(/\s{2,}/g, " ");
}

Element.prototype.toggleClass = function(className) {

	if (this.hasClass(className)) {
		this.removeClass(className);
	} else {
		this.addClass(className);
	}
}

Element.prototype.events = new Array();

function EventListenerInfo(arg) {
	this.type = arg[0];
	this.func = arg[1];
	this.capture = arg[2] || false;
}

Element.prototype._addEventListener =
	Element.prototype.addEventListener;

Element.prototype.addEventListener = function(type,
	func, capture) {
	// Store the event listener so it can be
	// removed later
	this.events.push(new EventListenerInfo(arguments));
	// Call the client's native method
	this._addEventListener(type, func, capture);
}

Element.prototype.empty = function() { // Removes all children
	while (this.firstChild) {
		if (this.firstChild instanceof Element) {
			// Remove child's children
			this.firstChild.empty();
			// Remove events
			var i = this.firstChild.events.length;
			while (i --) {
				var e = this.firstChild.events[0];
				this.firstChild.removeEventListener(e.type,
					e.func, e.capture);
			}
		}
		// Remove child node
		this.removeChild(this.firstChild);
	}
}

IS_MOBILE = /(iPhone|iPod|iPad|Android|BlackBerry)/i.test(
	navigator.userAgent);
FLOAT_NUM_REGEX = "(?:\\d+\\.?\\d*|\\d*\\.\\d+)";
FRACTION_REGEX = FLOAT_NUM_REGEX + "(?:/" +
	FLOAT_NUM_REGEX + ")?";
NEG_FRACTION_REGEX = "-?" + FLOAT_NUM_REGEX +
	"(?:/-?" + FLOAT_NUM_REGEX + ")?";