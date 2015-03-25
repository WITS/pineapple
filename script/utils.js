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

function date_to_abs_str(d) {
	var return_val = "";

	switch (d.getMonth()) {
		case 0: return_val += "January"; break;
		case 1: return_val += "February"; break;
		case 2: return_val += "March"; break;
		case 3: return_val += "April"; break;
		case 4: return_val += "May"; break;
		case 5: return_val += "June"; break;
		case 6: return_val += "July"; break;
		case 7: return_val += "August"; break;
		case 8: return_val += "September"; break;
		case 9: return_val += "October"; break;
		case 10: return_val += "November"; break;
		case 11: return_val += "December"; break;
	}

	return_val += " " + d.getDate() + ", " +
		d.getFullYear();

	return return_val;
}

FLOAT_NUM_REGEX = "(?:\\d+\\.?\\d*|\\d*\\.\\d+)";
FRACTION_REGEX = FLOAT_NUM_REGEX + "(?:/" +
	FLOAT_NUM_REGEX + ")?";
NEG_FRACTION_REGEX = "-?" + FLOAT_NUM_REGEX +
	"(?:/-?" + FLOAT_NUM_REGEX + ")?";