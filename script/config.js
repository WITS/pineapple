/*
 * Config.js - stores and manges user preferences
 * and memory (constants/functions)
 * Copyright (C) 2015  Ian Jones
 * http://pineapple.pub/LICENSE.txt
 */

Config = function() {
	this.preferences = {
		fraction: true,
		radical: true
	};
	this.constants = new Object();
	this.functions = new Object();
}

Config.prototype = new Card();

Config.prototype.joined = "both";

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

// Used to keep track of what config info is relevant to
// the current query
ConfigUsed = function() {
	this.preferences = {
		fraction: false,
		radical: false
	};
	this.constants = new Array();
	this.functions = new Array();
}

ConfigUsed.prototype.element = function() {
	return Config.element(this);
}

config_used = new ConfigUsed();

// A manifest of information that helps explain what each
// preference does
ConfigPreferences = {
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
	}
};

window.addEventListener("focus", function() {
	Config.loadLocalStorage();
});