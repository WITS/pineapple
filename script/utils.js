/*
 * Utils.js - adds new methods to Elements
 * and defines some useful "constants"
 * Copyright (C) 2015  Ian Jones
 * http://pineapple.pub/LICENSE.txt
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

function EventListenerInfo(arg) {
	this.type = arg[0];
	this.func = arg[1];
	this.capture = arg[2] || false;
}

Element.prototype._addEventListener =
	Element.prototype.addEventListener;

Element.prototype.addEventListener = function(type,
	func, capture) {
	// If events hasn't been initialized, initialize it
	if (!this.events) this.events = new Array();
	// Store the event listener so it can be
	// removed later
	this.events.push(new EventListenerInfo(arguments));
	// Call the client's native method
	this._addEventListener(type, func, capture);
}

Element.prototype.unbindEventListeners = function(type) {
	if (!this.events) return;
	var type = type || "";
	var i = this.events.length;
	while (i --) {
		var e = this.events[i];
		if (type != "" && type != e.type) continue;
		this.removeEventListener(e.type,
			e.func, e.capture);
		this.events.splice(i, 1);
	}
}

Element.prototype.empty = function() { // Removes all children
	while (this.firstChild) {
		if (this.firstChild instanceof Element) {
			// Remove child's children
			this.firstChild.empty();
			// Remove events
			this.firstChild.unbindEventListeners();
		}
		// Remove child node
		this.removeChild(this.firstChild);
	}
}

Element.prototype.remove = function() {
	this.unbindEventListeners();
	if (this.parentElement != null) {
		this.parentElement.removeChild(this);
	}
}

Element.prototype.getStyle = function(name) {
	return this.currentStyle ? this.currentStyle[name] :
     getComputedStyle(this, null)[name];
}

// IE is dumb
if (typeof window.TouchList === 'undefined') TouchList = function(){};

HTMLCollection.prototype.forEach =
NodeList.prototype.forEach =
TouchList.prototype.forEach = function(fn) {
	for (var i = this.length; i --; ) {
		fn(this[i]);
	}
}

IS_TOUCH_DEVICE = !!(('ontouchstart' in window) ||
	window.DocumentTouch && document instanceof DocumentTouch);
var userAgent = navigator.userAgent;
IS_MOBILE = /(iPhone|iPod|iPad|Android|BlackBerry)/i.test(userAgent);
IS_FIREFOX = (/\bfirefox\//i.test(userAgent) &&
	!/\bseamonkey\//i.test(userAgent));
IS_CHROME = (/\bchrome\//i.test(userAgent) &&
	!/\b(?:chromium|edge)\//i.test(userAgent));
IS_SAFARI = (/\bsafari\//i.test(userAgent) &&
	!/\b(?:chrome|chromium)\//i.test(userAgent));
IS_OPERA = (/\b(?:opera|opr)\//i.test(userAgent));
IS_WEBKIT = (IS_CHROME || IS_SAFARI || IS_OPERA);
IS_MSIE = (/\b(?:MSIE|Trident)\b/i.test(userAgent));
IS_MSIE_9 = (userAgent.indexOf("MSIE 9") != -1);
IS_EDGE = (userAgent.indexOf("Edge") != -1);

// Check HTML on load
window.addEventListener("load", function() {
	// Add classes to the body
	var userAgentList = ["touch-device", "mobile", "firefox", "chrome", "safari", "opera",
		"webkit", "msie", "msie-9", "edge"];
	for (var i = userAgentList.length; i --; ) {
		var className = userAgentList[i];
		if (window["IS_" + className.toUpperCase().replace(/-/g, '_')]) {
			document.body.addClass(className);
		}
	}
});

FLOAT_NUM_REGEX = "(?:\\d+\\.?\\d*|\\d*\\.\\d+)";
FRACTION_REGEX = FLOAT_NUM_REGEX + "(?:/" +
	FLOAT_NUM_REGEX + ")?";
NEG_FRACTION_REGEX = "-?" + FLOAT_NUM_REGEX +
	"(?:/-?" + FLOAT_NUM_REGEX + ")?";
RADICAL_FACTOR_REGEX = "\\(?" + NEG_FRACTION_REGEX +
	"\\)?\\^\\(?1\\/" + FLOAT_NUM_REGEX + "\\)?"