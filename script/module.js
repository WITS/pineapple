modules = new Array();

Card = function(json) {
	var json = json || {};
	this.label = json.label || null;
	this.joined = json.joined || "none";
	this.color = json.color || "white";
	this.children = json.children || new Array();
	if (!(this.children instanceof Array)) {
		var child = this.children;
		this.children = new Array();
		this.children.push(child);
	}
	this.elementObj = null;
}

Card.prototype.element = function() {
	if (this.elementObj == null) {
		var elem = document.createElement("div");
		elem.addClass("card");
		this.elementObj = elem;

		// Add classes relevant to vars
		elem.addClass(this.color);
		if (/(both|top)/.test(this.joined)) {
			elem.addClass("joined-top");
		}
		if (/(both|bottom)/.test(this.joined)) {
			elem.addClass("joined-bottom");
		}

		// Add label
		if (this.label != null) {
			elem.setAttribute("data-label",
				this.label);
		}

		// Loop through children
		for (var x = 0, y = this.children.length;
			x < y; ++ x) {
			var child = this.children[x];
			elem.appendChild(child);
		}
	}
	return this.elementObj;
}

Module = function(json) {
	var json = json || {};
	var _element = this.element;
	this.type = json.type || "";
	this.title = json.title || null;
	this.joined = json.joined || "none";
	this.color = json.color || "white";
	this.steps = json.steps || new Array();
}
Module.prototype = new Card();
Module.prototype.push = function(step) {
	if (!(step instanceof ModuleStep)) {
		step = new ModuleStep(step);
	}
	this.steps.push(step);
}
Module.prototype.element = function() {
	if (this.elementObj == null) {
		var elem = document.createElement("div");
		elem.addClass("card");
		elem.addClass("no-padding");
		elem.addClass("module");
		elem.addClass(this.type + "-module");
		elem.addEventListener("click",
			function(event) {
			if (!event.target.hasClass(
				"title")) {
				return;
			}
			if (!event.target.parentElement.hasClass(
				"module")) {
				return;
			}

			elem.toggleClass("expanded");
		});
		this.elementObj = elem;

		// Add classes relevant to vars
		elem.addClass(this.color);
		if (/(both|top)/.test(this.joined)) {
			elem.addClass("joined-top");
		}
		if (/(both|bottom)/.test(this.joined)) {
			elem.addClass("joined-bottom");
		}

		// Add title
		if (this.title != null) {
			var title =
				document.createElement("div");
			title.addClass("title");
			title.innerHTML = this.title;
			elem.appendChild(title);
		}

		// Add steps
		for (var x = 0, y = this.steps.length,
			s_n = e_n = 0, embedded = null;
			x < y; ++ x) {
			var step = this.steps[x];
			if (!(step instanceof ModuleStep)) {
				step = new ModuleStep(step);
			}
			if (this.type != "simplify" &&
				step.type == "simplify") {
				if (embedded == null) {
					e_n = 0;
				}
				step.order = ++ e_n;
				var step_elem = step.element();
				step_elem.addClass("embedded");
				if (embedded == null) {
					embedded = document.createElement(
						"div");
					embedded.addClass("embedded-module");
					embedded.addClass("hidden");
					embedded.addEventListener("click",
						function() {
						this.toggleClass("hidden");
					});
					elem.appendChild(embedded);
				}
				embedded.appendChild(step_elem);
				if (x + 1 == y) {
					embedded.setAttribute("data-count",
						e_n);
				}
			} else {
				if (embedded != null) {
					embedded.setAttribute("data-count",
						e_n);
					embedded = null;
				}
				step.order = ++ s_n;
				elem.appendChild(step.element());
			}
		}
	}
	return this.elementObj;
}

ModuleStep = function(json) {
	this.order = json.order || 0;
	this.type = json.type || null;
	this.title = json.title || "Title";
	this.visual = json.visual || null;
	this.elementObj = null;
}
ModuleStep.prototype.element = function() {
	if (this.elementObj == null) {
		var elem = document.createElement("div");
		elem.addClass("module-step");
		elem.setAttribute("data-order",
			this.order);
		this.elementObj = elem;

		var content = document.createElement("div");
		content.addClass("content");
		elem.appendChild(content);

		var title = document.createElement("div");
		title.addClass("title");
		title.innerHTML = this.title;
		content.appendChild(title);

		if (!this.visual.hasClass("equation")) {
			var render = document.createElement("div");
			render.addClass("render");
			if (this.visual.hasClass("right-side")) {
				render.addClass("equation");
				render.addClass("right-side");
			} else if (this.visual.hasClass("left-side")) {
				render.addClass("equation");
				render.addClass("left-side");
			}
			render.appendChild(this.visual);
		} else {
			render = this.visual;
		}
		content.appendChild(render);
	}
	return this.elementObj;
}

function push_module_type(type) {
	// New module?
	if (modules.length) {
		var current_module =
			modules[modules.length - 1];
	} else {
		var current_module = {};
	}

	if (current_module.type != type &&
		(current_module.type == null ||
		type != "simplify")) {
		switch (type) {
			case "simplify":
				var title = "Simplify";
				break;
			case "isolate":
				var title = "Isolate " + json.variable;
				break;
			case "quadratic":
				var title = "Quadratic equation";
				type = "simplify";
				break;
			default:
				var title = "Title"; break;
		}
		current_module = new Module({
			type: type,
			title: title,
			joined: "both"
		});
		modules.push(current_module);
	}

	return current_module;
}

function push_module_step(json) {
	var current_module =
		push_module_type(json.type);
	current_module.push(json);
}