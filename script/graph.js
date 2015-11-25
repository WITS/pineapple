/*
 * Graph.js - classes for visually
 * representing equations/expressions
 * on two-dimensional planes
 * Copyright (C) 2015  Ian Jones
 * http://pineapple.pub/LICENSE.txt
 */

SVG_NS = "http://www.w3.org/2000/svg";

CartesianGraph = function(json) {
	var json = json || {};
	if (json.equation) this.equation_str = json.equation;
	if (json.independent) this.independent = json.independent;
	this.queue = new Array(); // FIFO stack for rendering
	this.points = new Array(); // A list of independent variable values
	var elem = this.element = document.createElementNS(SVG_NS, "svg");
	elem.className = "cartesian-graph";
	elem.setAttribute("xmlns", SVG_NS);
	elem.setAttribute("version", "1.1");
	elem.setAttribute("viewBox", "0 0 1000 1000");
	elem.setAttribute("preserveAspectRatio", "xMidYMid meet");
	var g = this.group = document.createElementNS(SVG_NS, "g");
	g.setAttribute("stroke", "white");
	g.setAttribute("stroke-width", (4/this.scale) + "em");
	g.setAttribute("transform",
		"translate(500, 500) scale(" + this.scale + ")");
	elem.appendChild(g);
	// Events
	var _this = this;
	elem.addEventListener("mousedown", function(event) {
		var gScale = IS_FIREFOX || 1000 / this[GRAPH_WIDTH_VAR];
		var mouseX = gScale * event[(event.offsetX !== undefined ?
			"offset" : "layer") + "X"];
		var mouseY = gScale * event[(event.offsetY !== undefined ?
			"offset" : "layer") + "Y"];
		_this.mouseX = mouseX;
		_this.mouseY = mouseY;
		_this.mouseDown = true;
	});
	window.addEventListener("mouseup", function() {
		_this.mouseDown = false;
	});
	window.addEventListener("blur", function() {
		_this.mouseDown = false;
	});
	elem.addEventListener("mousemove", function(event) {
		// console.log(event);
		if (!_this.mouseDown) return false;
		var gScale = IS_FIREFOX || 1000 / this[GRAPH_WIDTH_VAR];
		var mouseX = gScale * event[(event.offsetX !== undefined ?
			"offset" : "layer") + "X"];
		var mouseY = gScale * event[(event.offsetY !== undefined ?
			"offset" : "layer") + "Y"];
		console.log(mouseX);
		// Pan
		_this.setPosition(_this.offsetX -
			(mouseX - _this.mouseX) / _this.scale,
			_this.offsetY - (mouseY - _this.mouseY) / _this.scale);
		// Update the grid / axes and start
		// rendering the new region (if necessary)
		_this.updateRegion();
		// Update the last mouse position
		_this.mouseX = mouseX;
		_this.mouseY = mouseY;
	});
	elem.addEventListener("wheel", function(event) {
		event.preventDefault();
		var gScale = IS_FIREFOX || 1000 / this[GRAPH_WIDTH_VAR];
		var mouseX = gScale * event[(event.offsetX !== undefined ?
			"offset" : "layer") + "X"];
		var mouseY = gScale * event[(event.offsetY !== undefined ?
			"offset" : "layer") + "Y"];
		// Update the last mouse position
		_this.mouseX = mouseX;
		_this.mouseY = mouseY;
		var change = Math.abs(event.deltaY) / event.deltaY;
		if (change < 0) {
			_this.setPosition(_this.offsetX -
				(500 - mouseX) * 0.25 / _this.scale,
				_this.offsetY - (500 - mouseY) * 0.25 / _this.scale);
		}
		_this.setScale(_this.scale * (1 - 0.25 * change));
		// Update the grid / axes and start
		// rendering the new region (if necessary)
		_this.updateRegion();
	});
	// Touch events
	if (IS_TOUCH_DEVICE) {
		elem.addEventListener("touchstart", function(event) {
			var gScale = IS_FIREFOX || 1000 / this[GRAPH_WIDTH_VAR];
			var all = event.touches;
			all.forEach(function(t) {
				t.x = t.clientX * gScale;
				t.y = t.clientY * gScale;
			});
			if (all.length == 1) { // One?
				var t1 = all[0];
				_this.mouseX = t1.x;
				_this.mouseY = t1.y;
			} else if (all.length >= 2) { // Two?
				var t1 = all[0];
				var t2 = all[1];
				_this.mouseX = (t1.x + t2.x) * 0.5;
				_this.mouseY = (t1.y + t2.y) * 0.5;
				_this.touchDistance = Math.sqrt(
					Math.pow(t2.x - t1.x, 2) +
					Math.pow(t2.y - t1.y, 2));
			}
		});
		elem.addEventListener("touchmove", function(event) {
			event.preventDefault();
			var gScale = IS_FIREFOX || 1000 / this[GRAPH_WIDTH_VAR];
			var all = event.touches;
			all.forEach(function(t) {
				t.x = t.clientX * gScale;
				t.y = t.clientY * gScale;
			});
			if (all.length == 1) { // One?
				var t1 = all[0];
				// Pan
				_this.setPosition(_this.offsetX -
					(t1.x - _this.mouseX) / _this.scale,
					_this.offsetY - (t1.y - _this.mouseY) / _this.scale);
				// Update the grid / axes and start
				// rendering the new region (if necessary)
				_this.updateRegion();
				// Update variables
				_this.mouseX = t1.x;
				_this.mouseY = t1.y;
			} else if (all.length >= 2) { // Two?
				var t1 = all[0];
				var t2 = all[1];
				var mouseX = (t1.x + t2.x) * 0.5;
				var mouseY = (t1.y + t2.y) * 0.5;
				// Pan
				_this.setPosition(_this.offsetX -
					(mouseX - _this.mouseX) / _this.scale,
					_this.offsetY - (mouseY - _this.mouseY) / _this.scale);
				// Zoom
				var touchDistance = Math.sqrt(
					Math.pow(t2.x - t1.x, 2) +
					Math.pow(t2.y - t1.y, 2));
				_this.setScale(_this.scale * touchDistance / _this.touchDistance);
				// Update the grid / axes and start
				// rendering the new region (if necessary)
				_this.updateRegion();
				// Update variables
				_this.mouseX = mouseX;
				_this.mouseY = mouseY;
				_this.touchDistance = touchDistance;
			}
		});
		elem.addEventListener("touchend", function(event) {
			var all = event.touches;
			var gScale = 1000 / this[GRAPH_WIDTH_VAR];
			all.forEach(function(t) {
				t.x = t.clientX * gScale;
				t.y = t.clientY * gScale;
			});
			if (all.length == 1) { // One?
				var t1 = all[0];
				_this.mouseX = t1.x;
				_this.mouseY = t1.y;
			} else if (all.length >= 2) { // Two?
				var t1 = all[0];
				var t2 = all[1];
				_this.mouseX = (t1.x + t2.x) * 0.5;
				_this.mouseY = (t1.y + t2.y) * 0.5;
				_this.touchDistance = Math.sqrt(
					Math.pow(t2.x - t1.x, 2) +
					Math.pow(t2.y - t1.y, 2));
			} // Otherwise, who cares?
		});
	}
}

CartesianGraph.prototype.equation = "0";
CartesianGraph.prototype.timeout = -1;
CartesianGraph.prototype.scale = 25;
CartesianGraph.prototype.offsetX = 0;
CartesianGraph.prototype.offsetY = 0;
CartesianGraph.prototype.mouseDown = false;
CartesianGraph.prototype.mouseX = 0;
CartesianGraph.prototype.mouseY = 0;
CartesianGraph.prototype.touchDistance = 0;

// This variable stores the independent variable to
// change if one exists for this graph
CartesianGraph.prototype.independent = "";

// When this is true, the graph will stop all rendering
CartesianGraph.prototype.stop = function() {
	this.queue.splice(0);
	if (this.timeout != null) clearTimeout(this.timeout);
	this.timeout = null;
};

// Gets the value of the dependent variable when the
// independent variable is n
CartesianGraph.prototype.calculatePoint = function(n) {
	// Make sure everything will be approximated
	for (var key in Config.preferences) {
		Config.preferences[key] = false;
	}
	Config.showModules = false;
	// Calculate the approximate value
	var expr = new Equation({
		text: this.equation_str
	});
	if (this.independent) expr.replace(this.independent, n.toString());
	expr.simplify();
	var value = NaN;
	if (expr.right.valueOf() instanceof Fraction) {
		value = expr.right.valueOf().toNumber();
	}
	// Revert to the user's original preferences
	Config.showModules = true;
	Config.loadLocalStorage();
	return value;
}

CartesianGraph.prototype.render = function(x1, x2) {
	// Make sure this element is still on the DOM
	if ((!this.points.length && !this.queue.length) || x1 || x2) { // Begin rendering
		// Create the first line
		var x1 = x1 || (-500 / this.scale + this.offsetX);
		var left_val = this.calculatePoint(x1);
		var x2 = x2 || (500 / this.scale + this.offsetY);
		var right_val = this.calculatePoint(x2);
		var line = document.createElementNS(SVG_NS, "line");
		line.id = x1;
		line.setAttribute("x1", x1);
		line.setAttribute("y1", -left_val);
		line.setAttribute("x2", x2);
		line.setAttribute("y2", -right_val);
		this.group.appendChild(line);
		this.queue.push(line);
		this.points.push(x1);
	} else if (this.queue.length) { // Render this specific point
		var elem = this.queue.splice(0, 1)[0];
		var recursive_scale = 1 / this.scale;
		var x1 = +elem.getAttribute("x1");
		var x2 = +elem.getAttribute("x2");
		// Find the new point and build around it
		var new_x = (x2 + x1) * 0.5;
		var new_val = this.calculatePoint(new_x);
		var line = document.createElementNS(SVG_NS, "line");
		line.id = x1;
		line.setAttribute("x1", elem.getAttribute("x1"));
		line.setAttribute("y1", elem.getAttribute("y1"));
		if (new_val != NaN) {
			line.setAttribute("x2", new_x);
			line.setAttribute("y2", -new_val);
			elem.id = new_x;
			this.points.push(new_x);
			elem.setAttribute("x1", new_x);
			elem.setAttribute("y1", -new_val);
		} else { // Improve this once derivates / asymptotes are implemented
			var y1 = +elem.getAttribute("y1");
			var y2 = +elem.getAttribute("y2");
			var y_sum = y1 + y2;
			line.setAttribute("x2", new_x - 0.5);
			line.setAttribute("y2", y_sum * -0.5);
			elem.id = new_x + 0.5;
			this.points.push(new_x + 0.5);
			elem.setAttribute("x1", new_x + 0.5);
			elem.setAttribute("y1", y_sum * -0.5);
		}
		this.group.insertBefore(line, elem);
		// Limit the smoothness of curves (until components are faster)
		// at calculating values
		if (x2 - x1 > Math.max(12.5 * recursive_scale, 2e-4)) {
			this.queue.push(line);
			this.queue.push(elem);
		}
	}
	if (!this.queue.length) return;
	var _this = this;
	this.timeout = setTimeout(function() {
		_this.render();
	}, 1);
}

// Update the position
CartesianGraph.prototype.setPosition = function(x, y) {
	this.offsetX = x;
	this.offsetY = y;
	var g = this.group;
	var cx = 500 - x * this.scale;
	var cy = 500 - y * this.scale;
	g.setAttribute("transform", "translate(" + cx + "," +
		cy + ") scale(" + this.scale + ")");
}

// Update the scale
CartesianGraph.prototype.setScale = function(n) {
	this.scale = Math.max(5, Math.min(n, 8e6));
	// console.log("Scaled to " + this.scale);
	var g = this.group;
	g.setAttribute("stroke-width", (4/this.scale) + "em");
	var cx = 500 - this.offsetX * this.scale;
	var cy = 500 - this.offsetY * this.scale;
	g.setAttribute("transform", "translate(" + cx + "," +
		cy + ") scale(" + this.scale + ")");
}

// Get a line by its left position / x1 value
CartesianGraph.prototype.getLine = function(x1) {
	return this.element.getElementById(x1);
}

// Update the rendering queue and free up memory
CartesianGraph.prototype.updateRegion = function() {
	// Determine what lines should be rejoined
	// Which should be broken down further
	// And where new lines should be created
	// *TODO: Update the axes
	this.stop();
	this.queue.splice(0);
	var l_bound = this.offsetX - 500 / this.scale - 0.5;
	var r_bound = this.offsetX + 500 / this.scale + 0.5;
	var min_x = Infinity;
	var max_x = -Infinity;
	var recursive_scale = 1 / this.scale;
	this.points.sort(function(a,b) {
		return a - b;
	});
	console.log("Optimizing " + this.points.length + " points");
	for (var i = this.points.length; i --; ) {
		var line = this.getLine(this.points[i]);
		// If some error happens here, get over it
		if (!line) continue;
		var in_region = (line.x2.baseVal.value > l_bound || line.x1.baseVal.value < r_bound);
		// Does this have more detail than necessary
		if (!in_region) {
			this.points.splice(i, 1);
			this.group.removeChild(line);
			continue;
		}
		min_x = Math.min(line.x1.baseVal.value, min_x);
		max_x = Math.max(line.x2.baseVal.value, max_x);
		while (line.x2.baseVal.value - line.x1.baseVal.value <= 15 * recursive_scale) {
			if (i == 0) break;
			var line2 = this.getLine(this.points[i - 1]);
			if (!line2) break;
			console.log("Removing P#" + line2.id);
			line.id = line2.id;
			line.setAttribute("x1", line2.x1.baseVal.value);
			line.setAttribute("y1", line2.y1.baseVal.value);
			this.group.removeChild(line2);
			this.points.splice(i, 1);
			-- i;
		}
		// If the x is in the region at least partly
		if (line.x2.baseVal.value - line.x1.baseVal.value > 12.5 * recursive_scale) {
			this.queue.push(line);
		}
	}
	console.log("Resulting points: " + this.points.length);
	// If the newline is neccesary, create it
	if (l_bound < min_x) {
		var x1 = l_bound;
		var x2 = min_x;
		console.log("From " + x1 + " to " + x2);
		if (Math.abs(x2 - x1) > 1e-5 && x2 - x1 > 12.5 * recursive_scale) {
			var left_val = this.calculatePoint(x1);
			var right_val = this.calculatePoint(x2);
			var line = document.createElementNS(SVG_NS, "line");
			line.id = x1;
			line.setAttribute("x1", x1);
			line.setAttribute("y1", -left_val);
			line.setAttribute("x2", x2);
			line.setAttribute("y2", -right_val);
			console.log("--- (" + x1 + "," + (-left_val) + ")  to (" +
				x2 + "," + (-right_val) + ")");
			this.group.appendChild(line);
			this.queue.push(line);
			this.points.push(x1);
		}
	}
	if (r_bound > max_x) {
		var x1 = max_x;
		var x2 = r_bound;
		console.log("From " + x1 + " to " + x2);
		if (Math.abs(x2 - x1) > 1e-5 && x2 - x1 > 12.5 * recursive_scale) {
			var left_val = this.calculatePoint(x1);
			var right_val = this.calculatePoint(x2);
			var line = document.createElementNS(SVG_NS, "line");
			line.id = x1;
			line.setAttribute("x1", x1);
			line.setAttribute("y1", -left_val);
			line.setAttribute("x2", x2);
			line.setAttribute("y2", -right_val);
			console.log("--- (" + x1 + "," + (-left_val) + ")  to (" +
				x2 + "," + (-right_val) + ")");
			this.group.appendChild(line);
			this.queue.push(line);
			this.points.push(x1);
		}
	}
	this.render();
}

window.addEventListener("load", function() {
	GRAPH_WIDTH_VAR = document.body.clientWidth ? "clientWidth" : "offsetWidth";
});