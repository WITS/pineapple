function EquationRender(json) {
	this.text = json.text || "0";
	this.group = new ExpressionGroup({
		text: this.text
	});
	console.log(this.group);
	this.group.simplify();
	// if (this.group.module.steps.length) {
	// 	this.group.module.joined = "both";
	// 	modules.push(this.group.module);
	// }
	this.elementObj = null;
	this.element = function() {
		if (this.elementObj == null) {
			var elem = document.createElement("div");
			elem.addClass("render");
			elem.addClass("equation");
			
			elem.appendChild(this.group.element());

			this.elementObj = elem;
		}
		return this.elementObj;
	}
}

function ExpressionGroup(json) {
	var json = json || {};
	this.text = json.text || "";
	// Pre-processing for expression
	this.text = this.text.replace(/\s/g, "");
	this.text = this.text.replace(/\+{2,}/g, "+");
	this.text = this.text.replace(/(?!\+)-/g, "+-");
	this.highlighted = json.highlighted || false;
	this.top_parent = this;
	this.parent = json.parent || null;
	if (this.parent != null) {
		this.top_parent = this.parent.top_parent;
	}
	// Child groups
	this.groups = [];
	this.value = null;

	this.valueOf = function() {
		return this.value;
	}

	this.element = function() {
		var wrapper = document.createElement("div");
		wrapper.addClass("expression-group");
		wrapper.addClass("parentheses");

		// Loop through groups and create elements
		for (var x = 0, y = this.groups.length; x < y;
			++ x) {
			// Operation Elements
			if (x) {
				var o_elem = document.createElement(
					"span");
				o_elem.addClass("operation");
				var o_type = (this.groups[x].subtraction ?
					"-" : "+");
				o_elem.setAttribute("data-operation",
					o_type);
				o_elem.innerHTML = o_type;
				wrapper.appendChild(o_elem);
			}

			wrapper.appendChild(
				this.groups[x].element());
		}

		return wrapper;
	}
	
	// Parentheses / Groups
	var p_start = 0;
	var p_level = 0;

	var prev_character = "";
	var character = "";
	var next_character = this.text[0];
	for (var x = 0, y = this.text.length; x < y; ++ x) {
		prev_character = character;
		character = next_character;
		if (x + 1 < y) {
			next_character = this.text[x + 1];
		} else {
			next_character = "";
		}

		if (character == "(") {
			++ p_level;
		} else if (character == ")") {
			-- p_level;
		}

		if (p_level || character != "+") {
			continue;
		}

		var group_text =
			this.text.substr(p_start, x - p_start);
		p_start = x + 1;

		if (!group_text.length) {
			continue;
		}

		this.groups.push(new MultiplyGroup({
			text: group_text,
			parent: this
		}));
	}
	var group_text =
		this.text.substr(p_start);
	if (group_text.length) {
		this.groups.push(new MultiplyGroup({
			text: group_text,
			parent: this
		}));
	}

	this.simplify = function() {
		return false;
		// TODO Update simplifying

		for (var x = 0, y = this.groups.length; x < y;
			++ x) {
			var group = this.groups[x];
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

		if (o_groups.length != 1) {
			return null;
		}

		this.value = +o_groups[0];
		if (this.parent != null) {
			this.parent.modified_text =
				this.parent.modified_text.replace(
				"(" + this.text + ")", this.value);
		}
	}
}

function MultiplyGroup(json) {
	var json = json || {};
	this.text = json.text || "";
	this.highlighted = json.highlighted || false;
	this.top_parent = this;
	this.parent = json.parent || null;
	if (this.parent != null) {
		this.top_parent = this.parent.top_parent;
	}
	// Child groups
	this.groups = [];
	this.subtraction = false;
	// this.subtraction = (json.text[0] == '-');
	this.value = null;

	this.valueOf = function() {
		return this.value;
	}

	this.element = function() {
		var wrapper = document.createElement("div");
		wrapper.addClass("multiply-group");

		// Loop through groups and create elements
		for (var x = 0, y = this.groups.length; x < y;
			++ x) {
			// Operation Elements
			if (x) {
				var times = document.createElement(
					"span");
				times.addClass("operation");
				times.setAttribute("data-operation",
					"*");
				times.innerHTML = "&times;";
				wrapper.appendChild(times);
			}

			wrapper.appendChild(
				this.groups[x].element());
		}

		return wrapper;
	}
	
	// Parentheses / Groups
	var p_start = 0;
	var p_level = 0;

	var temp_text = this.text.replace(
		new RegExp("(?!^)([^0-9\\.\\^\\*\\/\\+\\-\\(])(" +
			FLOAT_NUM_REGEX + ")", "gi"), "$1*$2");
	temp_text = temp_text.replace(new RegExp(
		"([a-z]\\^)(\\(|" + FLOAT_NUM_REGEX + "[a-z])",
		"gi"), "*$1$2");

	// var temp_text = this.text.replace(new RegExp("(" +
	// 	FLOAT_NUM_REGEX + ")\\^", "g"), "($1)^");
	// temp_text = temp_text.replace(new RegExp("(" +
	// 	FLOAT_NUM_REGEX + "\\/)", "g"), "*$1");
	
	console.log(temp_text);
	var prev_character = "";
	var character = "";
	var next_character = temp_text[0];
	for (var x = 0, y = temp_text.length; x < y; ++ x) {
		prev_character = character;
		character = next_character;
		if (x + 1 < y) {
			next_character = temp_text[x + 1];
		} else {
			next_character = "";
		}

		if (character == "(") {
			++ p_level;

			if (p_level > 1) {
				continue;
			}

			var group_text =
				temp_text.substr(p_start, x - p_start);
			p_start = x + 1;

			if (!group_text.length) {
				continue;
			}

			this.groups.push(group_text);
		} else if (character == ")") {
			-- p_level;

			if (p_level) {
				continue;
			}

			var group_text =
				temp_text.substr(p_start, x - p_start);
			p_start = x + 1;

			if (!group_text.length) {
				continue;
			}

			this.groups.push(new ExpressionGroup({
				text: group_text,
				parent: this
			}));
		}

		if (p_level || character != "*") {
			continue;
		}

		var group_text =
			temp_text.substr(p_start, x - p_start);
		p_start = x + 1;

		if (!group_text.length) {
			continue;
		}

		this.groups.push(group_text);
	}
	var group_text =
		temp_text.substr(p_start);
	if (group_text.length) {
		this.groups.push(group_text);
	}
	// Loop through and convert strings to
	// appropriate groups

	// Exponent Groups
	for (var x = 0, y = this.groups.length;
		x < y; ++ x) {
		var group = this.groups[x];

		// Skip group objects
		if (typeof group === 'object') {
			continue;
		}

		// If the caret will be part of an
		// AlgebraGroup it should be ignored
		if (!(new RegExp("(?:^\\^|[^a-zA-Z]\\^||\\^$)",
			"g").test(group))) {
			console.log("Apparently not: " + group);
			continue;
		}

		var caret_pos = group.match(
			new RegExp("(?:^\\^|\\^$|" +
				FLOAT_NUM_REGEX + "\\^)"));
		if (caret_pos != null) {
			caret_pos = group.indexOf("^",
				caret_pos.index);
		} else {
			continue;
		}
		if (caret_pos != -1) {
			// Keep track of how to modify
			// this.elements array
			var replace_pos = 0;
			var replace_len = 0;
			// Base
			if (caret_pos) {
				var b = group.substr(0, caret_pos);
			} else {
				-- replace_pos;
				++ replace_len;
				var b = this.groups[x - 1];
			}
			// Exponent
			if (caret_pos != group.length - 1) {
				var e = group.substr(caret_pos + 1);
			} else {
				++ replace_len;
				var e = this.groups[x + 1];
			}
			this.groups[x + replace_pos] =
				new ExponentGroup({
					base: b,
					exponent: e,
					parent: this
				});
			this.groups.splice(x + replace_pos + 1,
				replace_len);
			x += replace_pos;
			y -= replace_len;
		}
	}

	// Fraction Groups
	for (var x = 0, y = this.groups.length;
		x < y; ++ x) {
		var group = this.groups[x];

		// Skip group objects
		if (typeof group === 'object') {
			continue;
		}

		var slash_pos = group.indexOf("/");
		if (slash_pos != -1) {
			// Keep track of how to modify
			// this.elements array
			var replace_pos = 0;
			var replace_len = 0;
			// Numerator
			if (slash_pos) {
				var n = group.substr(0, slash_pos);
			} else {
				-- replace_pos;
				++ replace_len;
				var n = this.groups[x - 1];
			}
			// Denominator
			if (slash_pos != group.length - 1) {
				var d = group.substr(slash_pos + 1);
			} else {
				++ replace_len;
				var d = this.groups[x + 1];
			}
			this.groups[x + replace_pos] =
				new FractionGroup({
					numerator: n,
					denominator: d,
					parent: this
				});
			this.groups.splice(x + replace_pos + 1,
				replace_len);
			x += replace_pos;
			y -= replace_len;
		}
	}

	// Algebra Groups / Fractions
	for (var x = 0, y = this.groups.length;
		x < y; ++ x) {
		var group = this.groups[x];

		// Skip group objects
		if (typeof group === 'object') {
			continue;
		}

		// Correct negatives
		group = group.replace(/^-([a-z]|$)/i, "-1$1");

		// AlgebraGroup
		if (/[a-z]/i.test(group)) {
			this.groups[x] = new AlgebraGroup({
				text: group,
				parent: this
			});
		} else { // Fraction
			this.groups[x] = new Fraction({
				numerator: +group,
				parent: this
			});
		}
	}
}

function FractionGroup(json) {
	var json = json || {};
	this.numerator = json.numerator || 1;
	this.denominator = json.denominator || 1;
	this.highlighted = json.highlighted || false;
	this.top_parent = this;
	this.parent = json.parent || null;
	if (this.parent != null) {
		this.top_parent = this.parent.top_parent;
	}
	this.value = null;
	this.simplify = function() {
		this.numerator.simplify();
		var n_val = this.numerator.value;
		if (n_val != null) {
			this.numerator = n_val;
		}
		this.denominator.simplify();
		var d_val = this.denominator.value;
		if (d_val != null) {
			this.denominator = d_val;
		}
		if (n_val != null && d_val != null) {
			this.value = new Fraction({
				numerator: n_val,
				denominator: d_val,
				parent: this.parent
			});
		}
	}
	this.valueOf = function() {
		if (this.value != null) {
			return this.value;
		} else {
			return this;
		}
	}
	this.element = function() {
		return fraction_element(this.numerator,
			this.denominator);
	}

	// Verify that numerator and denominator
	// are groups, not strings

	// Numerator
	if (typeof this.numerator === 'string') {
		if (/[a-z]/i.test(this.numerator)) {
			// AlgebraGroup
			this.numerator = new AlgebraGroup({
				text: this.numerator,
				parent: this
			});
		} else {
			// Fraction
			this.numerator = new Fraction({
				numerator: +this.numerator,
				parent: this
			});
		}
	}

	// Denominator
	if (typeof this.denominator === 'string') {
		if (/[a-z]/i.test(this.denominator)) {
			// AlgebraGroup
			this.denominator = new AlgebraGroup({
				text: this.denominator,
				parent: this
			});
		} else {
			// Fraction
			this.denominator = new Fraction({
				numerator: +this.denominator,
				parent: this
			});
		}
	}
}

function ExponentGroup(json) {
	var json = json || {};
	this.base = json.base || 1;
	this.exponent = json.exponent || 1;
	this.highlighted = json.highlighted || false;
	this.top_parent = this;
	this.parent = json.parent || null;
	if (this.parent != null) {
		this.top_parent = this.parent.top_parent;
	}
	this.value = null;
	this.simplify = function() {
		this.base.simplify();
		var b_val = this.base.value;
		if (b_val != null) {
			this.base = b_val;
		}
		this.exponent.simplify();
		var e_val = this.exponent.value;
		if (e_val != null) {
			this.exponent = e_val;
		}
		if (b_val != null && e_val != null) {
			this.value = new Fraction({
				numerator: Math.pow(b_val,
					e_val),
				parent: this.parent
			});
		}
	}
	this.valueOf = function() {
		if (this.value != null) {
			return this.value;
		} else {
			return this;
		}
	}
	this.element = function() {
		return exponent_element(this.base,
			this.exponent, false);
	}

	// Verify that base and exponent
	// are groups, not strings

	// Base
	if (typeof this.base === 'string') {
		if (/[a-z]/i.test(this.base)) {
			// AlgebraGroup
			this.base = new AlgebraGroup({
				text: this.base,
				parent: this
			});
		} else {
			// Fraction
			this.base = new Fraction({
				numerator: +this.base,
				parent: this
			});
		}
	}
	// Denominator
	if (typeof this.exponent === 'string') {
		if (/[a-z]/i.test(this.exponent)) {
			// AlgebraGroup
			this.exponent = new AlgebraGroup({
				text: this.exponent,
				parent: this
			});
		} else {
			// Fraction
			this.exponent = new Fraction({
				numerator: +this.exponent,
				parent: this
			});
		}
	}
}

function AlgebraGroup(json) {
	var json = json || {};
	this.text = json.text || "0";
	this.coefficient = json.coefficient || [1, 1];
	// Stores variables in the group and
	// their degree (e.g. x^2 would be {x:2})
	this.variable = json.variable || {};
	this.highlighted = json.highlighted || false;
	this.top_parent = this;
	this.parent = json.parent || null;
	if (this.parent != null) {
		this.top_parent = this.parent.top_parent;
	}
	this.value = null;
	this.hasVar = function(name) {
		return (this.variable[name] != null);
	}
	this.getVar = function(name) {
		return this.variable[name];
	}
	this.removeVar = function(name) {
		delete this.variable[name];
	}
	this.setVar = function(name, degree) {
		this.variable[name] = degree;
		return degree;
	}
	this.incrementVar = function(name, degree) {
		if (!this.hasVar(name)) {
			return this.setVar(name, degree);
		} else {
			return (this.variables[name] += degree);
		}
	}
	this.updateFromText = function(text) {
		var variables;
		this.coefficient = new RegExp("^-?" +
			FLOAT_NUM_REGEX).exec(text);
		if (this.coefficient != null) {
			this.coefficient = [+this.coefficient[0], 1];
		} else {
			this.coefficient = [1, 1];
		}
		variables = text.match(new RegExp(
			"[a-z](?:\\^" + FLOAT_NUM_REGEX + ")?",
			"gi"));
		if (variables == null) {
			console.error("No variables!");
			return;
		}
		variables.reverse();
		var i = variables.length;
		while (i --) {
			if (variables[i].length == 1) {
				variables[i] += "^1";
			}
			this.incrementVar(variables[i][0],
				+variables[i].substr(2));
		}
		this.text = text;
	}
	this.element = function() {
		var elem = document.createElement("div");
		elem.addClass("algebra-group");

		if (this.coefficient[0] != 1 ||
			this.coefficient[1] != 1) {
			var coefficient = fraction_element(
				this.coefficient[0],
				this.coefficient[1]);
			elem.appendChild(coefficient);
		}

		// Variable / Exponent elements
		for (var name in this.variable) {
			var exponent = this.variable[name];
			elem.appendChild(exponent_element(
				name, exponent, true));
		}

		return elem;
	}
	if (json.text != null && (
		json.variable == null ||
		json.coefficient == null)) {
		this.updateFromText(this.text);
	}
}

function Fraction(json) {
	var json = json || {};
	this.numerator = json.numerator || 1;
	this.denominator = json.denominator || 1;
	this.highlighted = json.highlighted || false;
	this.top_parent = this;
	this.parent = json.parent || null;
	this.value = this;
	if (this.parent != null) {
		this.top_parent = this.parent.top_parent;
	}
	this.valueOf = function() {
		return this;
	}
	this.element = function() {
		return fraction_element(this.numerator,
			this.denominator);
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
		// console.log("-(" + this.n2 + ")=" + this.value);
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

// Rendering Functions

function exponent_element(b, e, simple) {
	// b = base
	// e = exponent
	// when simple is true if e is 1,
	// the element doesn't display the
	// exponent

	if (simple == null) {
		var simple = true;
	}

	var wrapper = null;

	if (!simple || e != 1) {
		wrapper = document.createElement("span");
		wrapper.addClass("operation");
		wrapper.addClass("exponent-wrapper");
		wrapper.setAttribute("data-operation",
			"^");
	}

	if (typeof b !== 'object') {
		var base = document.createElement("div");
		base.addClass("number");
		if (typeof b === 'string') {
			base.addClass("variable");
		}
		base.innerHTML = b;
	} else {
		var base = b.element();
	}

	if (wrapper == null) {
		return base;
	}
	base.addClass("base");
	wrapper.appendChild(base);

	if (typeof e !== 'object') {
		var exponent = document.createElement("div");
		exponent.addClass("number");
		if (typeof e === 'string') {
			exponent.addClass("variable");
		}
		exponent.innerHTML = e;
	} else {
		var exponent = e.element();
	}
	exponent.addClass("exponent");
	wrapper.appendChild(exponent);

	return wrapper;
}

function fraction_element(n, d, simple) {
	// n = numerator
	// d = denominator
	// when simple is true if d is 1,
	// the element doesn't display the
	// denominator

	if (simple == null) {
		var simple = true;
	}

	var fraction = document.createElement(
		"span");

	if (simple && d == 1) {
		var numerator = fraction;
	} else {
		fraction.addClass("operation");
		fraction.addClass("fraction");
		fraction.setAttribute("data-operation",
			"/");
		var numerator = document.createElement(
			"span");
		numerator.addClass("numerator");
		fraction.appendChild(numerator);
	}
	if (typeof n !== 'object') {
		numerator.addClass("number");
		numerator.innerHTML = truncate_number(n);
	} else {
		numerator.appendChild(n.element());
	}

	if (!simple || d != 1) {
		var denominator = document.createElement(
			"span");
		denominator.addClass("denominator");
		if (typeof d !== 'object') {
			denominator.addClass("number");
			denominator.innerHTML = truncate_number(d);
		} else {
			denominator.appendChild(d.element());
		}
		fraction.appendChild(denominator);
	}

	return fraction;
}