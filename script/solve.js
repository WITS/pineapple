Equation = function(json) {
	this.text = json.text || "0";
	var sides = this.text.split("=");
	if (sides.length >= 2) {
		this.left = new ExpressionGroup({
			text: sides[0],
			equation: this,
			side: "left"
		});
		this.right = new ExpressionGroup({
			text: sides[1],
			equation: this,
			side: "right"
		});
	} else {
		this.left = null;
		this.right = new ExpressionGroup({
			text: this.text,
			equation: this,
			side: "right"
		});
	}
	this.all_vars = new Array();
	this.left_vars = new Array();
	this.right_vars = new Array();
}

Equation.prototype.left_degree = 0;
Equation.prototype.right_degree = 0;

Equation.prototype.replace = function(v, value) {
	var groups = new Array();
	var right = false;
	if (this.left != null) {
		groups.push(this.left);
	} else {
		groups.push(this.right);
		right = true;
	}

	while (groups.length) {
		var group = groups[0];
		if (group.groups != null) {
			var i = group.groups.length;
			while (i --) {
				groups.push(group.groups[i]);
			}
		} else if (group.variable != null) {
			if (group.hasVar(v)) {
				// ModuleStep Replace Var
				group.highlighted_temp.push(v);
				push_module_step({
					type: "simplify",
					title: "Replace " + v + " with " +
					truncate_number(value),
					visual: this.element()
				});
				group.highlighted_temp.splice(0);
				var e = group.getVar(v);
				group.removeVar(v);
				var m_group = group.parent;
				if (!(m_group instanceof MultiplyGroup)) {
					m_group = new MultiplyGroup({
						parent: group.parent
					});
					if (group.parent != null) {
						group.parent.replace(group,
							m_group);
					} else {
						this[group.side] = m_group;
						m_group.equation = this;
						m_group.side = group.side;
					}
					var remove = true;
					for (var name in group.variable) {
						remove = false;
					}
					if (!remove ||
						group.coefficient.numerator != 1 ||
						group.coefficient.denominator != 1) {
						m_group.push(group);
					}
				}
				if (e != 1) {
					m_group.insertBefore(group,
						new ExponentGroup({
							base: value.toString(),
							exponent: e.toString(),
							parent: group.parent
						}));
				} else {
					m_group.insertBefore(group,
						new Fraction({
							numerator: value,
							parent: group.parent
						}));
				}
			}
		} else if (group.base != null) {
			groups.push(group.base);
			groups.push(group.exponent);
		} else if (group instanceof FractionGroup) {
			groups.push(group.numerator);
			groups.push(group.denominator);
		}

		groups.splice(0, 1);
		if (!right && !groups.length) {
			groups.push(this.right);
			right = true;
		}
	}
}

Equation.prototype.isolate = function(v) {
	// Side preference
	var pref_side = "left";
	var other_side = "right";
	if (this.left_degree < this.right_degree) {
		pref_side = "right";
		other_side = "left";
	}

	var group = this[pref_side];
	if (group instanceof ExpressionGroup) {
		for (var x = 0, y = group.groups.length;
			x < y; ++ x) {
			var g = group.groups[x];
			if (g instanceof Fraction) {
				var s_group = this[other_side];
				if (!(s_group instanceof
					ExpressionGroup)) {
					this[other_side] =
						new ExpressionGroup({
							equation: this,
							side: other_side
						});
					var remove = false;
					if (s_group instanceof Fraction) {
						if (s_group.toNumber() == 0) {
							remove = true;
						}
					}
					if (!remove) {
						this[other_side].push(s_group);
					}
					s_group = this[other_side];
				}
				var adding = (g.toNumber() <= 0);
				var g1 = g.negative();
				var g2 = g.negative();
				s_group.push(g1);
				group.push(g2);
				g1.highlighted = true;
				g2.highlighted = true;
				push_module_step({
					type: "isolate",
					variable: v,
					title: (adding ? "Add" :
						"Subtract") + " " +
						truncate_number(g) + " " +
						(adding ? "to" : "from") +
						" both sides",
					visual: this.element()
				});
				g1.highlighted = false;
				g2.highlighted = false;
			}
		}
	} else if (group instanceof MultiplyGroup) {
		for (var x = 0, y = group.groups.length;
			x < y; ++ x) {
			var g = group.groups[x];
			if (g instanceof Fraction) {
				var s_group = this[other_side];
				if (!(s_group instanceof
					MultiplyGroup)) {
					this[other_side] =
						new MultiplyGroup({
							equation: this,
							side: other_side
						});
					var remove = false;
					if (s_group instanceof Fraction) {
						if (s_group.toNumber() == 1) {
							remove = true;
						}
					}
					if (!remove) {
						this[other_side].push(s_group);
					}
					s_group = this[other_side];
				}
				var dividing = (Math.abs(g.toNumber()) >= 1);
				var g1 = g.reciprocal();
				var g2 = g.reciprocal();
				s_group.push(g1);
				group.push(g2);
				g1.highlighted = true;
				g2.highlighted = true;
				push_module_step({
					type: "isolate",
					variable: v,
					title: (dividing ? "Divide" :
						"Multiply") + " both sides by " +
						(dividing ? truncate_number(g) :
							truncate_number(g1)),
					visual: this.element()
				});
				g1.highlighted = false;
				g2.highlighted = false;
			}
		}
	} else if (group instanceof AlgebraGroup) {
		if (group.coefficient.toNumber() != 1) {
			var s_group = this[other_side];
			if (!(s_group instanceof
				MultiplyGroup)) {
				this[other_side] =
					new MultiplyGroup({
						equation: this,
						side: other_side
					});
				var remove = false;
				if (s_group instanceof Fraction) {
					if (s_group.toNumber() == 1) {
						remove = true;
					}
				}
				if (!remove) {
					this[other_side].push(s_group);
				}
				s_group = this[other_side];
			}
			var m_group = new MultiplyGroup({
				equation: this,
				side: group.side
			});
			m_group.push(group);
			this[group.side] = m_group;
			var g = group.coefficient;
			var dividing = (Math.abs(g.toNumber()) >= 1);
			var g1 = g.reciprocal();
			var g2 = g.reciprocal();
			s_group.push(g1);
			m_group.push(g2);
			g1.highlighted = true;
			g2.highlighted = true;
			push_module_step({
				type: "isolate",
				variable: v,
				title: (dividing ? "Divide" :
					"Multiply") + " both sides by " +
					(dividing ? truncate_number(g) :
						truncate_number(g1)),
				visual: this.element()
			});
			g1.highlighted = false;
			g2.highlighted = false;
		}
	}

	this.left.simplify();
	this.left = this.left.valueOf();
	this.right.simplify();
	this.right = this.right.valueOf();

	// Check if finished
	var finished = false;
	var group = this[pref_side];
	if (group instanceof AlgebraGroup) {
		finished = true;
		if (group.coefficient.toNumber() != 1) {
			finished = false;
		}
		for (var name in group.variable) {
			if (name != v) {
				// TODO: Make sure it's only
				// the correct variable
			}
		}
	}
	if (!finished) {
		this.isolate(v);
	}
}

Equation.prototype.updateVarInfo = function(side) {
	if (side == null) {
		this.all_vars.splice(0);
		this.updateVarInfo("left");
		this.updateVarInfo("right");
		return;
	}

	var degree = 0;
	var variables = new Array();

	var groups = new Array();
	if (this[side] != null) {
		groups.push(this[side]);
	} else {
		this[side + "_degree"] = degree;
		this[side + "_vars"] = variables;
		return;
	}

	while (groups.length) {
		var group = groups[0];
		if (group.groups != null) {
			var i = group.groups.length;
			while (i --) {
				groups.push(group.groups[i]);
			}
		} else if (group.variable != null) {
			for (var name in group.variable) {
				degree = Math.max(degree,
					group.variable[name]);
				if (variables.indexOf(name) == -1) {
					variables.push(name);
				}
				if (this.all_vars.indexOf(name) == -1) {
					this.all_vars.push(name);
				}
			}
		} else if (group.base != null) {
			groups.push(group.base);
			groups.push(group.exponent);
		} else if (group instanceof FractionGroup) {
			groups.push(group.numerator);
			groups.push(group.denominator);
		}
		groups.splice(0, 1);
	}

	this[side + "_degree"] = degree;
	this[side + "_vars"] = variables;
}

Equation.prototype.getVarInfo = function() {
	var return_val = new Object();
	if (this.left_degree <= this.right_degree) {
		return_val.min_side = "left";
		return_val.max_side = "right";
		return_val.min_degree = this.left_degree;
		return_val.max_degree = this.right_degree;
	} else {
		return_val.min_side = "right";
		return_val.max_side = "left";
		return_val.min_degree = this.right_degree;
		return_val.max_degree = this.left_degree;
	}
	return return_val;
}

Equation.prototype.element = function() {
	var elem = document.createElement("div");
	elem.addClass("render");
	elem.addClass("equation");

	if (this.left != null) {
		var left_elem = this.left.element();
		if (this.left instanceof Fraction &&
			left_elem.hasClass("negative")) {
			left_elem.children[0].addClass("negative");
			left_elem.removeClass("negative");
		}
		elem.appendChild(left_elem);
		var equals = document.createElement(
			"span");
		equals.addClass("equals");
		equals.innerHTML = "=";
		elem.appendChild(equals);
	}

	var right_elem = this.right.element();
	if (this.right instanceof Fraction &&
		right_elem.hasClass("negative")) {
		right_elem.children[0].addClass("negative");
		right_elem.removeClass("negative");
	}

	elem.appendChild(right_elem);

	return elem;
}


ExpressionGroup = function(json) {
	var json = json || {};
	this.text = json.text || "";
	// Pre-processing for expression
	this.text = this.text.replace(/(?:\s|,)/g, "");
	this.text = this.text.replace(/\+{2,}/g, "+");
	this.text = this.text.replace(
		/(^|[^\+\*\/\^\(])-/g, "$1+-");
	this.highlighted = json.highlighted || false;
	this.top_parent = this;
	this.parent = json.parent || null;
	if (this.parent != null) {
		this.top_parent = this.parent.top_parent;
	}
	this.equation = json.equation ||
		this.top_parent.equation || null;
	this.side = json.side ||
		this.top_parent.side || null;
	this.groups = new Array();
	this.value = null;
	
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
}


ExpressionGroup.prototype.push = function(group) {
	this.groups.push(group);
	group.parent = this;
	group.side = this.side;
	group.equation = this.equation;
}

ExpressionGroup.prototype.replace = function(g1, g2) {
	// g1 = The old group
	// g2 = The new group

	this.groups[this.groups.indexOf(g1)] = g2;
	g2.parent = this;
	g2.side = this.side;
	g2.equation = this.equation;
}

ExpressionGroup.prototype.insertBefore = function(g1, g2) {
	// g1 = The group used to find location
	// g2 = The group being inserted

	var temp_groups = this.groups.splice(
		this.groups.indexOf(g1));
	this.groups.push(g2);
	this.groups = this.groups.concat(temp_groups);
	g2.parent = this;
	g2.side = this.side;
	g2.equation = this.equation;
}

ExpressionGroup.prototype.remove = function(group) {
	this.groups.splice(this.groups.indexOf(group), 1);
}

ExpressionGroup.prototype.simplify = function() {
	// Constants / Simplify groups
	var constants = new Array();
	var algebra = new Object();
	for (var x = 0, y = this.groups.length;
		x < y; ++ x) {
		var group = this.groups[x];
		group.simplify();
		group.valueOf().parent = group.parent;
		group = this.groups[x] = group.valueOf();
		if (group instanceof Fraction) {
			constants.push(x);
		} else if (group instanceof AlgebraGroup) {
			var v_text = group.variableText();
			if (algebra[v_text] == null) {
				algebra[v_text] = group;
			} else {
				var other = algebra[v_text];
				other.highlighted = true;
				group.highlighted = true;
				push_module_step({
					type: "simplify",
					title: describe_operation({
						operation: 
							(group.coefficient.toNumber()
							>= 0 ? "+" : "-"),
						n1: other,
						n2: group
					}),
					visual: this.equation.element()
				});
				other.highlighted = false;
				group.highlighted = false;
				other.add(group);
				this.groups.splice(x, 1);
				-- x;
				-- y;
			}
		}
	}
	algebra = null;
	if (constants.length >= 2) {
		var n1 = this.groups[constants[0]];
		n1.highlighted = true;
		var x = constants.length;
		var offset = 0;
		while (constants.length > 1) {
			constants[1] -= offset;
			var n2 = this.groups[constants[1]];
			// ModuleStep (Add/Subtract)
			n2.highlighted = true;
			var subtraction = (n1.toNumber() >= 0 &&
				n2.toNumber() < 0);
			push_module_step({
				type: "simplify",
				title: describe_operation({
					operation: subtraction ? "-" : "+",
					n1: n1,
					n2: n2,
					abs: subtraction
				}),
				visual: this.equation.element()
			});
			n2.highlighted = false;
			n1.add(n2);
			this.groups.splice(constants[1], 1);
			constants.splice(1, 1);
			n1.simplify();
			++ offset;
		}
		n1.highlighted = false;
		n1.simplify();
		n1 = this.groups[constants[0]] = n1.valueOf();
		if (n1.toNumber() == 0 &&
			this.groups.length >= 2) {
			this.remove(n1);
		}
	}
	// Single group?
	if (this.groups.length == 1) {
		this.value = this.groups[0].valueOf();
		this.value.parent = this.parent;
		if (this.parent == null) {
			this.value.top_parent = this.value;
		}
	}
}

ExpressionGroup.prototype.valueOf = function() {
	if (this.value != null) {
		return this.value;
	} else {
		return this;
	}
}

ExpressionGroup.prototype.element = function() {
	var wrapper = document.createElement("div");
	wrapper.addClass("expression-group");
	if (this.groups.length > 1) {
		wrapper.addClass("parentheses");
	}
	if (this.highlighted) {
		wrapper.addClass("highlighted");
	}
	if (this.parent == null && this.side != null) {
		wrapper.addClass(this.side + "-side");
	}

	var prev_group = null;
	var group = {
		highlighted: false
	};
	// Loop through groups and create elements
	for (var x = 0, y = this.groups.length; x < y;
		++ x) {
		prev_group = group;
		group = this.groups[x];
		var group_elem = group.element();

		// Operation Elements
		if (x) {
			var o_elem = document.createElement(
				"span");
			o_elem.addClass("operation");
			var o_type = (group_elem.hasClass(
				"negative") ? "-" : "+");
			o_elem.setAttribute("data-operation",
				o_type);
			o_elem.innerHTML = o_type;
			if (prev_group.highlighted &&
				prev_group instanceof Fraction &&
				group.highlighted &&
				group instanceof Fraction) {
				if (prev_group.denominator ==
					group.denominator) {
					o_elem.addClass("highlighted");
				}
			}
			wrapper.appendChild(o_elem);
		} else if (group_elem.hasClass("negative")) {
			if (group.groups != null) {
				group_elem.children[0].addClass(
					"negative");
				group_elem.removeClass("negative");
			}
		}

		wrapper.appendChild(group_elem);
	}

	return wrapper;
}

MultiplyGroup = function(json) {
	var json = json || {};
	this.text = json.text || "";
	this.highlighted = json.highlighted || false;
	this.top_parent = this;
	this.parent = json.parent || null;
	if (this.parent != null) {
		this.top_parent = this.parent.top_parent;
	}
	this.equation = json.equation ||
		this.top_parent.equation || null;
	this.side = json.side ||
		this.top_parent.side || null;
	// Child groups
	this.groups = new Array();
	this.subtraction = false;
	// this.subtraction = (json.text[0] == '-');
	this.value = null;
	
	// Parentheses / Groups
	var p_start = 0;
	var p_level = 0;

	var temp_text = this.text.replace(
		new RegExp("(?!^)([^0-9\\.\\^\\*\\/\\+\\-\\(])(" +
			FLOAT_NUM_REGEX + ")", "gi"), "$1*$2");
	temp_text = temp_text.replace(new RegExp(
		"([a-z]\\^)(\\()", "gi"), "*$1$2");
	temp_text = temp_text.replace(new RegExp(
		"-(" + FLOAT_NUM_REGEX + ")\\^"), "-1*$1^");

	// var temp_text = this.text.replace(new RegExp("(" +
	// 	FLOAT_NUM_REGEX + ")\\^", "g"), "($1)^");
	// temp_text = temp_text.replace(new RegExp("(" +
	// 	FLOAT_NUM_REGEX + "\\/)", "g"), "*$1");
	
	// console.log(temp_text);
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

MultiplyGroup.prototype.simplify = function() {
	// Constants / Simplify groups
	var constants = new Array();
	for (var x = 0, y = this.groups.length;
		x < y; ++ x) {
		var group = this.groups[x];
		group.simplify();
		group.valueOf().parent = group.parent;
		group = this.groups[x] = group.valueOf();
		if (group instanceof Fraction) {
			constants.push(x);
		} else if (group instanceof AlgebraGroup) {
			constants.push(x);
		}
	}
	if (constants.length >= 2) {
		var n1 = this.groups[constants[0]];
		n1.highlighted = true;
		var offset = 0;
		while (constants.length > 1) {
			constants[1] -= offset;
			var n2 = this.groups[constants[1]];
			// ModuleStep (Multiply)
			if (!(n1.numerator == -1 &&
				n1.denominator == 1 &&
				constants[0] == 0 &&
				constants[1] == 1)) {
				n2.highlighted = true;
				push_module_step({
					type: "simplify",
					title: describe_operation({
						operation: "*",
						n1: n1,
						n2: n2
					}),
					visual: this.equation.element()
				});
				n2.highlighted = false;
			}
			n1.multiply(n2);
			n1 = this.groups[constants[0]] =
				n1.valueOf();
			this.groups.splice(constants[1], 1);
			constants.splice(1, 1);
			++ offset;
		}
		n1.highlighted = false;
		n1.simplify();
		if (n1 instanceof Fraction) {
			if (n1.toNumber() == 1 &&
				this.groups.length >= 2) {
				this.remove(n1);
			}
		}
	}
	// Single group?
	if (this.groups.length == 1) {
		this.value = this.groups[0].valueOf();
		this.value.parent = this.parent;
		if (this.parent == null) {
			this.value.top_parent = this.value;
		}
	}
	// TODO: Joining more variables
}

MultiplyGroup.prototype.push = function(group) {
	this.groups.push(group);
	group.parent = this;
	group.side = this.side;
	group.equation = this.equation;
}

MultiplyGroup.prototype.replace = function(g1, g2) {
	// g1 = The old group
	// g2 = The new group

	this.groups[this.groups.indexOf(g1)] = g2;
	g2.parent = g1.parent;
	g2.side = this.side;
	g2.equation = this.equation;
}

MultiplyGroup.prototype.insertBefore = function(g1, g2) {
	// g1 = The group used to find location
	// g2 = The group being inserted

	var temp_groups = this.groups.splice(
		this.groups.indexOf(g1));
	this.groups.push(g2);
	this.groups = this.groups.concat(temp_groups);
	g2.parent = g1.parent;
	g2.side = this.side;
	g2.equation = this.equation;
}

MultiplyGroup.prototype.remove = function(group) {
	this.groups.splice(this.groups.indexOf(group), 1);
}

MultiplyGroup.prototype.valueOf = function() {
	if (this.value != null) {
		return this.value;
	} else {
		return this;
	}
}

MultiplyGroup.prototype.element = function() {
	var wrapper = document.createElement("div");
	wrapper.addClass("multiply-group");
	if (this.highlighted) {
		wrapper.addClass("highlighted");
	}
	if (this.parent == null && this.side != null) {
		wrapper.addClass(this.side + "-side");
	}

	// Loop through groups and create elements
	var prev_group = null;
	var prev_elem = null;
	var group = {
		highlighted: false
	};
	var group_elem = {
		innerHTML: 0
	};
	for (var x = 0, y = this.groups.length; x < y;
		++ x) {
		prev_group = group;
		group = this.groups[x];
		prev_elem = group_elem;
		group_elem = group.element();

		// Operation Elements
		if (x && prev_elem.innerHTML != "") {
			var times = document.createElement(
				"span");
			times.addClass("operation");
			times.setAttribute("data-operation",
				"*");
			times.innerHTML = "&times;";
			if (prev_group.highlighted &&
				prev_group instanceof Fraction &&
				group.highlighted &&
				group instanceof Fraction) {
				if (prev_group.denominator ==
					group.denominator) {
					times.addClass("highlighted");
				}
			}
			wrapper.appendChild(times);
		} else if (x == 0) { // Negative?
			if (group_elem.hasClass("negative")) {
				wrapper.addClass("negative");
				group_elem.removeClass("negative");
				if (group_elem.innerHTML == "1"
					&& y > 1) {
					group_elem.innerHTML = "";
				}
			}
		}

		wrapper.appendChild(group_elem);
	}

	return wrapper;
}

FractionGroup = function(json) {
	var json = json || {};
	this.numerator = json.numerator || 1;
	this.denominator = json.denominator || 1;
	this.highlighted = json.highlighted || false;
	this.top_parent = this;
	this.parent = json.parent || null;
	if (this.parent != null) {
		this.top_parent = this.parent.top_parent;
	}
	this.equation = json.equation ||
		this.top_parent.equation || null;
	this.side = json.side ||
		this.top_parent.side || null;
	this.value = null;

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

FractionGroup.prototype.replace = function(g1, g2) {
	// g1 = The old group
	// g2 = The new group

	if (this.numerator == g1) {
		this.numerator = g2;
		g2.parent = this;
	} else if (this.denominator == g1) {
		this.denominator = g2;
		g2.parent = this;
	}
}

FractionGroup.prototype.simplify = function() {
	this.numerator.simplify();
	this.numerator.valueOf().parent =
		this.numerator.parent;
	this.numerator =
		this.numerator.valueOf();
	var n_val = this.numerator;
	this.denominator.simplify();
	this.denominator.valueOf().parent =
		this.denominator.parent;
	this.denominator =
		this.denominator.valueOf();
	var d_val = this.denominator;
	if (n_val instanceof Fraction &&
		d_val instanceof Fraction) {
		this.value = new Fraction({
			numerator: n_val.numerator *
				d_val.denominator,
			denominator: n_val.denominator *
				d_val.numerator,
			parent: this.parent
		});
		this.value.simplify(this);
		this.value.parent = this.parent;
		if (this.parent == null) {
			this.value.top_parent = this.value;
		}
	}
}
FractionGroup.prototype.valueOf = function() {
	if (this.value != null) {
		return this.value;
	} else {
		return this;
	}
}
FractionGroup.prototype.element = function() {
	var elem = fraction_element(this.numerator,
		this.denominator, true, this.highlighted);
	if (this.parent == null && this.side != null) {
		elem.addClass(this.side + "-side");
	}
	return elem;
}

ExponentGroup = function(json) {
	var json = json || {};
	this.base = json.base || 1;
	this.exponent = json.exponent || 1;
	this.highlighted = json.highlighted || false;
	this.top_parent = this;
	this.parent = json.parent || null;
	if (this.parent != null) {
		this.top_parent = this.parent.top_parent;
	}
	this.equation = json.equation ||
		this.top_parent.equation || null;
	this.side = json.side ||
		this.top_parent.side || null;
	this.value = null;

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

ExponentGroup.prototype.replace = function(g1, g2) {
	// g1 = The old group
	// g2 = The new group

	if (this.base == g1) {
		this.base = g2;
		g2.parent = this;
	} else if (this.exponent == g1) {
		this.exponent = g2;
		g2.parent = this;
	}
}

ExponentGroup.prototype.simplify = function() {
	this.base.simplify();
	this.base.valueOf().parent =
		this.base.parent;
	this.base = this.base.valueOf();
	var b_val = this.base;
	this.exponent.simplify();
	this.exponent.valueOf().parent =
		this.exponent.parent;
	this.exponent =
		this.exponent.valueOf();
	var e_val = this.exponent;
	if (b_val instanceof Fraction &&
		e_val instanceof Fraction) {
		// ModuleStep (Exponent)
		this.highlighted = true;
		push_module_step({
			type: "simplify",
			title: describe_operation({
				operation: "^",
				n1: this.base,
				n2: this.exponent
			}),
			visual: this.equation.element()
		});
		this.highlighted = false;
		this.value = new Fraction({
			numerator: Math.pow(b_val.toNumber(),
				e_val.toNumber()),
			parent: this.parent
		});
		this.value.parent = this.parent;
		if (this.parent == null) {
			this.value.top_parent = this.value;
		}
	}
}
ExponentGroup.prototype.valueOf = function() {
	if (this.value != null) {
		return this.value;
	} else {
		return this;
	}
}
ExponentGroup.prototype.element = function() {
	var elem = exponent_element(this.base,
		this.exponent, false, this.highlighted);
	if (this.parent == null && this.side != null) {
		elem.addClass(this.side + "-side");
	}
	return elem;
}

AlgebraGroup = function(json) {
	var json = json || {};
	this.text = json.text || "0";
	// Store the variables from text
	// (before simplifying)
	this.temp_variables = new Array();
	// Stores variables in the group and
	// their degree (e.g. x^2 would be {x:2})
	this.variable = json.variable || new Object();
	this.highlighted = json.highlighted || false;
	this.highlighted_temp = new Array();
	this.top_parent = this;
	this.parent = json.parent || null;
	if (this.parent != null) {
		this.top_parent = this.parent.top_parent;
	}
	this.coefficient = json.coefficient || 
		new Fraction({
			parent: this
		});
	this.equation = json.equation ||
		this.top_parent.equation || null;
	this.side = json.side ||
		this.top_parent.side || null;
	this.value = null;

	if (json.text != null && (
		json.variable == null ||
		json.coefficient == null)) {
		this.updateFromText(this.text);
	}
}

AlgebraGroup.prototype.hasVar = function(name) {
	return (this.variable[name] != null);
}
AlgebraGroup.prototype.getVar = function(name) {
	return this.variable[name];
}
AlgebraGroup.prototype.removeVar = function(name) {
	delete this.variable[name];
}
AlgebraGroup.prototype.setVar = function(name, degree) {
	this.variable[name] = degree;
	return degree;
}
AlgebraGroup.prototype.incrementVar = function(name, degree) {
	if (!this.hasVar(name)) {
		return this.setVar(name, degree);
	} else {
		return (this.variable[name] += degree);
	}
}
AlgebraGroup.prototype.variableText = function() {
	var variables = new Array();

	for (var name in this.variable) {
		variables.push(name + this.variable[name]);
	}

	return variables.join("");
}
AlgebraGroup.prototype.updateFromText = function(text) {
	var variables;
	var coefficient = new RegExp("^-?" +
		FLOAT_NUM_REGEX).exec(text);
	if (coefficient != null) {
		this.coefficient.numerator =
			+coefficient[0];
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
		var var_letter = variables[i][0];
		var var_exp = +variables[i].substr(2);
		this.temp_variables.push(var_letter + var_exp);
		this.incrementVar(var_letter, var_exp);
	}
	this.text = text;
}
AlgebraGroup.prototype.multiply = function(n) {
	// Multiply coefficients
	if (n instanceof Fraction) {
		this.coefficient.multiply(n);
		return;
	}
	// Multiply everything
	this.coefficient.multiply(n.coefficient);
	for (var name in n.variable) {
		this.incrementVar(name, n.variable[name]);
	}
}
AlgebraGroup.prototype.add = function(n) {
	// Add coefficients
	this.coefficient.add(n.coefficient);	
}
AlgebraGroup.prototype.simplify = function() {
	// Simplify coefficient
	this.coefficient.simplify();
	// Is it a constant?
	var constant = true;
	for (var name in this.variable) {
		constant = false;
		break;
	}
	if (constant) {
		this.value = this.coefficient;
		this.value.parent = this.parent;
		if (this.parent == null) {
			this.value.top_parent = this.value;
		}
	}
	// Join variables
	if (this.temp_variables == null) {
		return false;
	}
	if (!this.temp_variables.length) {
		return false;
	}
	var var_letters = [];
	for (var x = 0, y =
		this.temp_variables.length; x < y;
		++ x) {
		var temp_var = this.temp_variables[x];
		if (!temp_var.length) {
			continue;
		}
		var var_pos = var_letters.indexOf(
			temp_var[0]);
		if (var_pos != -1) {
			var other = this.temp_variables[var_pos];
			this.highlighted_temp.push(var_pos);
			this.highlighted_temp.push(x);
			// ModuleStep (Variable Exp.)
			push_module_step({
				type: "simplify",
				title: describe_operation({
					operation: "+",
					n1: +other.substr(1),
					n2: +temp_var.substr(1)
				}),
				visual: this.equation.element()
			});
			this.highlighted_temp.splice(0);
			// Combine data
			var new_exp = (+other.substr(1)) +
				(+temp_var.substr(1));
			this.temp_variables[var_pos] =
				other[0] + new_exp;
			this.temp_variables[x] = "";
		}
		var_letters.push(temp_var[0]);
	}
	this.temp_variables = null;
}
AlgebraGroup.prototype.valueOf = function() {
	if (this.value != null) {
		return this.value;
	} else {
		return this;
	}
}
AlgebraGroup.prototype.element = function() {
	var elem = document.createElement("div");
	elem.addClass("algebra-group");
	if (this.highlighted) {
		elem.addClass("highlighted");
	}
	if (this.parent == null && this.side != null) {
		elem.addClass(this.side + "-side");
	}

	var constant = this.coefficient;
	if (constant.numerator != 1 ||
		constant.denominator != 1) {
		var coefficient = constant.element();
		elem.appendChild(coefficient);
		if (coefficient.hasClass("negative")) {
			elem.addClass("negative");
			coefficient.removeClass("negative");
		}
		if (coefficient.innerHTML == "1") {
			coefficient.innerHTML = "";
		}
	}

	// Variable / Exponent elements
	if (this.temp_variables == null) {
		// Simplified
		for (var name in this.variable) {
			var exponent = this.variable[name];
			elem.appendChild(exponent_element(
				name, exponent, true,
				this.highlighted_temp.indexOf(
					name) != -1));
		}
	} else {
		// Before simplification
		for (var x = 0, y =
			this.temp_variables.length; x < y;
			++ x) {
			var temp_var = this.temp_variables[x];
			if (!temp_var.length) {
				continue;
			}
			elem.appendChild(exponent_element(
				temp_var[0], +temp_var.substr(1),
				true,
				this.highlighted_temp.indexOf(
					x) != -1));
		}
	}

	return elem;
}

Fraction = function(json) {
	var json = json || {};
	this.numerator = json.numerator != null ?
		json.numerator : 1;
	this.denominator = json.denominator != null ?
		json.denominator : 1;
	this.highlighted = json.highlighted || false;
	this.top_parent = this;
	this.parent = json.parent || null;
	this.value = this;
	if (this.parent != null) {
		this.top_parent = this.parent.top_parent;
	}
	this.equation = json.equation || null;
	this.side = json.side || null;
	if (this.top_parent != null) {
		this.equation = this.top_parent.equation;
		this.side = this.top_parent.side;
	}
}

Fraction.prototype.add = function(n) {
	// Fractions
	if (n instanceof Fraction) {
		// Match denominators
		var this_d = this.denominator;
		var n_d = n.denominator;
		if (n_d != this_d) {
			this.multiply(new Fraction({
				numerator: n_d,
				denominator: n_d
			}));
			n.multiply(new Fraction({
				numerator: this_d,
				denominator: this_d
			}));
		}
		this.numerator += n.numerator;
		var n_factors = getFactors(
			this.numerator).slice(1);
		var d_factors = getFactors(
			this.denominator).slice(1);
		var i = n_factors.length;
		while (i --) {
			var x = n_factors[i];
			if (d_factors.indexOf(x) != -1) { // GCF
				this.numerator /= x;
				this.denominator /= x;
				break;
			}
		}
		if (this.denominator < 0 &&
			this.numerator > 0) {
			this.numerator *= -1;
			this.denominator *= -1;
		}
	}
}
Fraction.prototype.multiply = function(n) {
	// Number
	if (typeof n === 'number') {
		this.numerator *= n;
	}
	// Fractions
	if (n instanceof Fraction) {
		this.numerator *= n.numerator;
		this.denominator *= n.denominator;
		if (this.numerator == 0) {
			this.denominator = 1;
		} else if (this.numerator ==
			this.denominator) {
			this.numerator =
				this.denominator = 1;
		}
	}
	if (n instanceof AlgebraGroup) {
		n.multiply(this);
		this.value = n;
	}
}
Fraction.prototype.duplicate = function() {
	return new Fraction({
		numerator: this.numerator,
		denominator: this.denominator,
		parent: this.parent
	});
}
Fraction.prototype.negative = function() {
	return new Fraction({
		numerator: this.numerator * -1,
		denominator: this.denominator,
		parent: this.parent
	});
}
Fraction.prototype.reciprocal = function() {
	return new Fraction({
		numerator: this.denominator,
		denominator: this.numerator,
		parent: this.parent
	});
}
Fraction.prototype.simplify = function(visibleGroup) {
	// visibleGroup is used to indicate
	// that another group should be used for
	// rendering (default = null)
	var visibleGroup = visibleGroup || null;
	var n = this.numerator;
	var d = this.denominator;
	var abs_n = Math.abs(n);
	var abs_d = Math.abs(d);
	if (this.numerator < 0 &&
		this.denominator < 0) {
		if (visibleGroup != null) {
			visibleGroup.highlighted = true;
		} else {
			this.highlighted = true;
		}
		push_module_step({
			type: "simplify",
			title: "Divide " + truncate_number(this) +
				" by " + truncate_number(
					new Fraction({
						numerator: -1,
						denominator: -1
					})),
			visual: this.equation.element()
		});
		this.highlighted = false;
		this.numerator *= -1;
		this.denominator *= -1;
	}
	if (this.denominator < 0 &&
		this.numerator > 0) {
		this.numerator *= -1;
		this.denominator *= -1; 
	}
	if (abs_n == 1 || abs_d == 1) {
		return false;
	}
	if (abs_n % abs_d == 0 || abs_d % abs_n == 0) {
		// ModuleStep (Divide)
		if (visibleGroup != null) {
			visibleGroup.highlighted = true;
		} else {
			this.highlighted = true;
		}
		push_module_step({
			type: "simplify",
			title: describe_operation({
				operation: "/",
				n1: this.numerator,
				n2: this.denominator
			}),
			visual: this.equation.element()
		});
		this.highlighted = false;
		if (n % d == 0) {
			this.numerator /= d;
			this.denominator = 1;
		} else {
			this.denominator /= n;
			this.numerator = 1;
		}
		return true;
	}
	var n_factors = getFactors(abs_n).slice(1);
	var d_factors = getFactors(abs_d).slice(1);
	var i = n_factors.length;
	while (i --) {
		var x = n_factors[i];
		if (d_factors.indexOf(x) != -1) { // GCF
			// ModuleStep (Simplify)
			if (visibleGroup != null) {
				visibleGroup.highlighted = true;
			} else {
				this.highlighted = true;
			}
			push_module_step({
				type: "simplify",
				title: "Divide " + truncate_number(this) +
					" by " + truncate_number(
						new Fraction({
							numerator: x,
							denominator: x
						})),
				visual: this.equation.element()
			});
			this.highlighted = false;
			this.numerator /= x;
			this.denominator /= x;
			return true;
		}
	}
	return false;
}
Fraction.prototype.valueOf = function() {
	return this.value;
}
Fraction.prototype.toNumber = function() {
	return (this.numerator /
		this.denominator);
}
Fraction.prototype.toString = function () {
	if (this.denominator == 1) {
		return this.numerator;
	}
	return this.numerator + "/" +
		this.denominator;
}
Fraction.prototype.element = function() {
	var elem = fraction_element(this.numerator,
		this.denominator, true, this.highlighted);
	if (this.parent == null && this.side != null) {
		elem.addClass(this.side + "-side");
	}
	return elem;
}

SolutionRender = function(json) {
	this.value = json.value || 0;
}

SolutionRender.prototype.element = function() {
	var elem = document.createElement("div");
	elem.addClass("render");
	elem.addClass("solution");

	if (typeof this.value === 'number') {
		elem.innerHTML = this.value;
	} else {
		elem.appendChild(this.value.element());
	}

	return elem;
}

function describe_operation(json) {
	if (json.abs == null) {
		json.abs = true;
	}
	if (json.operation == "^") {
		var o_string = null;
		if (json.n2 == 2) {
			o_string = "Square";
		} else if (json.n2 == 3) {
			o_string = "Cube";
		} else if (json.n2 == 0.5) {
			o_string = "Take the square root of";
		}
		if (o_string != null) {
			return o_string + " " + json.n1;
		}
	}
	if (json.operation == "-") {
		return "Subtract " + truncate_number(
			json.n2) + " from " +
			truncate_number(json.n1);
	}
	var start = "";
	var middle = "";
	var end = "";
	switch (json.operation) {
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
			end = ordinal_of(json.n2) + " power";
			break;
		default:
			break;
	}
	return start + " " +
		truncate_number(json.n1, json.abs) +
		" " + middle + " " +
		truncate_number(json.n2, json.abs) + end;
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
	// console.log([str1, str2]);

	var y = Math.min(str1.length, str2.length);

	for (var x = 0; x < y; ++ x) {
		if (str1[x] == str2[x]) {
			continue;
		}
		return x;
	}

	return y;
}

function truncate_number(n, abs) {
	// n = number (Mixed)
	// abs = use absolute value (Boolean)
	if (abs == null) {
		var abs = true;
	}
	if (typeof n === 'object') {
		var n_elem = n.element();
		n_elem.removeClass("highlighted");
		var subtracted = false;
		var x = n;
		while (abs && x.parent != null) {
			if (x.parent.groups == null) {
				break;
			}
			if (x.parent.groups[0] == x) {
				x = x.parent;
				continue;
			} else if (x.parent instanceof
				ExpressionGroup) {
				subtracted = true;
			}
			break;
		}
		if (n_elem.hasClass("negative") &&
			!subtracted) {
			n_elem.removeClass("negative");
			if (!n_elem.hasClass("fraction")) {
				n_elem.innerHTML = "-" +
					n_elem.innerHTML;
			} else {
				n_elem.children[0].innerHTML = "-" +
					n_elem.children[0].innerHTML;
			}
		} else if (subtracted) {
			n_elem.removeClass("negative");
		}
		return "<div class='render'>" +
			n_elem.outerHTML + "</div>";
	} else if (abs) {
		n = Math.abs(n);
	}
	if (/\.\d{5,}$/.test(n.toString())) {
		var n_str = n.toFixed(4);
	} else {
		var n_str = n.toString();
	}

	n_str = n_str.split(".");
	var d_str = (n_str[1] == null ? "" :
		"." + n_str[1]);
	n_str = n_str[0];
	n_str = n_str.split("").reverse().join("");
	n_str = n_str.replace(/(\d{3}(?=\d))/g, "$1,");
	n_str = n_str.split("").reverse().join("");

	return n_str + d_str;
}

function getFactors(x) {
	var factors = new Array();
	for (var y = 1; y <= x; ++ y) {
		if (factors.indexOf(y) != -1) {
			break;
		}
		if (x % y == 0) {
			factors.push(y);
			factors.push(x / y);
		}
	}
	factors.sort(function(a, b) {
		return (a - b);
	});
	return factors;
}

// Rendering Functions

function exponent_element(b, e, simple, marked) {
	// b = base (Mixed)
	// e = exponent (Mixed)
	// simple (Boolean)
	// marked = highlighted (Boolean)

	// when simple is true if e is 1,
	// the element doesn't display the
	// exponent

	if (simple == null) {
		var simple = true;
	}
	var marked = marked || false;

	var wrapper = null;

	if (!simple || e != 1) {
		wrapper = document.createElement("span");
		if (marked) {
			wrapper.addClass("highlighted");
		}
		wrapper.addClass("operation");
		wrapper.addClass("exponent-wrapper");
		// if (b instanceof Fraction) {
		// 	if (b.toNumber() < 0) {
		// 		wrapper.addClass("negative");
		// 	}
		// }
		wrapper.setAttribute("data-operation",
			"^");
	}

	if (typeof b !== 'object') {
		var base = document.createElement("div");
		base.addClass("number");
		if (typeof b === 'string') {
			base.addClass("variable");
			base.innerHTML = b;	
		} else {
			base.innerHTML = truncate_number(b);
		}
	} else {
		var base = b.element();
		if (base.hasClass("negative")) {
			base.innerHTML = "-" + base.innerHTML;
			base.removeClass("negative");
			base.addClass("parentheses");
		}
		if (b.groups != null) {
			base.addClass("parentheses");
		}
		// if (wrapper != null &&
		// 	base.hasClass("negative")) {
		// 	wrapper.addClass("negative");
		// 	base.removeClass("negative");
		// }
	}

	if (wrapper == null) {
		if (b instanceof Fraction) {
			if (b.toNumber() < 0) {
				base.addClass("negative");
			}
		}
		if (marked) {
			base.addClass("highlighted");
		}
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
		exponent.innerHTML = truncate_number(e);
	} else {
		var exponent = e.element();
	}
	exponent.addClass("exponent");
	wrapper.appendChild(exponent);

	return wrapper;
}

function fraction_element(n, d, simple, marked) {
	// n = numerator (Mixed)
	// d = denominator (Mixed)
	// simple (Boolean)
	// marked = highlighted (Boolean)

	// when simple is true if d is 1,
	// the element doesn't display the
	// denominator

	if (simple == null) {
		var simple = true;
	}
	var marked = marked || false;

	var fraction = document.createElement(
		"span");
	if (marked) {
		fraction.addClass("highlighted");
	}

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
		numerator.innerHTML = truncate_number(
			Math.abs(n));
		var n_negative = (n < 0);
	} else {
		var n_elem = n.element();
		numerator.appendChild(n_elem);
		var n_negative = (n_elem.hasClass(
			"negative"));
	}

	if (!simple || d != 1) {
		var denominator = document.createElement(
			"span");
		denominator.addClass("denominator");
		if (typeof d !== 'object') {
			denominator.addClass("number");
			denominator.innerHTML = truncate_number(
				d);
		} else {
			denominator.appendChild(d.element());
		}
		fraction.appendChild(denominator);
	}

	if (n_negative) {
		if (simple && d == 1) {
			fraction.addClass("negative");
		} else if (typeof n !== 'object') {
			fraction.addClass("negative");
		}
	}

	return fraction;
}