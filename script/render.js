function EquationRender(json) {
	this.text = json.text || "0";
	this.group = new ExpressionGroup({
		text: this.text
	});
	if (this.group.module.steps.length) {
		this.group.module.joined = "both";
		modules.push(this.group.module);
	}
	this.elementObj = null;
	this.element = function() {
		if (this.elementObj == null) {
			var elem = document.createElement("div");
			elem.addClass("render");
			elem.addClass("equation");

			console.log(this.group);
			
			elem.appendChild(this.group.element());

			this.elementObj = elem;
		}
		return this.elementObj;
	}
}

function ExpressionGroup(json) {
	var json = json || {};
	this.text = json.text || "";
	this.text = this.text.replace(/\s/g, "");
	// Text after simplification
	this.modified_text = this.text;
	// Position in top_parent
	this.position = json.position || 0;
	// Highlighted text [start, end]
	this.highlight = json.highlight || [-1, -1];
	this.top_parent = this;
	this.parent = json.parent || null;
	if (this.parent != null) {
		this.top_parent = this.parent.top_parent;
	}
	// Child groups
	this.groups = [];
	if (this.parent != null) {
		this.module = this.parent.module;
	} else {
		this.module = new Module({
			title: "Simplify"
		});
	}
	// Simplify?
	if (json.visualOnly != null) {
		this.visualOnly = json.visualOnly;
	} else {
		this.visualOnly = false;
	}
	this.elements = [];
	this.elementObj = null;

	this.valueOf = function() {
		return this.value;
	}

	this.updateText =
		function(old_text, new_text, operation) {
		var new_full_text = this.modified_text.replace(
			old_text, new_text);
		var return_val;
		if (this.parent != null) {
			return_val =
				this.parent.updateText(old_text, new_text,
					operation);
		} else {
			return_val = new Array(2);
			var old_full_text = this.modified_text;

			return_val[0] = (old_full_text.indexOf(
				old_text)) + old_text.search(
				operation.toRegExp());
			return_val[1] = return_val[0] +
				operation.value.toString().length - 1;

			console.log([old_full_text,
				new_full_text, return_val[0],
				return_val[1]]);
		}

		this.modified_text = new_full_text;

		return return_val;
	}

	this.element = function() {
		if (this.elementObj == null) {
			var wrapper = document.createElement("div");
			wrapper.addClass("expression-group");
			wrapper.addClass("parentheses");
			this.elementObj = wrapper;

			// Loop through groups and create elements
			for (var x = 0, y = this.groups.length; x < y;
				++ x) {
				var group = this.groups[x];
				if (this.visualOnly) {
					console.log(group);
				}
				var elem = document.createElement("span");
				if (!(typeof group === 'string')) {
					this.elements.push(group.element());
					wrapper.appendChild(group.element());
					continue;
				}
				if (new RegExp("^-?" + FLOAT_NUM_REGEX +
					"\\_?$").test(group)) {
					elem.addClass("number");
					if (+group.replace("_", "") < 0) {
						elem.addClass("negative");
					}
					if (group.indexOf("_") != -1) {
						elem.addClass("highlighted");
					}
					elem.innerHTML = truncate_number(
						+group.replace("_", ""));
				} else {
					elem.addClass("operation");
					elem.setAttribute("data-operation",
						group.replace("_", ""));
					if (group.indexOf("_") != -1) {
						elem.addClass("highlighted");
					}
					var html;
					switch (group.replace("_", "")) {
						case "*":
							html = "&times;"
							break;
						// case "/":
						// 	html = "&divide;";
						// 	break;
						default:
							html = group.replace("_", "");
							break;
					}
					elem.innerHTML = html;
				}
				this.elements.push(elem);
				wrapper.appendChild(elem);
			}

			// Loop through elements and restructure
			var operations = ["^", "/"];
			var o;
			for (var i = 0; i < 2; ++ i) {
				o = operations[i];
				for (var x = 0, y = this.elements.length;
					x < y; ++ x) {
					var elem = this.elements[x];
					if (elem.innerHTML == o) {
						elem.innerHTML = "";
						var prev_elem = this.elements[x - 1];
						var next_elem = this.elements[x + 1];
						if (o == "^") {
							prev_elem.addClass(
								"base");
							next_elem.addClass(
								"exponent");
							next_elem.removeClass(
								"parentheses");
							elem.addClass(
								"exponent-wrapper");
							elem.appendChild(prev_elem);
							elem.appendChild(next_elem);
						}

						if (o == "/") {
							prev_elem.addClass(
								"numerator");
							prev_elem.removeClass(
								"parentheses");
							next_elem.addClass(
								"denominator");
							next_elem.removeClass(
								"parentheses");
							elem.addClass(
								"fraction");
							elem.appendChild(prev_elem);
							elem.appendChild(next_elem);
						}

						this.elements.splice(x - 1, 1);
						this.elements.splice(x, 1);
						y -= 2;
						-- i;
						continue;
					}
				}
			}
		}
		return this.elementObj;
	}
	
	// Parentheses / Groups
	var p_start = 0;
	var p_level = 0;
	for (var x = 0, y = this.text.length; x < y; ++ x) {
		var character = this.text[x];
		if (character == "(") {
			++ p_level;
			if (p_level == 1) {
				var group_text =
					this.text.substr(p_start, x - p_start);
				if (group_text.length) {
					if (p_start >= this.highlight[0] &&
						x - 1 <= this.highlight[1]) {
						group_text += "_";
						// console.log("Highlighted\n" +
						// 	group_text);
					}
					this.groups.push(group_text);
				}
				p_start = x + 1;
			}
		} else if (character == ")") {
			-- p_level;
			if (p_level == 0) {
				var group_text =
					this.text.substr(p_start, x - p_start);
				if (group_text.length) {
					var highlight = new Array(2);
					highlight[0] = this.highlight[0] -
						p_start;
					highlight[1] = this.highlight[1] -
						(this.highlight[0] - highlight[0]);
					this.groups.push(new ExpressionGroup({
						text: group_text,
						parent: this,
						highlight: highlight,
						visualOnly: this.visualOnly
					}));
				}
				p_start = x + 1;
			}
		}

		if (p_level) {
			continue;
		}

		if (/[+\-*\/^]/.test(character)) {
			if (x) {
				var prev_character = this.text[x - 1];
			} else {
				var prev_character = "";
			}
			if (x < this.text.length - 1) {
				var next_character = this.text[x + 1];
			} else {
				var next_character = "";
			}

			if (character == "-" && 
				/^\(?$/.test(prev_character) &&
				/^\d$/.test(next_character)) {
				continue;
			}
			var group_text =
				this.text.substr(p_start, x - p_start);
			if (group_text.length) {
				if (p_start >= this.highlight[0] &&
					x - 1 <= this.highlight[1]) {
					group_text += "_";
					// console.log("Highlighted\n" +
					// 	group_text);
				}
				this.groups.push(group_text);
			}
			if (x >= this.highlight[0] &&
					x <= this.highlight[1]) {
				character += "_";
				// console.log("Highlighted\n" +
				// 	character);
			}
			this.groups.push(character);
			p_start = x + 1;
		}
	}
	var group_text =
		this.text.substr(p_start,
			this.text.length - p_start);
	if (group_text.length) {
		if (p_start >= this.highlight[0] &&
			this.text.length - 1 <= this.highlight[1]) {
			group_text += "_";
			// console.log("Highlighted\n" +
			// 	group_text);
		}
		this.groups.push(group_text);
	}

	// Stop here if visualOnly
	if (this.visualOnly) {
		return this;
	}

	// Operation Groups
	var o_groups = [];

	for (var x = 0, y = this.groups.length; x < y;
		++ x) {
		var group = this.groups[x];
		if (typeof group === 'string') {
			if (new RegExp("^" + FLOAT_NUM_REGEX +
				"\\_?$").test(group)) {
				o_groups.push(+group.replace("_", ""));
			} else {
				o_groups.push(group.replace("_", ""));
			}
		} else {
			o_groups.push(group.value);
		}
	}

	var operations = ["\\^", "*/", "+\\-"];
	var o;
	for (var i = 0; i < 3; ++ i) {
		o = operations[i];

		for (var x = 0, y = o_groups.length; x < y;
			++ x) {
			var group = o_groups[x];
			if (typeof group === 'string') {
				if (new RegExp("^[" + o + "]$").test(
					group)) {
					var operation = new OperationGroup({
						group: this,
						top_group: this.top_parent,
						n1: o_groups[x - 1],
						n2: o_groups[x + 1],
						operation: group,
						text: this.modified_text
					});
					// this.modified_text = operation.new_text;
					var new_val = operation.value;

					if (x) {
						o_groups[x - 1] = new_val;
						o_groups.splice(x, 2);
						-- x;
						y -= 2;
					} else {
						o_groups[0] = new_val;
						o_groups.splice(x + 1, 1);
						-- y;
					}
				}
			}
		}
	}

	this.value = +o_groups[0];
	if (this.parent != null) {
		this.parent.modified_text =
			this.parent.modified_text.replace(
			"(" + this.text + ")", this.value);
	}
}

function OperationGroup(json) {
	this.n1 = json.n1 || 0;
	this.n2 = json.n2 || 0;
	this.n1 = +this.n1;
	this.n2 = +this.n2;
	this.group = json.group || null;
	this.top_group = json.top_group || null;
	this.operation = json.operation;
	this.text = json.text || null;

	this.toString = function() {
		return this.n1 + this.operation + this.n2;
	}

	this.toRegExp = function() {
		return new RegExp("\\(?" + this.n1 + "\\)?\\" +
			this.operation + "\\(?" + this.n2 + "\\)?");
	}

	var mod_title = "";
	switch(this.operation) {
		case "^":
			this.value = Math.pow(this.n1, this.n2);
			break;
		case "+":
			this.value = this.n1 + this.n2;
			break;
		case "-":
			this.value = this.n1 - this.n2;
			break;
		case "*":
			this.value = this.n1 * this.n2;
			break;
		case "/":
			this.value = this.n1 / this.n2;
			break;
		default: break;
	}
	if (json.n1 == null && json.operation == "-") {
		console.log("-(" + this.n2 + ")=" + this.value);
		return;
	}
	// var instruction = "(" + this.n1 + ") " +
	// 	this.operation + " (" + this.n2 + ") = " +
	// 	this.value;
	// instruction = instruction.replace(
	// 	new RegExp("\\((" + FLOAT_NUM_REGEX + ")\\)",
	// 		"g"), "$1");
	// console.log(instruction);
	this.new_text = this.text.replace(new RegExp(
		"\\((" + FLOAT_NUM_REGEX + ")\\)", "g"),
		"$1");
	this.new_text = this.new_text.replace(this.n1 +
		this.operation + this.n2, this.value);

	var highlight =
		this.group.updateText(this.text, this.new_text,
			this);
	// console.log(this.top_group.modified_text.substr(
	// 	highlight[0], highlight[1] - highlight[0]));

	// Module control
	var mod = this.group.module;
	mod.steps.push({
		title: describe_operation(this),
		visual: new ExpressionGroup({
			text: this.top_group.modified_text,
			highlight: highlight,
			visualOnly: true
		})
	});
}

function SolutionRender(json) {
	this.value = json.value || 0;
	this.elementObj = null;
	this.element = function() {
		if (this.elementObj == null) {
			var elem = document.createElement("div");
			elem.addClass("render");
			elem.addClass("solution");

			elem.innerHTML = this.value;

			this.elementObj = elem;
		}
		return this.elementObj;
	}
}

function describe_operation(operation) {
	if (operation.operation == "^") {
		var o_string = null;
		if (operation.n2 == 2) {
			o_string = "Square";
		} else if (operation.n2 == 3) {
			o_string = "Cube";
		} else if (operation.n2 == 0.5) {
			o_string = "Take the square root of";
		}
		if (o_string != null) {
			return o_string + " " + operation.n1;
		}
	}
	if (operation.operation == "-") {
		return "Subtract " + operation.n2 + " from " +
			operation.n1;
	}
	var start = "";
	var middle = "";
	var end = "";
	switch (operation.operation) {
		case "+":
			start = "Add";
			middle = "and";
			break;
		case "*":
			start = "Multiply";
			middle = "and";
			break;
		case "/":
			start = "Divide";
			middle = "by";
			break;
		case "^":
			start = "Raise";
			middle = "to the";
			end = ordinal_of(operation.n2) + " power";
			break;
		default:
			break;
	}
	return start + " " +
		truncate_number(operation.n1) + " " + middle +
		" " + truncate_number(operation.n2) + end;
}

function ordinal_of(n) {
	if (n >= 11 && n <= 13) {
		return "th";
	}
	switch (n % 10) {
		case 1: return "st"; break;
		case 2: return "nd"; break;
		case 3: return "rd"; break;
		default: return "th"; break;
	}
}

function first_difference(str1, str2) {
	console.log([str1, str2]);

	var y = Math.min(str1.length, str2.length);

	for (var x = 0; x < y; ++ x) {
		if (str1[x] == str2[x]) {
			continue;
		}
		return x;
	}

	return y;
}

function truncate_number(n) {
	if (/\.\d{5,}$/.test(n.toString())) {
		return n.toFixed(4);
	} else {
		return n.toString();
	}
}