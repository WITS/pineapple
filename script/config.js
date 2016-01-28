/*
 * Config.js - stores and manges user preferences
 * and memory (constants/functions)
 * Copyright (C) 2015 - 2016 Ian Jones
 * http://pineapple.pub/LICENSE.txt
 */

Config = function() {
	this.preferences = {
		angle: "deg",
		trig: true,
		e: true,
		pi: true,
		radical: true,
		fraction: true
	};
	this.constants = new Object();
	this.functions = new Object();
}

Config.prototype = new Card();

Config.prototype.joined = "both";
Config.prototype.showModules = true;
Config.prototype.renderInstances = 0;

Config.prototype.setPreference = function(key, value) {
	if (value == "true") value = true;
	if (value == "false") value = false;
	this.preferences[key] = value;
	this.updateLocalStorage();
}

Config.prototype.updateLocalStorage = function() {
	// TODO: Maybe make this more fancy in the future
	// Create a simple JSON version of the relevant data
	var json = {
		preferences: this.preferences,
		constants: this.constants,
		functions: this.functions
	};
	var json_string = JSON.stringify(json);
	// Save the relevant data in localStorage
	localStorage.setItem("pineapple-config", json_string);
}

Config.prototype.loadLocalStorage = function() {
	// Load the relevant data from localStorage, if it exists
	var data = localStorage.getItem("pineapple-config");
	if (data == null) return false;
	var json = eval('(' + data + ')');
	for (var type in json) {
		var group = json[type];
		for (var key in group) {
			this[type][key] = group[key];
		}
	}
}

Config.prototype.element = function(json) {
	var output = document.createDocumentFragment();
	var sections = ["functions", "constants", "preferences"];
	for (var i = sections.length; i --; ) {
		var section = sections[i];
		var elem = document.createElement("div");
		elem.addClass("card no-padding module config-module");
		elem.addEventListener("click", function(event) {
			if (!event.target.hasClass(
				"title")) {
				return;
			}
			if (!event.target.parentElement.hasClass(
				"module")) {
				return;
			}

			this.toggleClass("expanded");
		});

		// Add classes relevant to vars
		elem.addClass(this.color);
		if (/(both|top)/.test(this.joined)) {
			elem.addClass("joined-top");
		}
		if (/(both|bottom)/.test(this.joined)) {
			elem.addClass("joined-bottom");
		}

		// Title
		var title = document.createElement("div");
		title.addClass("title");
		title.innerHTML = section[0].toUpperCase() + section.substr(1);
		elem.appendChild(title);

		// Add relevant config stuff

		// Preferences
		if (section == "preferences") {
			for (var pref in this.preferences) {
				// If this preference wasn't relevant, ignore it
				if (json && !json.preferences[pref]) continue;
				// Create the card for this preference
				var pref_elem = document.createElement("div");
				pref_elem.addClass("config-group config-preference");
				// Add data to the card
				var data = ConfigPreferences[pref];
				// Title
				var title = document.createElement("div");
				title.addClass("title");
				title.appendTextNode(data.title);
				pref_elem.appendChild(title);
				// Description
				var description = document.createElement("div");
				description.addClass("description");
				description.appendTextNode(data.description);
				pref_elem.appendChild(description);
				// Options
				var options_elem = document.createElement("div");
				options_elem.addClass("options");
				pref_elem.appendChild(options_elem);
				var option_val = this.preferences[pref];
				for (var x = 0, y = data.options.length; x < y; ++ x) {
					var option = data.options[x];
					var option_elem = document.createElement("div");
					option_elem.addClass("option");
					option_elem.appendTextNode(option.title);
					this.preferences[pref] = option.value;
					option_elem.innerHTML += truncate_number(new ExpressionGroup({
						text: option.example
					}));
					option_elem.setAttribute("data-pref", pref);
					option_elem.setAttribute("data-value", option.value);
					option_elem.addEventListener("mouseup", function() {
						// Deselect the currently selected option
						this.parentElement.children.forEach(function(elem) {
							elem.removeClass("selected");
						});
						// Select this option
						this.addClass("selected");
						Config.setPreference(this.getAttribute("data-pref"),
							this.getAttribute("data-value"));
						// Update the output
						last_query = "0";
						setTimeout(handle_hash_query, 100);
					});
					// Is this selected
					if (option_val == option.value) {
						option_elem.addClass("selected");
					}
					options_elem.appendChild(option_elem);
				}
				this.preferences[pref] = option_val;
				// Add the card to the element
				elem.appendChild(pref_elem);
			}
		}

		// TODO: Constants and functions

		// Add the element to the output if there are any children
		// (besides the title)
		if (elem.children.length >= 2) {
			output.appendChild(elem);
		}
	}
	return output;
}

Config = new Config();

// A manifest of information that helps explain what each
// preference does
ConfigPreferences = {
	angle: {
		title: "Angle Unit",
		description: "Indicates what units to use to evaluate trig functions",
		options: [
			{
				title: "Degrees",
				example: "180",
				value: "deg"
			},
			{
				title: "Radians",
				example: "pi",
				value: "rad"
			}
		]
	},
	trig: {
		title: "Trigonometry Precision",
		description: "Indicates whether to only evaluate trig functions for " +
			"unit-circle values (exact) or to always evaluate them (approximate)",
		options: [
			{
				title: "Exact",
				example: "cos(pi)",
				value: true
			},
			{
				title: "Approximate",
				example: "-1",
				value: false
			}
		]
	},
	fraction: {
		title: "Division Precision",
		description: "Indicates whether to use fractions (exact) or " +
			"decimals (approximate) to evaluate division",
		options: [
			{
				title: "Exact",
				example: "1/3",
				value: true
			},
			{
				title: "Approximate",
				example: "0.3333",
				value: false
			}
		]
	},
	radical: {
		title: "Exponent Precision",
		description: "Indicates whether to use radicals (exact) or " +
			"decimals (approximate) to evaluate fractional exponents",
		options: [
			{
				title: "Exact",
				example: "3^1/2",
				value: true
			},
			{
				title: "Approximate",
				example: "1.7321",
				value: false
			}
		]
	},
	pi: {
		title: "Pi Precision",
		description: "Indicates whether to keep pi in calculations (exact) " +
			"or to convert it to decimal (approximate)",
		options: [
			{
				title: "Exact",
				example: "2pi",
				value: true
			},
			{
				title: "Approximate",
				example: "6.2832",
				value: false
			}
		]
	},
	e: {
		title: "E Precision",
		description: "Indicates whether to keep e in calculations (exact) " +
			"or to convert it to decimal (approximate)",
		options: [
			{
				title: "Exact",
				example: "2e",
				value: true
			},
			{
				title: "Approximate",
				example: "5.4366",
				value: false
			}
		]
	}
};

DefaultFunctions = {
	"sin": null,
	"cos": null,
	"tan": null
};

function trig_function(name, n) {
	// Is n constant?
	var val;
	var PI = Math.PI;
	if (n instanceof Fraction) {
		val = n.toNumber();
	} else if (n instanceof FractionGroup &&
		n.numerator instanceof Fraction &&
		n.denominator instanceof Fraction) {
		val = n.numerator.toNumber() / n.denominator.toNumber();
	}
	if (val == null) return;
	// Convert to Radians
	if (Config.preferences.angle == "deg") val *= PI / 180;
	var result;
	// If approximate just evaluate it
	if (!Config.preferences.trig) {
		// Sanitize (make sure it's between 0 and 2pi)
		// val %= 2 * PI;
		result = Math[name](val);
		result = Math.round(1000000 * result) * 0.000001;
		result = new Fraction(result);
	} else { // Unit value numbers only
		var b_name = name; // The common function name
		var b_val = val; // The value converted for this function
		var b_rec = false; // Take the reciprocal after eval?
		switch (name) {
			case "cos": b_name = "sin"; b_val = PI / 2 - val;
			default: break;
		}
		// Returns whether b_val is near to n
		function near_to(n) {
			return Math.abs(b_val - n) <= 2e-8;
		}
		if (b_name == "sin") {
			// Correct the period
			while (b_val < 0) {
				b_val += 2 * PI;
			}
			b_val %= 2 * PI;
			if (near_to(0)) { // 0 deg
				result = new Fraction(0);	
			} else if (near_to(PI * SIXTH)) { // 30 deg
				result = new Fraction("1/2");
			} else if (near_to(PI * 0.25)) { // 45 deg
				result = new MultiplyGroup({
					text: "(2^0.5)/2"
				});
			} else if (near_to(PI * THIRD)) { // 60 deg
				result = new MultiplyGroup({
					text: "(3^0.5)/2"
				});
			} else if (near_to(PI * 0.5)) { // 90 deg
				result = new Fraction(1);
			} else if (near_to(PI * 2 * THIRD)) { // 120 deg
				result = new MultiplyGroup({
					text: "(3^0.5)/2"
				});
			} else if (near_to(PI * 0.75)) { // 135 deg
				result = new MultiplyGroup({
					text: "(2^0.5)/2"
				});
			} else if (near_to(PI * 5 * SIXTH)) { // 150 deg
				result = new Fraction("1/2");
			} else if (near_to(PI)) { // 180 deg
				result = new Fraction(0);
			} else if (near_to(PI * 7 * SIXTH)) { // 210 deg
				result = new Fraction("-1/2");
			} else if (near_to(PI * 1.25)) { // 225 deg
				result = new MultiplyGroup({
					text: "-(2^0.5)/2"
				});
			} else if (near_to(PI * 4 * THIRD)) { // 240 deg
				result = new MultiplyGroup({
					text: "-(3^0.5)/2"
				});
			} else if (near_to(PI * 1.5)) { // 270 deg
				result = new Fraction(-1);
			} else if (near_to(PI * 5 * THIRD)) { // 300 deg
				result = new MultiplyGroup({
					text: "-(3^0.5)/2"
				});
			} else if (near_to(PI * 1.75)) { // 315 deg
				result = new MultiplyGroup({
					text: "-(2^0.5)/2"
				});
			} else if (near_to(PI * 11 * SIXTH)) { // 330 deg
				result = new Fraction("-1/2");
			}
		} else if (b_name == "tan") {
			// Correct the period
			while (b_val < 0) {
				b_val += 2 * PI;
			}
			b_val %= 2 * PI;
			if (near_to(0)) { // 0 deg
				result = new Fraction(0);	
			} else if (near_to(PI * SIXTH)) { // 30 deg
				result = new MultiplyGroup({
					text: "(3^0.5)/3"
				});
			} else if (near_to(PI * 0.25)) { // 45 deg
				result = new Fraction(1);
			} else if (near_to(PI * THIRD)) { // 60 deg
				result = new MultiplyGroup({
					text: "(3^0.5)"
				});
			} else if (near_to(PI * 0.5)) { // 90 deg
				result = new Fraction("1/0");
			} else if (near_to(PI * 2 * THIRD)) { // 120 deg
				result = new MultiplyGroup({
					text: "-(3^0.5)"
				});
			} else if (near_to(PI * 0.75)) { // 135 deg
				result = new Fraction(-1);
			} else if (near_to(PI * 5 * SIXTH)) { // 150 deg
				result = new MultiplyGroup({
					text: "-(3^0.5)/3"
				});
			} else if (near_to(PI)) { // 180 deg
				result = new Fraction(0);
			} else if (near_to(PI * 7 * SIXTH)) { // 210 deg
				result = new MultiplyGroup({
					text: "(3^0.5)/3"
				});
			} else if (near_to(PI * 1.25)) { // 225 deg
				result = new Fraction(1);
			} else if (near_to(PI * 4 * THIRD)) { // 240 deg
				result = new MultiplyGroup({
					text: "(3^0.5)"
				});
			} else if (near_to(PI * 1.5)) { // 270 deg
				result = new Fraction("-1/0");
			} else if (near_to(PI * 5 * THIRD)) { // 300 deg
				result = new MultiplyGroup({
					text: "-(3^0.5)"
				});
			} else if (near_to(PI * 1.75)) { // 315 deg
				result = new Fraction(-1);
			} else if (near_to(PI * 11 * SIXTH)) { // 330 deg
				result = new MultiplyGroup({
					text: "-(3^0.5)/3"
				});
			}
		}
	}
	if (result == null) return;
	return result;
}

{
	var default_funcs = new Array();
	for (var name in DefaultFunctions) {
		default_funcs.push(name);
	}
	DEFAULT_FUNCTIONS_REGEX = "(" + default_funcs.join("|") + ")$";
}

// Used to keep track of what config info is relevant to
// the current query
ConfigUsed = function() {
	this.preferences = new Object();
	for (var pref in ConfigPreferences) {
		switch(pref) {
			case "angle": this.preferences[pref] = "deg"; break;
			default: this.preferences[pref] = false; break;
		}
	}
	this.constants = new Array();
	this.functions = new Array();
}

ConfigUsed.prototype.element = function() {
	return Config.element(this);
}

config_used = new ConfigUsed();

window.addEventListener("focus", function() {
	Config.loadLocalStorage();
});