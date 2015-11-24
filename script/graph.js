/*
 * Graph.js - classes for visually
 * representing equations/expressions
 * on Cartesian planes
 * Copyright (C) 2015  Ian Jones
 * http://pineapple.pub/LICENSE.txt
 */

SVG_NS = "http://www.w3.org/2000/svg";

CartesianGraph = function(json) {
	var json = json || {};
	if (json.equation) this.equation_str = json.equation;
	if (json.independent) this.independent = json.independent;
	this.queue = new Array(); // FIFO stack for rendering
	var elem = this.element = document.createElementNS(SVG_NS, "svg");
	elem.className = "cartesian-graph";
	elem.setAttribute("xmlns", SVG_NS);
	elem.setAttribute("version", "1.1");
	elem.setAttribute("viewBox", "0 0 1000 1000");
	elem.setAttribute("preserveAspectRatio", "xMidYMid meet");
	var g = this.group = document.createElementNS(SVG_NS, "g");
	g.setAttribute("stroke", "black");
	g.setAttribute("stroke-width", "4em");
	g.setAttribute("transform", "translate(500, 500)");
	elem.appendChild(g);
}

CartesianGraph.prototype.equation = "0";
CartesianGraph.prototype.timeout = -1;
CartesianGraph.prototype.scale = 40;
CartesianGraph.prototype.offsetX = 0;
CartesianGraph.prototype.offsetY = 0;

// When this is true, the graph will stop all rendering
CartesianGraph.prototype.stop = false;

// This variable stores the independent variable to
// change if one exists for this graph
CartesianGraph.prototype.independent = "";

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

CartesianGraph.prototype.render = function() {
	// Make sure this element is still on the DOM
	if (this.stop) {
		this.queue.splice(0);
		this.stop = true;
		return;
	}
	if (!this.queue.length) { // Begin rendering
		// Create the first line
		var left_val = this.calculatePoint(-20);
		var right_val = this.calculatePoint(20);
		var line = document.createElementNS(SVG_NS, "line");
		line.setAttribute("x1", -500);
		line.setAttribute("y1", left_val * -25);
		line.setAttribute("x2", 500);
		line.setAttribute("y2", right_val * -25);
		this.group.appendChild(line);
		this.queue.push(line);
	} else { // Render this specific point
		var elem = this.queue.splice(0, 1)[0];
		var x1 = +elem.getAttribute("x1") * 0.04;
		var x2 = +elem.getAttribute("x2") * 0.04;
		// Find the new point and build around it
		var new_x = (x2 + x1) * 0.5;
		var new_val = this.calculatePoint(new_x);
		var line = document.createElementNS(SVG_NS, "line");
		line.setAttribute("x1", elem.getAttribute("x1"));
		line.setAttribute("y1", elem.getAttribute("y1"));
		line.setAttribute("x2", new_x * 25);
		line.setAttribute("y2", new_val * -25);
		elem.setAttribute("x1", new_x * 25);
		elem.setAttribute("y1", new_val * -25);
		this.group.insertBefore(line, elem);
		// console.log(x1 + " + " + x2 + " -> (" + new_x + "," + new_val + ")");
		if (x2 - x1 > 0.5) {
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