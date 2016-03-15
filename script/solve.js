/*
 * Solve.js - classes for interpeting
 * and solving equations/expressions
 * Copyright (C) 2015 - 2016 Ian Jones
 * http://pineapple.pub/LICENSE.txt
 */

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
	this.result = this;
}

Equation.prototype.comparison = "=";
Equation.prototype.left_degree = 0;
Equation.prototype.right_degree = 0;

Equation.prototype.replace = function() {
	var json = replace_factor_json(arguments);

	// Replace in both sides
	if (this.left != null) {
		this.left.replaceFactor(json);
		this.left = this.left.valueOf();
		this.left.fixLinks();
	}
	this.right.replaceFactor(json);
	this.right = this.right.valueOf();
	this.right.fixLinks();

	// Check if sides are equal
	if (this.left != null && this.left.valueOf() instanceof Fraction &&
		this.right.valueOf() instanceof Fraction &&
		this.left.valueOf().toNumber() != this.right.valueOf().toNumber()) {
		console.log("Oh dear...");
		this.comparison = "&ne;";
		return;
	}
}

Equation.prototype.isolate = function(v) {
	// If no left side exists set it to 0
	if (this.left == null) {
		this.left = new Fraction({
			numerator: 0,
			equation: this,
			side: "left"
		});
	}
	// Side preference
	var pref_side = "left";
	var other_side = "right";
	var in_left = (this.left_vars.indexOf(
		v) != -1);
	var in_right = (this.right_vars.indexOf(
		v) != -1);
	if (in_left && !in_right) {

	} else if (in_right && !in_left) {
		pref_side = "right";
		other_side = "left";
	} else if (this.left_degree < this.right_degree) {
		pref_side = "right";
		other_side = "left";
	}

	var group = this[pref_side];
	if (group instanceof ExpressionGroup) {
		for (var x = 0, y = group.groups.length;
			x < y; ++ x) {
			var g = group.groups[x];
			var restart = false;
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
				restart = true;
			} else if (g instanceof AlgebraGroup) {
				// Has other vars?
				var var_str = "";
				for (var name in g.variable) {
					if (name == v) {
						continue;
					}
					var_str += name + "^" +
						g.variable[name];
				}
				if (var_str.length) {
					console.log("get rid of " + var_str);
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
					var adding =
						(g.coefficient.toNumber() <= 0);
					var g1 = g.duplicate();
					g1.coefficient.multiply(-1);
					var g2 = g1.duplicate();
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
					restart = true;
				}
			}
			// Start over?
			if (restart) {
				this.left.simplify();
				this.left = this.left.valueOf();
				this.right.simplify();
				this.right = this.right.valueOf();
				x = 0;
				y = group.groups.length;
			}
		}
	} else if (group instanceof MultiplyGroup) {
		for (var x = 0, y = group.groups.length;
			x < y; ++ x) {
			var g = group.groups[x];
			if (g instanceof Fraction) {
				var dividing = (Math.abs(g.toNumber()) > 1);
				var s_group = this[other_side];
				if (!dividing && !(s_group instanceof
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
				} else if (dividing && !(s_group
					instanceof FractionGroup)) {
					this[other_side] = new FractionGroup({
						equation: this,
						side: other_side,
						numerator: s_group,
						denominator: "1"
					});
					s_group.parent = this[other_side];
					s_group = this[other_side];
				}
				if (!dividing) {
					var g1 = g.reciprocal();
					var g2 = g.reciprocal();
					s_group.push(g1);
					m_group.push(g2);
					g1.highlighted = true;
				} else {
					var g1 = g.duplicate();
					var g2 = g.duplicate();
					s_group.denominator.multiply(g1);
					m_group.denominator = g2;
					s_group.denominator.highlight(
						g1.toString());
				}
				push_module_step({
					type: "isolate",
					variable: v,
					title: (dividing ? "Divide" :
						"Multiply") + " both sides by " +
						(dividing ? truncate_number(g) :
							truncate_number(g1)),
					visual: this.element()
				});
				if (!dividing) {
					g1.highlighted = false;
				} else {
					s_group.denominator.highlight(false);
				}
				g2.highlighted = false;
			}
		}
	} else if (group instanceof AlgebraGroup) {
		if (group.coefficient.toNumber() != 1) {
			var s_group = this[other_side];
			var g = group.coefficient;
			var dividing = (Math.abs(g.toNumber()) > 1);
			if (!dividing && !(s_group instanceof
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
			} else if (dividing && !(s_group
				instanceof FractionGroup)) {
				this[other_side] =
					new FractionGroup({
						equation: this,
						side: other_side,
						numerator: s_group,
						denominator: "1"
					});
				s_group.parent = this[other_side];
				s_group = this[other_side];
			}
			if (!dividing) {
				var m_group = new MultiplyGroup({
					equation: this,
					side: pref_side
				});
				m_group.push(group);
			} else {
				var m_group = new FractionGroup({
					equation: this,
					side: pref_side,
					numerator: group,
					denominator: "1"
				});
			}
			this[group.side] = m_group;
			if (!dividing) {
				var g1 = g.reciprocal();
				var g2 = g.reciprocal();
				s_group.push(g1);
				m_group.push(g2);
				g1.highlighted = true;
			} else {
				var g1 = g.duplicate();
				var g2 = g.duplicate();
				s_group.denominator.multiply(g1);
				m_group.denominator = g2;
				s_group.denominator.highlight(
					g1.toString());
			}
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
			if (!dividing) {
				g1.highlighted = false;
			} else {
				s_group.denominator.highlight(false);
			}
			g2.highlighted = false;
		} else {
			// Has other vars?
			var var_str = "";
			for (var name in group.variable) {
				if (name == v) {
					continue;
				}
				var_str += name + "^" +
					group.variable[name];
			}
			if (var_str.length) {
				var s_group = this[other_side];
				if (!(s_group
					instanceof FractionGroup)) {
					this[other_side] =
						new FractionGroup({
							equation: this,
							side: other_side,
							numerator: s_group,
							denominator: "1"
						});
					s_group.parent = this[other_side];
					s_group = this[other_side];
				}
				var m_group = new FractionGroup({
					equation: this,
					side: pref_side,
					numerator: group,
					denominator: "1"
				});
				this[group.side] = m_group;

				var g = new AlgebraGroup({ // Visual
					text: var_str
				});
				var g1 = new AlgebraGroup({
					text: var_str,
					parent: s_group
				});
				var g2 = new AlgebraGroup({
					text: var_str,
					parent: m_group
				});
				s_group.denominator.multiply(g1);
				s_group.denominator =
					s_group.denominator.valueOf();
				m_group.denominator = g2;

				console.log(s_group.denominator);
				s_group.denominator.highlight(var_str);
				g2.highlighted = true;
				push_module_step({
					type: "isolate",
					variable: v,
					title: ("Divide both sides by " +
						truncate_number(g)),
					visual: this.element()
				});
				s_group.denominator.highlight(false);
				g2.highlighted = false;
			}
		}
	} else if (group instanceof FractionGroup) {
		if (group.denominator instanceof AlgebraGroup ||
			group.denominator instanceof Fraction) {
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
			var g = group.denominator;
			var g1 = g.duplicate();
			var g2 = g.duplicate();
			s_group.push(g1);
			m_group.push(g2);
			g1.highlighted = true;
			g2.highlighted = true;
			push_module_step({
				type: "isolate",
				variable: v,
				title: "Multiply both sides by " +
					truncate_number(g),
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

	// Update var info
	this.updateVarInfo();

	// Check if No Real Solution
	if (this.left_degree == 0 &&
		this.right_degree == 0) {
		console.log("NRS?");
		this.comparison = "&ne;";
		return;
	}

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
				finished = false;
			}
		}
	}
	if (!finished) {
		this.isolate(v);
	}
}

Equation.prototype.factor = function(v, solve) {
	var solve = solve || false;
	// Eliminate other variables
	for (var x = 0, y = this.all_vars.length;
		x < y; ++ x) {
		if (this.all_vars[x] == v) {
			continue;
		}
		this.replace(this.all_vars[x], 0);
	}
	// Update var info
	this.updateVarInfo();
	var v_info = this.getVarInfo();
	// Quadratic
	if (v_info.max_degree == 2) {
		// console.log("Quadratic");
		// TODO: Quadratic formula / factoring
		var side = (this.right_degree < 2 ? "left" :
			"right");
		var a = b = c = 0; // Coefficients
		var d; // Discriminant
		this[side] = this[side].valueOf();
		this[side].top_parent = this[side];
		this[side].parent = null;
		if (this[side] instanceof AlgebraGroup) {
			console.log("Factoring is pointless");
			return true;
		} else if (this[side] instanceof
			ExpressionGroup) {
			for (var i = this[side].groups.length;
				i --; ) {
				var group = this[side].groups[i];
				if (group instanceof AlgebraGroup) {
					if (group.getVar(v) == 2) {
						a = group.coefficient.toNumber();
					} else {
						b = group.coefficient.toNumber();
					}
				} else if (group instanceof Fraction) {
					c = group.toNumber();
				}
			}
		} else if (this[side] instanceof FractionGroup &&
			new RegExp("\\/\\(" + NEG_FRACTION_REGEX +
				"\\)$").test(this[side].toString())) {
			if (this[side].numerator instanceof AlgebraGroup) {
				console.log("Factoring is pointless");
				return true;
			}
			if (this[side].numerator instanceof ExpressionGroup) {
				var g = this[side].numerator;
				for (var i = g.groups.length; i --; ) {
					var group = g.groups[i];
					if (group instanceof AlgebraGroup) {
						if (group.getVar(v) == 2) {
							a = group.coefficient.toNumber();
						} else {
							b = group.coefficient.toNumber();
						}
					} else if (group instanceof Fraction) {
						c = group.toNumber();
					}
				}
				var d = this[side].denominator.toNumber();
				a /= d;
				b /= d;
				c /= d;
			}
		}
		d = Math.pow(b, 2) - (4 * a * c);
		/*console.log({
			a: a,
			b: b,
			c: c
		});*/
		if (d < 0) {
			// console.warn("No real solution");
			this.result = new ResultText({
				text: "No real solution",
				icon: "exclamation-triangle"
			});
			return false;
		}
		var sqrt_d = Math.sqrt(d);
		if (sqrt_d % 1 == 0) {
			// console.log("Can factor");
			// ModuleStep: Factor variable
			this[side].highlighted = true;
			push_module_step({
				type: "simplify",
				title: "Factor " + v,
				visual: this.element()
			});
			this[side].highlighted = false;
			// Get the two factors
			var f1 = get_fraction(
				-(-b + sqrt_d) / (2 * a));
			var f2 = get_fraction(
				-(-b - sqrt_d) / (2 * a));
			var fc = a /
				(f1.denominator * f2.denominator);
			var f1_text = f1.denominator + v +
					(f1.numerator != 0 ?
					"+" + f1.numerator : "");
			var f2_text = f2.denominator + v +
					(f2.numerator != 0 ?
					"+" + f2.numerator : "");
			// Restructure this side of the equation
			this[side] = new MultiplyGroup({
				text: (fc != 1 ? fc : "") +
					"(" + f1_text +
					")(" + f2_text + ")",
				equation: this,
				side: side
			});
			// Solve factors
			if (solve) {
				// Output reference visual
				push_module_step({
					type: "reference",
					visual: this.element()
				});
				// Get factor objects
				var f1g = this.right.groups[
					+(fc != 1)].valueOf();
				var f2g = this.right.groups[
					+(fc != 1) + 1].valueOf();
				var solutions = new Array();
				push_module_type("solve-factors");
				var f1e = new Equation({
					text: f1_text + "=0"
				});
				f1g.highlighted = true;
				push_module_step({
					type: "solve-factors",
					title: "Set " + 
						truncate_number(f1g) +
						" equal to zero",
					visual: this.element()
				});
				f1g.highlighted = false;
				f1e.isolate(v);
				solutions.push(f1e.right);
				var f2e = new Equation({
					text: f2_text + "=0"
				});
				f2g.highlighted = true;
				push_module_step({
					type: "solve-factors",
					title: "Set " + 
						truncate_number(f2g) +
						" equal to zero",
					visual: this.element()
				});
				f2g.highlighted = false;
				f2e.isolate(v);
				solutions.push(f2e.right);
				this.left = new AlgebraGroup({
					text: v,
					equation: this,
					side: "left"
				});
				this.right = new BracketGroup({
					groups: solutions,
					equation: this,
					side: "right"
				});
			}
		} else {
			console.log("Not factorable");
			if (solve) {
				if (this.left != null) {
					if (this.left_vars.indexOf(
						v) != -1) {
						if (this.right_vars.indexOf(
							v) != -1) {
							// Stop right there
							return false;
						}
						var pref_side = "left";
					} else {
						var pref_side = "right";
					}
				} else {
					var pref_side = "right";
				}
				if (pref_side == "left") {
					var other_side = "right";
				} else {
					var other_side = "left";
				}
				// If just simplified
				if (modules.length) {
					push_module_step({
						type: "reference",
						visual: this.element()
					});
				}
				// Output reference visual
				var quad_equation = new Equation({
					text: "(-b\u00B1(b^2-4ac)^0.5)/(2a)"
				});
				quad_equation.right.simplify();
				quad_equation.right = quad_equation.right.valueOf();
				push_module_step({
					type: "simplify",
					title: "Start with",
					visual: quad_equation.element()
				});
				a = get_fraction(a).toString();
				b = get_fraction(b).toString();
				c = get_fraction(c).toString();
				push_module_step({
					type: "simplify",
					title: "In this case a, b, and c are (respectively)",
					visual: new BracketGroup({
						text: a + "," + b + "," + c
					}).element()
				});
				quad_equation.replace({
					"a": a,
					"b": b,
					"c": c
				});
				/*quad_equation.replace("a", a);
				quad_equation.replace("b", b);
				quad_equation.replace("c", c);*/
				this[pref_side] = quad_equation.right;
				this[other_side] = new AlgebraGroup({
					text: v,
					equation: this,
					side: other_side
				});
				var lost_module = modules.pop();
				lost_module.type = "quadratic";
				lost_module.title = "Quadratic equation";
				var new_module = push_module_type("quadratic");
				for (var x = 0, y = lost_module.steps.length; x < y; ++ x) {
					var step = lost_module.steps[x];
					step.type = "quadratic";
					new_module.steps.push(step);
				}
				push_module_step({
					type: "reference",
					visual: this[pref_side].element()
				});
				this[pref_side].simplify();
				this[pref_side] =
					this[pref_side].valueOf();
			} else {
				this.result = new ResultText({
					text: "Not factorable",
					icon: "exclamation-triangle"
				});
			}
		}
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
					group.variable[name].toNumber());
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

Equation.prototype.factorOut = function(factor, showSteps) {
	// TODO: Implement a highlightFactor method in all components
	var showSteps = showSteps || false;
	if (showSteps) {
		if (this.left != null) this.left.valueOf().highlighted = true;
		this.right.highlighted = true;
		push_module_step({
			type: "simplify",
			title: "Factor " + truncate_number(new ExpressionGroup({
					text: factor
				})) + " out of the equation",
			visual: this.element()
		});
		if (this.left != null) this.left.valueOf().highlighted = false;
		this.right.highlighted = false;
	}
	// Actually factor
	if (this.left != null) {
		this.left.factorOut(factor);
		this.left = this.left.valueOf();
		this.left.fixLinks();
	}
	this.right.factorOut(factor);
	this.right = this.right.valueOf();
	this.right.fixLinks();
}

Equation.prototype.toString = function() {
	return (this.left != null ? this.left.toString()
		+ this.comparison : "") + this.right.toString();
}

Equation.prototype.simplify = function() {
	// Simplify both sides (if applicable)
	if (this.left != null) {
		this.left.simplify();
		this.left = this.left.valueOf();
		this.left.fixLinks();
	}
	this.right.simplify();
	this.right = this.right.valueOf();
	this.right.fixLinks();

	// Factor out common factors between both sides
	if (this.left != null) {
		var left_factors = this.left.factors();
		left_factors = sort_factors(left_factors);
		var right_factors = this.right.factors();
		// Get rid of all useless numbers
		var removed_n = false;
		var removed_d = false;
		var removed_vars = [];
		for (var x = 0, y = left_factors.length; x < y; ++ x) {
			var f = left_factors[x];
			// If this isn't in both, skip it
			if (right_factors.indexOf(f) === -1) continue;
			if (/[a-zA-Z]/.test(f)) { // Variable
				// Ignore variables for now
				continue;
				var v = f.replace(/[^a-zA-Z]/g, "");
				if (removed_vars.indexOf(v) !== -1) continue;
				removed_vars.push(v);
				this.factorOut(f, true);
			} else if (f.indexOf("1/") === 0) { // Reciprocal
				if (x != y - 1) continue;
				removed_d = true;
				this.factorOut(f, true);
			} else if (f == "-1") {
				removed_d = true;
				this.factorOut(f, true);
			} else if (f != "1") {
				if (removed_n) continue;
				removed_n = true;
				this.factorOut(f, true);
			}
		}
		// If anything was factored out, re-simplify
		if (removed_n || removed_d || removed_vars.length) {
			this.simplify();
		}
	}
}

Equation.prototype.element = function() {
	var elem = document.createElement("div");
	elem.addClass("render");
	elem.addClass("equation");

	if (this.left != null) {
		var left_elem = this.left.valueOf().element();
		if (left_elem.hasClass("fraction") &&
			left_elem.hasClass("negative")) {
			left_elem.children[0].addClass("negative");
			left_elem.removeClass("negative");
		}
		elem.appendChild(left_elem);
		var equals = document.createElement(
			"span");
		equals.addClass("equals");
		equals.innerHTML = this.comparison;
		elem.appendChild(equals);
	}

	var right_elem = this.right.valueOf().element();
	if (right_elem.hasClass("fraction") &&
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
	this.text = this.text.replace(/(?:\s)/g, "");
	this.text = this.text.replace(/\+{2,}/g, "+");
	this.text = this.text.replace(
		/(^|[^\+\*\/\^\(])(-|\u00B1)/g, "$1+$2");
	this.text = this.text.replace(
		/\*\u00B1([-+]|\u00B1)/g, "*+\u00B1$1");
	// this.text = this.text.replace(new RegExp("(^|[^\\/0-9])\\((" +
	// 	FRACTION_REGEX + ")\\)(?![\\/0-9a-zA-Z])", "g"), "$1$2");
	this.text = this.text.replace(/pi/gi, "\u03C0");
	this.text = this.text.replace(/([a-z\u03C0])\^([a-z\u03C0])/gi, "$1^($2)");
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

		if (group_text[0] == "\u00B1") {
			var plus_minus = new PlusMinusGroup({
				parent: this
			});
			this.groups.push(plus_minus);
			plus_minus.group =
				new MultiplyGroup({
					text: group_text.substr(1),
					parent: plus_minus
				})
		} else {
			this.groups.push(new MultiplyGroup({
				text: group_text,
				parent: this
			}));
		}
	}
	var group_text =
		this.text.substr(p_start);
	if (group_text.length) {
		if (group_text[0] == "\u00B1") {
			var plus_minus = new PlusMinusGroup({
				parent: this
			});
			this.groups.push(plus_minus);
			plus_minus.group =
				new MultiplyGroup({
					text: group_text.substr(1),
					parent: plus_minus
				})
		} else {
			this.groups.push(new MultiplyGroup({
				text: group_text,
				parent: this
			}));
		}
	}

	// Initial value
	if (this.groups.length == 1) {
		this.value = this.groups[0].valueOf();
		this.value.parent = this.parent;
		if (this.parent == null) {
			this.value.top_parent = this.value;
		}
	}
}

ExpressionGroup.prototype.push = function(group) {
	this.groups.push(group);
	group.parent = this;
	group.top_parent = this.top_parent;
	group.side = this.side;
	group.equation = this.equation;
}

ExpressionGroup.prototype.duplicate = function() {
	var result = new ExpressionGroup();
	for (var x = 0, y = this.groups.length; x < y; ++ x) {
		result.push(this.groups[x].duplicate());
	}
	return result;
}

ExpressionGroup.prototype.multiply = function(group) {
	for (var x = 0, y = this.groups.length; x < y; ++ x) {
		var n2 = group.duplicate();
		this.groups[x].multiply(n2);
		this.groups[x] = this.groups[x].valueOf();
	}
}

ExpressionGroup.prototype.replace = function(g1, g2) {
	// g1 = The old group
	// g2 = The new group

	var index = this.groups.indexOf(g1);
	if (index == -1) {
		for (var i = this.groups.length; i --; ) {
			if (this.groups[i].valueOf() != g1) continue;
			index = i;
			break;
		}
	}
	this.groups[index] = g2;
	g2.parent = this;
	g2.top_parent = this.top_parent;
	g2.side = this.side;
	g2.equation = this.equation;
}

ExpressionGroup.prototype.insertBefore = function(g1, g2) {
	// g1 = The group used to find location
	// g2 = The group being inserted

	if (typeof g1 !== 'number') {
		g1 = this.groups.indexOf(g1);
	}
	var temp_groups = this.groups.splice(g1);
	this.groups.push(g2);
	this.groups = this.groups.concat(temp_groups);
	g2.parent = this;
	g2.side = this.side;
	g2.equation = this.equation;
}

ExpressionGroup.prototype.remove = function(group) {
	this.groups.splice(this.groups.indexOf(group), 1);
}

ExpressionGroup.prototype.factorOut = function(factor, showSteps) {
	var showSteps = showSteps || false;
	if (showSteps) {
		this.highlighted = true;
		push_module_step({
			type: "simplify",
			title: describe_operation({
				operation: "/f",
				n1: factor,
				n2: this
			}),
			visual: this.equation.element()
		});
		this.highlighted = false;
	}
	// Actually factor
	for (var i = this.groups.length; i --; ) {
		this.groups[i].factorOut(factor);
	}
}

ExpressionGroup.prototype.toString = function() {
	var g_array = new Array();
	for (var x = 0, y = this.groups.length; x < y;
		++ x) {
		g_array.push(this.groups[x].toString());
	}
	return g_array.join("+").replace(/\+-/g, "-");
}

ExpressionGroup.prototype.factors = function() {
	var factors = [];
	for (var i = this.groups.length; i --; ) {
		factors.push(this.groups[i].factors());
	}
	if (!factors.length) return factors;
	function in_others(factor) {
		for (var i = factors.length - 1; i --; ) {
			if (factors[i + 1].indexOf(factor) == -1) return false;
		}
		return true;
	}
	var result = new Array();
	for (var i = factors[0].length; i --; ) {
		if (!in_others(factors[0][i])) continue;
		result.push(factors[0][i]);
	}
	return result;
}

ExpressionGroup.prototype.replaceFactor = function(json) {
	var json = replace_factor_json(arguments);
	// TODO: Make it possible to replace expressions?
	// 	(e.g. "2x+1")
	// Replace factors in children
	for (var x = 0, y = this.groups.length; x < y; ++ x) {
		this.groups[x].valueOf().replaceFactor(json);
	}
}

ExpressionGroup.prototype.fixLinks = function() {
	for (var i = this.groups.length; i --; ) {
		// Fix links between this and this.groups[i]
		this.groups[i] = this.groups[i].valueOf();
		this.groups[i].parent = this;
		this.groups[i].top_parent = this.top_parent;
		// Fix the links within this.groups[i]
		this.groups[i].fixLinks();
	}
}

ExpressionGroup.prototype.simplify = function() {
	// Constants / Simplify groups
	var constants = new Array();
	var algebra = new Object();
	var c_groups = new Object();
	var radical = null;
	for (var x = 0, y = this.groups.length;
		x < y; ++ x) {
		var group = this.groups[x];
		group.simplify();
		if (group instanceof MultiplyGroup &&
			group.value instanceof ExpressionGroup) {
			this.remove(group);
			var g = group.valueOf();
			for (var i = 0, y = g.groups.length; i < y; ++ i) {
				this.insertBefore(x + i, g.groups[i]);
			}
			-- x;
			y = this.groups.length;
			continue;
		}
		group.valueOf().parent = group.parent;
		group = this.groups[x] = group.valueOf();
		// Radicals
		if (group instanceof MultiplyGroup) {
			var m_radical = null;
			for (var i = group.groups.length; i --; ) {
				if (group.groups[i] instanceof ExponentGroup) {
					if (/1\/\d+/.test(group.groups[i].exponent.toString())) {
						m_radical = group.groups[i].toString();
					}
				}
			}
			if (m_radical) {
				if (x == 0) {
					radical = m_radical;
				} else if (radical != m_radical) {
					radical = null;
				}
			} else {
				radical = null;
			}
		} else if (group instanceof ExponentGroup) {
			if (/1\/\d+/.test(group.exponent.toString())) {
				m_radical = group.toString();
				if (x == 0) {
					radical = m_radical;
				} else if (radical != m_radical) {
					radical = null;
				}
			}
		} else {
			radical = null;
		}
		// Constants / Variables
		if (group instanceof ConstantGroup) {
			var v_text = group.constantText();
			if (c_groups[v_text] == null) {
				c_groups[v_text] = group;
			} else {
				var other = c_groups[v_text];
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
				if (other.coefficient.toString() ==
					"0") {
					var o_index = this.groups.indexOf(
						other);
					if (this.groups.length == 1) {
						other.coefficient.parent = this;
						this.groups[o_index] = other.coefficient;
						constants.push(o_index);
						constants = constants.sort();
					} else {
						this.groups.splice(o_index, 1);
						// Correct constants
						for (var i = constants.length;
							i --; ) {
							if (constants[i] > o_index) {
								-- constants[i];
							}
						}
					}
				}
			}
		} else if (group instanceof Fraction) {
			constants.push(x);
		} else if (group instanceof AlgebraGroup) {
			var v_text = group.variableText();
			if (group.coefficient instanceof ConstantGroup) {
				v_text = group.coefficient.constantText() + v_text;
			}
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
				if (other.coefficient.toString() ==
					"0") {
					var o_index = this.groups.indexOf(
						other);
					if (this.groups.length == 1) {
						other.coefficient.parent = this;
						this.groups[o_index] = other.coefficient;
						constants.push(o_index);
						constants = constants.sort();
					} else {
						this.groups.splice(o_index, 1);
						// Correct constants
						for (var i = constants.length;
							i --; ) {
							if (constants[i] > o_index) {
								-- constants[i];
							}
						}
					}
				}
			}
		}
	}
	algebra = null;
	if (constants.length) {
		var n1 = this.groups[constants[0]];
		n1.highlighted = true;
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
		// 0 + x + y... = x + y...
		if (this.groups.length > 1 &&
			n1.toString() == "0") {
			this.remove(n1);
		}
	}
	// Take out common radical (if applicable)
	if (radical && this.groups.length >= 2) {
		this.highlighted = true;
		// ModuleStep: Factor out radical
		push_module_step({
			type: "simplify",
			title: describe_operation({
				operation: "/f",
				n1: radical,
				n2: this
			}),
			visual: this.equation.element()
		});
		this.highlighted = false;
		this.factorOut(radical);
		var m_group = this.multiplyGroup();
		var parts = radical.split("^");
		m_group.push(new ExponentGroup({
			equation: this.equation,
			side: this.side,
			base: parts[0].replace(/[()]/g, ""),
			exponent: parts[1].replace(/[()]/g, "")
		}));
		m_group.fixLinks();
		m_group.simplify();
		return;
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

ExpressionGroup.prototype.multiplyGroup = function(n) {
	var m_group;
	if (this.parent != null && this.parent.valueOf() instanceof MultiplyGroup) {
		m_group = this.parent.valueOf();
	} else {
		var par = this.parent;
		if (par != null) par = par.valueOf();
		m_group = new MultiplyGroup({
			parent: par,
			side: this.side,
			equation: this.equation
		});
		m_group.push(this);
		if (par == null) {
			this.top_parent = m_group.top_parent = m_group;
			if (this.equation != null) this.equation[this.side] = m_group;
		} else {
			par.valueOf().replace(this, m_group);
		}
	}
	if (n) m_group.push(n);
	return m_group;
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
		var group_elem = group.valueOf().element();

		// Operation Elements
		if (x && !(group instanceof
			PlusMinusGroup)) {
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
				if (prev_group.denominator == 1 &&
					group.denominator == 1) {
					o_elem.addClass("highlighted");
				}
			}
			wrapper.appendChild(o_elem);
		} else if (group_elem.hasClass("negative")) {
			if (group.groups != null && group_elem.children.length) {
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

	var temp_text = this.text/*.replace(
		new RegExp("(?!^)([^0-9\\.\\^\\*\\/\\+\\-\\(" +
			"\u00B1])(" + NEG_FRACTION_REGEX +
			")", "gi"), "$1*$2")*/;
	temp_text = temp_text.replace(new RegExp(
		"([a-z]\\^)(\\()", "gi"), "*$1$2");
	temp_text = temp_text.replace(new RegExp(
		"-(" + NEG_FRACTION_REGEX + ")\\^"), "-1*$1^");
	// temp_text = temp_text.replace(new RegExp("\\((" +
	// 	FRACTION_REGEX + ")\\)", "g"), "$1");
	// temp_text = temp_text.replace(new RegExp("(^|[^\\/0-9]|)\\((" +
	// 	FRACTION_REGEX + ")\\)(?![\\/0-9a-zA-Z])", "g"), "$1$2");
	// console.log(temp_text);

	var function_group = null;
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

			// Check if this is a function
			var func = new RegExp(DEFAULT_FUNCTIONS_REGEX).exec(
				group_text);
			if (func) {
				func = func[0];
				group_text = group_text.replace(new RegExp(
					DEFAULT_FUNCTIONS_REGEX), "");
			}
			if (group_text) {
				this.groups.push(group_text);
			}
			if (func) {
				var function_group = new FunctionGroup({
					name: func,
					parent: this
				});
				this.groups.push(function_group);
			}
		} else if (character == "," && p_level == 1 && function_group) {
			var group_text =
				temp_text.substr(p_start, x - p_start);
			p_start = x + 1;

			if (!group_text.length) {
				continue;
			}

			function_group.arguments.push(new ExpressionGroup({
				text: group_text,
				parent: function_group
			}));
		} else if (character == ")") {
			-- p_level;

			if (p_level) {
				continue;
			}

			var group_text =
				temp_text.substr(p_start, x - p_start);
			p_start = x + 1;

			if (!group_text.length) {
				function_group = null;
				continue;
			}

			if (function_group != null) {
				function_group.arguments.push(new ExpressionGroup({
					text: group_text,
					parent: function_group
				}));
				function_group = null;
			} else {
				this.groups.push(new ExpressionGroup({
					text: group_text,
					parent: this
				}));
			}
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

	// Plus/Minus Groups
	for (var x = 0, y = this.groups.length;
		x < y; ++ x) {
		var group = this.groups[x];

		// Skip group objects
		if (typeof group === 'object') {
			continue;
		}

		var index = group.indexOf("\u00B1");
		// If no plus/minus char, skip
		if (index == -1) {
			continue;
		}
		var temp_groups = this.groups.splice(x + 1);
		var plus_minus = new PlusMinusGroup({
			parent: this
		});
		this.groups.push(plus_minus);
		plus_minus.group = new MultiplyGroup({
			text: group.substr(index + 1),
			parent: plus_minus
		});
		if (index == 0) {
			this.groups.splice(x, 1);
		} else {
			this.groups[x] = group.substr(0,
				index - 1);
		}
		this.groups = this.groups.concat(temp_groups);
	}

	// Exponent Groups
	// console.log(this.groups);
	for (var x = 0, y = this.groups.length;
		x < y; ++ x) {
		var group = this.groups[x];

		// Skip group objects
		if (typeof group === 'object') {
			continue;
		}

		// If the caret will be part of an
		// AlgebraGroup it should be ignored
		if (!(new RegExp("(?:^\\^|[^a-zA-Z\u03C0]\\^||\\^$)"
			).test(group))) {
			console.log("Apparently not: " + group);
			continue;
		}

		var caret_pos = group.match(
			new RegExp("(?:^\\^|\\^$|" +
				NEG_FRACTION_REGEX + "\\^)"));
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
					exponent: typeof e === 'string' ? e : e.valueOf(),
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
		// console.log(group);

		// Skip group objects
		if (typeof group === 'object') {
			continue;
		}

		// var slash_pos = group.indexOf("/");
		var slash_pos = -1;
		var start_pos = 0;
		while (slash_pos == -1) {
			slash_pos = group.indexOf("/",
				start_pos);
			if (slash_pos == -1) {
				break;
			}
			if (slash_pos >= 3) {
				if (new RegExp("[a-z\u03C0]\\^" +
					NEG_FRACTION_REGEX +
					"$", "i").test(group.substr(
					0, slash_pos + 2))) {
					start_pos = slash_pos + 1;
					slash_pos = -1;
				}
			}
		}
		if (slash_pos == -1) {
			continue;
		}
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
		var f = new FractionGroup({
			numerator: n,
			denominator: d,
			parent: this
		});
		this.groups[x + replace_pos] = f;
		f.numerator.parent = this;
		f.denominator.parent = this;

		this.groups.splice(x + replace_pos + 1,
			replace_len);
		x += replace_pos;
		y -= replace_len;
	}

	// Constant Groups / Algebra Groups / Fractions
	for (var x = 0, y = this.groups.length;
		x < y; ++ x) {
		var group = this.groups[x];

		// Skip group objects
		if (typeof group === 'object') {
			continue;
		}

		// Correct negatives
		group = group.replace(/^-([a-z\u03C0]|$)/i, "-1$1");

		if (/[ie\u03C0]/.test(group)) { // ConstantGroup
			// Get constants
			var constant_str = group.replace(
				new RegExp("[a-df-hj-z](?:\\^" + NEG_FRACTION_REGEX + ")?",
					"gi"), "");
			// Get algebra
			var algebra_str = group.replace(
				new RegExp("(?:^" + NEG_FRACTION_REGEX + "|[ie\u03C0](?:\\^" +
					NEG_FRACTION_REGEX + ")?)", "g"), "");
			this.groups[x] = new ConstantGroup({
				text: constant_str,
				parent: this
			});
			// Has algebra
			if (algebra_str.length) {
				this.groups = this.groups.slice(0, x + 1).concat(
					[new AlgebraGroup({
						text: algebra_str,
						parent: this
					})].concat(this.groups.slice(x + 1)));
			}
		} else if (/[a-z]/i.test(group)) { // AlgebraGroup
			this.groups[x] = new AlgebraGroup({
				text: group,
				parent: this
			});
		} else { // Fraction
			this.groups[x] = new Fraction({
				text: group,
				parent: this
			});
		}
	}

	// Initial value
	if (this.groups.length == 1) {
		this.value = this.groups[0].valueOf();
		this.value.parent = this.parent;
		if (this.parent == null) {
			this.value.top_parent = this.value;
		}
	}
}

MultiplyGroup.prototype.fixLinks = function() {
	for (var i = this.groups.length; i --; ) {
		// Fix links between this and this.groups[i]
		this.groups[i] = this.groups[i].valueOf();
		this.groups[i].parent = this;
		this.groups[i].top_parent = this.top_parent;
		// Fix the links within this.groups[i]
		this.groups[i].fixLinks();
	}
}

MultiplyGroup.prototype.simplify = function() {
	// Constants / Simplify groups
	var expression_groups = new Array();
	var radicals = new Object();
	var constants = new Array();
	var strings = new Array();
	var denominators = new Object();
	for (var x = 0, y = this.groups.length;
		x < y; ++ x) {
		var group = this.groups[x];
		group.simplify();
		if (group != this.groups[x]) {
			-- x;
			y = this.groups.length;
			continue;
		}
		group.valueOf().parent = group.parent;
		group = this.groups[x] = group.valueOf();

		// Radicals
		var r_index = group.toString().match(new RegExp(
			"\\^\\(?(?=" + FLOAT_NUM_REGEX + "\\/)(" +
			NEG_FRACTION_REGEX + ")\\)?", "g"));
		if (r_index != null) {
			console.log(r_index);
			// TODO: Combine radicals
		}

		if (group instanceof ExpressionGroup) {
			expression_groups.push(group);
		} else if (group instanceof Fraction ||
			group instanceof AlgebraGroup ||
			group instanceof FractionGroup) {
			constants.push(x);
		} else if (group instanceof
			PlusMinusGroup) {
			if (group.group instanceof Fraction ||
			group.group instanceof AlgebraGroup ||
			group.group instanceof FractionGroup) {
				constants.push(x);
			}
		}
	}
	if (constants.length >= 2) {
		var n1 = this.groups[constants[0]];
		n1.highlighted = true;
		var offset = 0;
		while (constants.length > 1) {
			constants[1] -= offset;
			var n2 = this.groups[constants[1]];
			if (n2 instanceof FractionGroup) {
				if (n1.toString() !=
					n2.denominator.toString() &&
					!(n2.denominator instanceof
					Fraction || n2.denominator
					instanceof AlgebraGroup)) {
					constants.splice(1, 1);
					continue;
				}
			}
			// ModuleStep (Multiply)
			if (!(n1.numerator == -1 &&
				n1.denominator == 1 &&
				constants[0] == 0 &&
				constants[1] == 1) && !(
				(n1 instanceof AlgebraGroup &&
				n1.coefficient.toNumber() == 1 &&
				n2 instanceof Fraction) ||
				(n2 instanceof AlgebraGroup &&
				n2.coefficient.toNumber() == 1 &&
				n1 instanceof Fraction))) {
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
			if (n1 instanceof ConstantGroup &&
				n2 instanceof AlgebraGroup) {
				n1.highlighted = false;
				n1 = this.groups[constants[0]] =
					n2.valueOf();
			} else {
				n1 = this.groups[constants[0]] =
					n1.valueOf();
			}
			this.groups.splice(constants[1], 1);
			constants.splice(1, 1);
			++ offset;
		}
		n1.highlighted = false;
		n1.simplify();
		n1 = this.groups[constants[0]] =
			n1.valueOf();
		if (n1 instanceof Fraction) {
			if (n1.toNumber() == 1 &&
				this.groups.length >= 2) {
				this.remove(n1);
			}
		}
	}
	// Distribution
	if (expression_groups.length == 1 &&
		constants.length == 1 &&
		this.groups.length == 2) {
		var n1, n2;
		if (this.groups[0] instanceof ExpressionGroup) {
			n2 = this.groups[0];
			n1 = this.groups[1];
		} else {
			n1 = this.groups[0];
			n2 = this.groups[1];
		}
		n1.highlighted = true;
		n2.highlighted = true;
		// ModuleStep: Distribute
		push_module_step({
			type: "simplify",
			title: describe_operation({
				operation: "*+",
				n1: n1,
				n2: n2,
				abs: false
			}),
			visual: this.equation.element()
		});
		n1.highlighted = false;
		n2.highlighted = false;
		n2.multiply(n1);
		this.remove(n1);
		this.value = n2.valueOf();
		this.value.parent = this.parent;
		if (this == this.top_parent) this.value.top_parent = this.value;
		this.value.simplify();
		this.value = this.value.valueOf();
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
	group.top_parent = this.top_parent;
	group.side = this.side;
	group.equation = this.equation;
}

MultiplyGroup.prototype.duplicate = function() {
	var result = new MultiplyGroup();
	for (var x = 0, y = this.groups.length; x < y; ++ x) {
		result.push(this.groups[x].duplicate());
	}
	return result;
}

MultiplyGroup.prototype.multiply = function(n) {
	if (typeof n !== 'object') {
		n = new Fraction({
			text: n
		});
	}
	this.push(n);
}

MultiplyGroup.prototype.factorOut = function(factor, showSteps) {
	var showSteps = showSteps || false;
	if (showSteps) {
		this.highlighted = true;
		push_module_step({
			type: "simplify",
			title: describe_operation({
				operation: "/f",
				n1: factor,
				n2: this
			}),
			visual: this.equation.element()
		});
		this.highlighted = false;
	}
	// Actually factor
	var radical = factor.match(new RegExp("^" + RADICAL_FACTOR_REGEX));
	var constant = null;
	if (!radical) {
		constant = factor.match(new RegExp("^" + NEG_FRACTION_REGEX));
	}
	if (constant != null) constant = constant[0];
	for (var i = this.groups.length; i --; ) {
		var group = this.groups[i];
		if (group instanceof AlgebraGroup ||
			group instanceof ConstantGroup) {
			if (group.factors().indexOf(factor) != -1) {
				group.factorOut(factor);
				if (group.valueOf() instanceof Fraction) {
					if (group.valueOf().toString() == "1" &&
						this.groups.length > 1) {
						this.remove(group);
					}
				}
				break;
			}
		} else if (radical != null && group instanceof ExponentGroup &&
			group.value != null) {
			if (group.factors().indexOf(factor) != -1) {
				group.factorOut(factor);
				if (group.valueOf() instanceof Fraction) {
					if (group.valueOf().toString() == "1" &&
						this.groups.length > 1) {
						this.remove(group);
					}
				}
				radical = null;
				factor = factor.replace(new RegExp("^" + RADICAL_FACTOR_REGEX),
					"");
			}
		} else if (constant != null) {
			if (group.factors().indexOf(constant) != -1) {
				group.factorOut(constant);
				if (group.valueOf() instanceof Fraction) {
					if (group.valueOf().toString() == "1" &&
						this.groups.length > 1) {
						this.remove(group);
					}
				}
				factor = factor.substr(constant.length);
				constant = "";
			}
		} else if (/\w[a-z0-9_\-]*\(.*\)/.test(factor)) {
			if (group.factors().indexOf(factor) != -1) {
				group.factorOut(factor);
				if (group.valueOf() instanceof Fraction) {
					if (group.valueOf().toString() == "1" &&
						this.groups.length > 1) {
						this.remove(group);
					}
				}
			}
		}
	}
}

MultiplyGroup.prototype.replace = function(g1, g2) {
	// g1 = The old group
	// g2 = The new group

	var index = this.groups.indexOf(g1);
	if (index == -1) {
		for (var i = this.groups.length; i --; ) {
			if (this.groups[i].valueOf() != g1) continue;
			index = i;
			break;
		}
	}
	this.groups[index] = g2;
	g2.parent = this;
	g2.top_parent = this.top_parent;
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
	g2.top_parent = g1.top_parent;
	g2.side = this.side;
	g2.equation = this.equation;
}

MultiplyGroup.prototype.remove = function(group) {
	this.groups.splice(this.groups.indexOf(group), 1);
}

MultiplyGroup.prototype.toString = function() {
	var g_array = new Array();
	for (var x = 0, y = this.groups.length; x < y;
		++ x) {
		g_array.push(this.groups[x].toString());
	}
	return g_array.join("*");
}

MultiplyGroup.prototype.factors = function() {
	var factors = new Array();
	for (var i = this.groups.length; i --; ) {
		factors = factors.concat(this.groups[i].factors());
	}
	return factors;
}

MultiplyGroup.prototype.replaceFactor = function(json) {
	var json = replace_factor_json(arguments);
	// TODO: Make it possible to replace expressions?
	// 	(e.g. "2√2")
	// Replace factors in children
	for (var x = 0, y = this.groups.length; x < y; ++ x) {
		this.groups[x].valueOf().replaceFactor(json);
		this.groups[x] = this.groups[x].valueOf();
	}
	// Set the value if this has been simplified to one group already
	if (this.groups.length == 1) {
		this.value = this.groups[0].valueOf();
		this.value.parent = this.parent;
	}
}

MultiplyGroup.prototype.multiplyGroup = function(n) {
	if (n) this.push(n);
	return this;
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
		group_elem = group.valueOf().element();

		// Operation Elements
		if (x && prev_elem.innerHTML != "" &&
			!((prev_elem.hasClass("parentheses") &&
				!group_elem.hasClass("negative")) ||
			group_elem.hasClass("parentheses") ||
			group_elem.hasClass("radical-wrapper") ||
			group_elem.hasClass("function"))) {
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
				if (prev_group.denominator == 1 &&
					group.denominator == 1) {
					times.addClass("highlighted");
				}
			}
			if (group_elem.hasClass("fraction") &&
				group_elem.hasClass("negative")) {
				group_elem.removeClass("negative");
				group_elem.children[0].addClass(
					"negative");
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
	this.numerator = json.numerator || "1";
	this.denominator = json.denominator || "1";
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
		if (/[a-z\u03C0]/i.test(this.numerator)) {
			// AlgebraGroup
			this.numerator = new AlgebraGroup({
				text: this.numerator,
				parent: this
			});
		} else {
			// Fraction
			this.numerator = new Fraction({
				text: this.numerator,
				parent: this
			});
		}
	}

	// Denominator
	if (typeof this.denominator === 'string') {
		if (/[a-z\u03C0]/i.test(this.denominator)) {
			// AlgebraGroup
			this.denominator = new AlgebraGroup({
				text: this.denominator,
				parent: this
			});
		} else {
			// Fraction
			this.denominator = new Fraction({
				text: this.denominator,
				parent: this
			});
		}
	}
}

FractionGroup.prototype.duplicate = function() {
	var num = this.numerator.duplicate();
	var den = this.denominator.duplicate();
	var copy = new FractionGroup({
		numerator: num,
		denominator: den
	});
	num.parent = copy;
	den.parent = copy;
	copy.fixLinks();
	return copy;
}

FractionGroup.prototype.reciprocal = function() {
	var num = this.numerator.duplicate();
	var den = this.denominator.duplicate();
	var rec = new FractionGroup({
		numerator: den,
		denominator: num
	});
	num.parent = rec;
	den.parent = rec;
	rec.fixLinks();
	return rec;
}

FractionGroup.prototype.replace = function(g1, g2) {
	// g1 = The old group
	// g2 = The new group

	if (this.numerator == g1 ||
		this.numerator.valueOf() == g1) {
		this.numerator = g2;
		g2.parent = this;
		g2.top_parent = this.top_parent;
		g2.equation = this.equation;
	} else if (this.denominator == g1 ||
		this.denominator.valueOf() == g1) {
		this.denominator = g2;
		g2.parent = this;
		g2.top_parent = this.top_parent;
		g2.equation = this.equation;
	}
}

FractionGroup.prototype.multiply = function(n) {
	// Plus/Minus?
	if (n instanceof PlusMinusGroup) {
		this.multiply(n.group);
		n.group.value = this.valueOf();
		this.value = n;
		this.highlighted = false;
		return;
	}
	// Cancels out?
	if (n.toString() ==
		this.denominator.toString()) {
		this.value = this.numerator;
		this.denominator = new Fraction({
			text: "1",
			parent: this
		});
		return;
	}
	// Else
	if (n instanceof AlgebraGroup) {
		this.numerator.multiply(n);
		this.numerator = this.numerator.valueOf();
	} else {
		// Make sure n is a fraction
		if (typeof n !== 'object') var n = new Fraction(n);
		this.numerator.multiply(n.numerator);
		this.numerator = this.numerator.valueOf();
		this.denominator.multiply(n.denominator);
		this.denominator = this.denominator.valueOf();
	}
}

FractionGroup.prototype.factorOut = function(factor, showSteps, both) {
	var showSteps = showSteps || false;
	var both = both || false;
	if (showSteps) {
		this.highlighted = true;
		push_module_step({
			type: "simplify",
			title: describe_operation({
				operation: "/f",
				n1: factor,
				n2: this
			}),
			visual: this.equation.element()
		});
		this.highlighted = false;
	}
	// Actually factor
	this.numerator.valueOf().factorOut(factor);
	if (!both) return;
	this.denominator.valueOf().factorOut(factor);
	if (this.denominator.valueOf().toString() == "1") {
		this.value = this.numerator.valueOf();
		this.value.parent = this.parent;
		if (!this.parent) {
			this.equation[this.side] = this.value;
			this.value.top_parent = this.value;
		}
	}
}

FractionGroup.prototype.toString = function() {
	return "(" + this.numerator.toString() + ")/(" +
		this.denominator.toString() + ")";
}

FractionGroup.prototype.factors = function() {
	var factors = new Array();
	factors = this.numerator.valueOf().factors();
	var d_factors = this.denominator.valueOf().factors();
	for (var i = d_factors.length; i --; ) {
		var f = d_factors[i];
		if (new RegExp("^-?" + FLOAT_NUM_REGEX + "\\/").test(f)) {
			f = f.replace(new RegExp("^(" + NEG_FRACTION_REGEX + ")\\/(" +
				NEG_FRACTION_REGEX + ")"), "$2/$1");
		} else {
			f = "1/" + f;
		}
		factors.push(f);
	}
	return factors;
}

FractionGroup.prototype.localFactors = function() {
	var factors = new Array();
	factors.push(this.numerator.valueOf().factors());
	factors.push(this.denominator.valueOf().factors());
	function in_others(factor) {
		for (var i = factors.length - 1; i --; ) {
			if (factors[i + 1].indexOf(factor) == -1) return false;
		}
		return true;
	}
	var result = new Array();
	for (var i = factors[0].length; i --; ) {
		if (!in_others(factors[0][i])) continue;
		result.push(factors[0][i]);
	}
	return result;
}

FractionGroup.prototype.replaceFactor = function(json) {
	var json = replace_factor_json(arguments);
	// TODO: Make it possible to replace expressions?
	// 	(e.g. "x/2")
	// Replace factors in children
	this.numerator.valueOf().replaceFactor(json);
	this.denominator.valueOf().replaceFactor(json);
}

FractionGroup.prototype.fixLinks = function() {
	// Fix links between this and this.numerator
	this.numerator = this.numerator.valueOf();
	this.numerator.parent = this;
	this.numerator.top_parent = this.top_parent;
	// Fix the links within this.numerator
	// console.log("Numerator");
	// console.log(this.numerator);
	// console.log(typeof this.numerator);
	this.numerator.fixLinks();
	// Fix links between this and this.denominator
	this.denominator = this.denominator.valueOf();
	this.denominator.parent = this;
	this.denominator.top_parent = this.top_parent;
	// Fix the links within this.denominator
	// console.log("Denominator");
	// console.log(typeof this.denominator);
	// console.log(this.denominator);
	// console.log(typeof this.denominator);
	this.denominator.fixLinks();
}

FractionGroup.prototype.simplify = function(hideSteps) {
	var hideSteps = hideSteps || false;
	this.numerator.simplify();
	this.numerator.valueOf().parent =
		this.numerator.parent;
	this.numerator =
		this.numerator.valueOf();
	var n_val = this.numerator;
	if (this.denominator.toString() == "1") {
		return;
	}
	this.denominator.simplify();
	this.denominator.valueOf().parent =
		this.denominator.parent;
	this.denominator =
		this.denominator.valueOf();
	var d_val = this.denominator;

	// Join fractions in numerator/denominator
	if (d_val instanceof Fraction &&
		!(d_val instanceof ConstantGroup) &&
		(n_val instanceof Fraction ||
		n_val instanceof MultiplyGroup ||
		n_val instanceof AlgebraGroup ||
		n_val instanceof FractionGroup)) {
		if (Math.abs(d_val.denominator) != 1) {
			this.highlighted = true;
			// ModuleStep: Reciprocal Multiplication
			push_module_step({
				type: "simplify",
				title: describe_operation({
					operation: "*r",
					n1: n_val,
					n2: d_val
				}),
				visual: this.equation.element()
			});
			this.highlighted = false;
			n_val.multiply(
				d_val.denominator);
			this.numerator = n_val =
				n_val.valueOf();
			d_val.denominator = 1;
		}
	}
	if (n_val instanceof Fraction &&
		!(n_val instanceof ConstantGroup) &&
		(d_val instanceof Fraction ||
		d_val instanceof MultiplyGroup ||
		d_val instanceof AlgebraGroup ||
		d_val instanceof FractionGroup)) {
		if (Math.abs(n_val.denominator) != 1) {
			if (d_val.toString() != "1") {
				this.highlighted = true;
				// ModuleStep: Reciprocal Multiplication
				push_module_step({
					type: "simplify",
					title: describe_operation({
						operation: "*r",
						n1: n_val,
						n2: d_val
					}),
					visual: this.equation.element()
				});
				this.highlighted = false;
			}
			d_val.multiply(
				n_val.denominator);
			this.denominator = d_val =
				d_val.valueOf();
			n_val.denominator = 1;
		}
	}

	// Combine exponents
	if (n_val instanceof AlgebraGroup &&
		d_val instanceof AlgebraGroup) {
		for (var name in n_val.variable) {
			if (!d_val.hasVar(name)) {
				continue;
			}
			var n_exponent = n_val.getVar(name);
			var n_exp_number = n_exponent.toNumber();
			var d_exponent = d_val.getVar(name);
			var d_exp_number = d_exponent.toNumber();
			var title_visual = new AlgebraGroup({
				text: name + "^" + (n_exp_number <
					d_exp_number ? n_exponent :
					d_exponent)
			});
			n_val.highlighted_temp.push(name);
			d_val.highlighted_temp.push(name);
			var elem = this.equation.element();
			n_val.highlighted_temp.splice(0);
			d_val.highlighted_temp.splice(0);
			if (!hideSteps) {
				// ModuleStep: Exponent combination
				push_module_step({
					type: "simplify",
					title: describe_operation({
						operation: "/",
						n1: this,
						n2: new FractionGroup({
							numerator: title_visual,
							denominator: title_visual
						})
					}),
					visual: elem
				});
			}

			if (n_exp_number == d_exp_number) {
				n_val.removeVar(name);
				d_val.removeVar(name);
			} else if (n_exp_number > d_exp_number) {
				n_val.incrementVar(name, d_exponent.negative());
				d_val.removeVar(name);
			} else {
				d_val.incrementVar(name, n_exponent.negative());
				n_val.removeVar(name);
			}
		}
		n_val.simplify();
		n_val = this.numerator =
			this.numerator.valueOf();
		d_val.simplify();
		d_val = this.denominator =
			this.denominator.valueOf();
	}

	if (n_val instanceof Fraction &&
		!(n_val instanceof ConstantGroup) &&
		d_val instanceof Fraction &&
		!(d_val instanceof ConstantGroup)) {
		this.value = new Fraction({
			numerator: n_val.numerator *
				d_val.denominator,
			denominator: n_val.denominator *
				d_val.numerator,
			parent: this.parent,
			equation: this.equation,
			side: this.side
		});
		this.value.simplify(this);
		this.value.parent = this.parent;
		if (this.parent == null) {
			this.value.top_parent = this.value;
		}
	}
	if (this.value != null) return true; // Already simplified
	// Complex factor simplification
	this.numerator = this.numerator.valueOf();
	this.denominator = this.denominator.valueOf();
	var factors = this.localFactors();
	factors = sort_factors(sanitize_factors(factors));
	// console.log(factors);
	// Get rid of all useless numbers
	var removed_n = false;
	var removed_d = false;
	var removed_vars = [];
	// console.log(factors);
	for (var x = 0, y = factors.length; x < y; ++ x) {
		var f = factors[x];
		if (/[a-zA-Z\u03C0]/.test(f)) { // Variable
			var v = f.replace(/[^a-zA-Z\u03C0]/g, "");
			console.log(v);
			if (removed_vars.indexOf(v) !== -1) continue;
			removed_vars.push(v);
			this.factorOut(f, true, true);
		} else if (new RegExp("^" + RADICAL_FACTOR_REGEX
			).test(f)) { // Radical
			this.factorOut(f, true, true);
		} else if (f.indexOf("1/") === 0) { // Reciprocal
			if (x != y - 1) continue;
			this.factorOut(f, true, true);
		} else if (f == "-1") {
			this.factorOut(f, true, true);
		} else if (f != "1") {
			if (removed_n) continue;
			removed_n = true;
			this.factorOut(f, true, true);
		}
	}
	n_val = this.numerator = this.numerator.valueOf();
	d_val = this.denominator = this.denominator.valueOf();
	// Multiply by the reciprocal when appropriate
	if ((n_val instanceof FractionGroup ||
		n_val instanceof Fraction) &&
		!(n_val instanceof ConstantGroup) &&
		(d_val instanceof FractionGroup ||
		d_val instanceof Fraction) &&
		!(d_val instanceof ConstantGroup) &&
		(n_val.toString().indexOf("/") != -1 ||
		d_val.toString().indexOf("/") != -1)) {
		var m_group = n_val.multiplyGroup();
		if (m_group.toString() == "1") {
			m_group.remove(0);
		}
		var d_reciprocal = d_val.reciprocal();
		if (d_reciprocal.toString() != "1") {
			m_group.push(d_reciprocal);
		}
		this.value = m_group;
		if (this.parent) {
			this.parent.valueOf().replace(this, m_group);
		} else {
			m_group.top_parent = m_group;
			this.equation[this.side] = m_group;
		}
		m_group.simplify();
		return;
	}
	// Move things from the top to the bottom
	// when appropriate
	var n_factors = this.numerator.valueOf().factors();
	n_factors = sort_factors(n_factors);
	// console.log(n_factors);
	var n_factor = n_factors[n_factors.length - 1];
	if (new RegExp("^" + FLOAT_NUM_REGEX + "\\/" +
		FLOAT_NUM_REGEX + "(?!\\^)").test(n_factor) &&
		n_factor.substr(-2) != "/1") {
		var divisor = n_factor.substr(n_factor.indexOf("/") + 1);
		if (!hideSteps) {
			this.highlighted = true;
			push_module_step({
				type: "simplify",
				title: describe_operation({
					operation: "/n",
					n1: new Fraction(divisor),
					n2: this.valueOf()
				}),
				visual: this.valueOf().element()
			});
			this.highlighted = false;
		}
		this.numerator.factorOut("1/" + divisor);
		this.denominator.multiply(new Fraction(divisor));
	}
	// Move things from the bottom to the top
	// when appropriate
	var d_factors = this.denominator.valueOf().factors();
	d_factors = sort_factors(d_factors);
	var d_factor = d_factors[d_factors.length - 1];
	if (new RegExp("^" + FLOAT_NUM_REGEX + "\\/" +
		FLOAT_NUM_REGEX + "(?!\\^)").test(n_factor) &&
		n_factor.substr(-2) != "/1") {
		var divisor = d_factor.substr(d_factor.indexOf("/") + 1);
		if (!hideSteps) {
			this.highlighted = true;
			push_module_step({
				type: "simplify",
				title: describe_operation({
					operation: "/d",
					n1: new Fraction(divisor),
					n2: this.valueOf()
				}),
				visual: this.valueOf().element()
			});
			this.highlighted = false;
		}
		this.denominator.factorOut("1/" + divisor);
		this.numerator.multiply(new Fraction(divisor));
	}
	// Negative?
	if (d_factors.indexOf("-1") !== -1) {
		this.denominator.valueOf().factorOut("-1");
		this.multiply(new Fraction(-1));
	}
	// Re-simplify children, just in case
	this.numerator.valueOf().simplify();
	this.denominator.valueOf().simplify();
}
FractionGroup.prototype.multiplyGroup = function(n) {
	var m_group;
	if (this.parent != null && this.parent.valueOf() instanceof MultiplyGroup) {
		m_group = this.parent.valueOf();
	} else {
		var par = this.parent;
		if (par != null) par = par.valueOf();
		m_group = new MultiplyGroup({
			parent: par,
			side: this.side,
			equation: this.equation
		});
		m_group.push(this);
		if (par == null) {
			this.top_parent = m_group.top_parent = m_group;
			if (this.equation != null) this.equation[this.side] = m_group;
		} else {
			par.valueOf().replace(this, m_group);
		}
	}
	if (n) m_group.push(n);
	return m_group;
}
FractionGroup.prototype.valueOf = function() {
	if (this.value != null) {
		return this.value;
	} else {
		return this;
	}
}
FractionGroup.prototype.element = function() {
	var elem = fraction_element(
		this.numerator.valueOf(),
		this.denominator.valueOf(),
		true, this.highlighted);
	if (this.parent == null && this.side != null) {
		elem.addClass(this.side + "-side");
	}
	return elem;
}

ExponentGroup = function(json) {
	var json = json || {};
	this.top_parent = this;
	this.parent = json.parent || null;
	if (this.parent != null) {
		this.top_parent = this.parent.top_parent;
	}
	if (json.text) {
		var caret_pos = json.text.indexOf("^");
		if (caret_pos != -1) {
			json.base =
				new Fraction({
					text:
						json.text.substr(0, caret_pos),
					parent: this
				});
			json.exponent =
				new Fraction({
					text:
						json.text.substr(caret_pos + 1),
					parent: this
				});
		} else {
			json.base = new Fraction({
				text: json.text,
				parent: this
			});
		}
	}
	// console.log(json.base);
	// console.log(json.exponent);
	this.base = json.base || "1";
	this.exponent = json.exponent || "1";
	this.highlighted = json.highlighted || false;
	this.equation = json.equation ||
		this.top_parent.equation || null;
	this.side = json.side ||
		this.top_parent.side || null;
	this.value = null;

	// Verify that base and exponent
	// are groups, not strings

	// Base
	if (typeof this.base === 'string') {
		 if (/[a-z\u03C0]/i.test(this.base)) {
			// AlgebraGroup
			this.base = new AlgebraGroup({
				text: this.base,
				parent: this
			});
		} else if (this.base.indexOf("^") != -1) {
			// ExponentGroup
			this.base = new ExponentGroup({
				text: this.base,
				parent: this
			});
		} else {
			// Fraction
			this.base = new Fraction({
				text: this.base,
				parent: this
			});
		}
	}
	// Exponent
	if (typeof this.exponent === 'string') {
		if (/[a-z\u03C0]/i.test(this.exponent)) {
			// AlgebraGroup
			this.exponent = new AlgebraGroup({
				text: this.exponent,
				parent: this
			});
		} else if (this.exponent.indexOf("^") != -1) {
			// ExponentGroup
			this.exponent = new ExponentGroup({
				text: this.exponent,
				parent: this
			});
		} else {
			// Fraction
			this.exponent = new Fraction({
				text: this.exponent,
				parent: this
			});
		}
	}
}

ExponentGroup.prototype.duplicate = function() {
	var base = this.base.duplicate();
	var exp = this.exponent.duplicate();
	var copy = new ExponentGroup({
		base: base,
		exponent: exp
	});
	base.parent = copy;
	exp.parent = copy;
	return copy;
}

ExponentGroup.prototype.replace = function(g1, g2) {
	// g1 = The old group
	// g2 = The new group

	if (this.base == g1 || this.base.valueOf() == g1) {
		this.base = g2;
		g2.parent = this;
	} else if (this.exponent == g1 || this.exponent.valueOf() == g1) {
		this.exponent = g2;
		g2.parent = this;
	}
}

ExponentGroup.prototype.factorOut = function(factor, showSteps) {
	var showSteps = showSteps || false;
	if (showSteps) {
		this.highlighted = true;
		push_module_step({
			type: "simplify",
			title: describe_operation({
				operation: "/f",
				n1: factor,
				n2: this
			}),
			visual: this.equation.element()
		});
		this.highlighted = false;
	}
	// Actually factor
	console.log(factor);
	if (new RegExp("^" + RADICAL_FACTOR_REGEX + "$").test(factor)) {
		// Make sure this actually has the factor
		if (this.factors().indexOf(factor) == -1) return;
		this.value = new Fraction(1);
		return;
	} else if (this.factors().indexOf(factor) != -1) {
		console.log(this.factors().indexOf(factor));
		var delta = new Fraction(factor);
		delta.multiply(-1);
		this.exponent.numerator.add(delta);
	}
}

ExponentGroup.prototype.toString = function() {
	return "(" + this.base.valueOf().toString() + ")^(" +
		this.exponent.valueOf().toString() + ")";
}

ExponentGroup.prototype.factors = function() {
	var b_val = this.base.valueOf();
	var e_val = this.exponent.valueOf();
	if (b_val instanceof Fraction && e_val instanceof Fraction) {
		if (e_val.toNumber() % 1 == 0) {
			return [b_val.toString()];
		} else if (this.value != null) {
			if (this.value == this) {
				return [this.value.toString()];
			} else {
				return this.value.factors();
			}
		}
	}
	return [];
}

ExponentGroup.prototype.replaceFactor = function(n) {
	var json = replace_factor_json(arguments);
	// TODO: Make it possible to replace expressions?
	// 	(e.g. "y^x")
	// Replace factors in children
	this.base.valueOf().replaceFactor(json);
	this.exponent.valueOf().replaceFactor(json);
}

ExponentGroup.prototype.fixLinks = function() {
	// Fix links between this and this.base
	this.base = this.base.valueOf();
	this.base.parent = this;
	this.base.top_parent = this.top_parent;
	// Fix the links within this.base
	this.base.fixLinks();
	// Fix links between this and this.exponent
	this.exponent = this.exponent.valueOf();
	this.exponent.parent = this;
	this.exponent.top_parent = this.top_parent;
	// Fix the links within this.exponent
	this.exponent.fixLinks();
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
		!(b_val instanceof ConstantGroup) &&
		e_val instanceof Fraction &&
		!(e_val instanceof ConstantGroup)) {
		// Radical? (e.g. e = 1/2)
		var radical = false;
		var r_index = 0;
		
		var e_fraction = get_fraction(e_val);
		if (e_fraction.numerator == 1 &&
			e_fraction.denominator != 1) {
			if (Config.preferences.radical) {
				radical = true;
				r_index = e_fraction.denominator;	
			}
			// The radical preference affected the output
			config_used.preferences.radical = true;
		}

		this.highlighted = true;
		if (radical) { // Radical
			var b = b_val.toNumber();
			var imaginary = "";
			if (b < 0) {
				b = -b;
				b_val.multiply(new Fraction(-1));
				imaginary = "i";
			}
			var factor = 1;
			var factor_root;
			for (var i = b; i >= 2; -- i) {
				// Can divide base by i?
				if (b % i) continue;
				var root = Math.pow(i, 1 / r_index);
				var remainder = root % 1;
				// Able to factor out?
				if (Math.min(remainder, 1 - remainder) > 2e-8) continue;
				factor = i;
				factor_root = Math.round(root);
				break;
			}
			var b_root_n, b_root_d, b_root_n_r, b_root_d_r;
			if (factor == 1 && b_val.denominator != 1) {
				b_root_n = Math.pow(b_val.numerator, 1 / r_index);
				b_root_d = Math.pow(b_val.denominator, 1 / r_index);
				b_root_n_r = b_root_n % 1;
				b_root_d_r = b_root_d % 1;
			}
			// console.log("Simplify radical: " + factor + ", " + factor_root);
			if (factor != 1) { // Can be simplified
				if (factor == b) {
					// ModuleStep (Radical)
					push_module_step({
						type: "simplify",
						title: describe_operation({
							operation: "^",
							n1: this.base,
							n2: this.exponent
						}),
						visual: this.equation.element()
					});
					this.value = new ConstantGroup({
						text: factor_root + imaginary,
						parent: this.parent
					});
					this.value.parent = this.parent;
					if (this.parent == null) {
						this.value.top_parent = this.value;
					}
				} else {
					// ModuleStep (Radical)
					push_module_step({
						type: "simplify",
						title: describe_operation({
							operation: "^/",
							n1: new ExpressionGroup({
								text: (imaginary ? "-" : "") +
									factor_root + "^" + r_index
							}),
							n2: this.base
						}),
						visual: this.equation.element()
					});
					var m_group = this.parent;
					if (m_group) m_group = m_group.valueOf();
					if (!(m_group instanceof MultiplyGroup)) {
						// console.log(factor_root + "*(" + (b_val / factor) +
						// 		")^(1/" + r_index + ")");
						this.value = new MultiplyGroup({
							equation: this.equation,
							side: this.side,
							parent: m_group,
							text: factor_root + imaginary + "*(" +
								(b_val / factor) + ")^(1/" + r_index + ")"
						});
						this.value.simplify();
						this.value = this.value.valueOf();
						// console.log(this.value.toString());
						if (m_group) {
							m_group.replace(this, this.value);
						} else {
							// console.log("Yo");
							this.value.top_parent = this.value;
							this.equation[this.side] = this.value;
							// console.log(this.value);
						}
						m_group = this.value;
					} else {
						console.log("A m_group already?");
						this.base.numerator /= factor;
						this.value = this;
						m_group.insertBefore(this, new Fraction(factor_root));
						console.log(m_group.groups);
					}
				}
			} else if (b_val.denominator != 1 &&
				Math.min(b_root_n_r, 1 - b_root_n_r) < 2e-8 &&
				Math.min(b_root_d_r, 1 - b_root_d_r) < 2e-8) {
				// Simplify fraction base
				b_val.numerator = Math.round(b_root_n);
				b_val.denominator = Math.round(b_root_d);
				this.value = b_val;
			} else { // Still update the value
				if (imaginary) {
					var m_group = this.multiplyGroup();
					m_group.insertBefore(this, new ConstantGroup({
						text: "i"
					}));
				} else {
					this.value = this;
				}
			}
		} else { // Exponent
			// ModuleStep (Exponent)
			push_module_step({
				type: "simplify",
				title: describe_operation({
					operation: "^",
					n1: this.base,
					n2: this.exponent
				}),
				visual: this.equation.element()
			});
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
		this.highlighted = false;
	} else if (e_val instanceof Fraction &&
		!(e_val instanceof ConstantGroup) &&
		(b_val instanceof AlgebraGroup ||
		b_val instanceof ConstantGroup)) {
		var f_name, o_name;
		if (b_val instanceof AlgebraGroup) {
			f_name = "Var";
			o_name = "variable";
		} else {
			f_name = "Const";
			o_name = "constant";
		}
		// Multiply exponents
		var module_step_info;
		if (/(?:[2-9]|\d{2})/.test(b_val.toString())) {
			this.highlighted = true;
			module_step_info = {
				type: "simplify",
				title: describe_operation({
					operation: "^",
					n1: b_val,
					n2: e_val
				}),
				visual: this.equation.element()
			};
			this.highlighted = false;
		}
		// Coefficients
		var imaginary = false;
		if (e_val.denominator != 1 &&
			b_val.coefficient.toNumber() < 0) { // Imaginary?
			imaginary = true;
			b_val.multiply(new Fraction(-1));
		}
		var e_num = e_val.toNumber();
		var new_num = Math.pow(
			b_val.coefficient.numerator, e_num);
		var new_dom = Math.pow(
			b_val.coefficient.denominator, e_num);
		if (Math.min(new_num % 1, 1 - new_num % 1) < 2e-8 &&
			Math.min(new_dom % 1, 1 - new_dom % 1) < 2e-8) {
			b_val.coefficient.numerator = new_num;
			b_val.coefficient.denominator = new_dom;
		} else {
			var worthwhile = false;
			for (var name in b_val[o_name]) {
				var exp = b_val[o_name][name];
				var new_exp = exp.duplicate();
				new_exp.multiply(e_val.duplicate());
				if (Math.min(new_exp.toNumber() % 1,
					1 - new_exp.toNumber() % 1) < 2e-8) {
					worthwhile = true;
					break;
				}
			}
			if (!worthwhile) {
				// This is not worth attempting to simplify
				if (imaginary) b_val.multiply(new Fraction(-1));
				return;
			}
			var m_group = this.multiplyGroup();
			m_group.insertBefore(this, new ExponentGroup({
				base: b_val.coefficient.toString(),
				exponent: e_val.toString()
			}));
			b_val.coefficient.numerator = 1;
			b_val.coefficient.denominator = 1;
		}
		if (module_step_info) push_module_step(module_step_info);
		// Variables / Constants
		for (var name in b_val[o_name]) {
			var exp = b_val[o_name][name];
			exp.multiply(e_val.duplicate());
		}
		this.value = b_val;
		if (this.parent == null) {
			b_val.parent = null;
			b_val.top_parent = b_val;
			this.equation[this.side] = b_val;
			b_val.fixLinks();
		} else {
			b_val.parent = this.parent.valueOf();
			this.parent.replace(this, b_val);
		}
		// Imaginary?
		if (imaginary) {
			b_val.multiply(new ConstantGroup({
				text: "i"
			}));
		}
	}
}
ExponentGroup.prototype.multiplyGroup = function(n) {
	var m_group;
	if (this.parent != null && this.parent.valueOf() instanceof MultiplyGroup) {
		m_group = this.parent.valueOf();
	} else {
		var par = this.parent;
		if (par != null) par = par.valueOf();
		m_group = new MultiplyGroup({
			parent: par,
			side: this.side,
			equation: this.equation
		});
		m_group.push(this);
		if (par == null) {
			this.top_parent = m_group.top_parent = m_group;
			if (this.equation != null) this.equation[this.side] = m_group;
		} else {
			par.valueOf().replace(this, m_group);
		}
	}
	if (n) m_group.push(n);
	return m_group;
}
ExponentGroup.prototype.valueOf = function() {
	if (this.value != null) {
		return this.value;
	} else {
		return this;
	}
}
ExponentGroup.prototype.element = function() {
	var elem = exponent_element(
		this.base.valueOf(),
		this.exponent.valueOf(),
		false, this.highlighted);
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
	} else {
		this.temp_variables = null;
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
	if (!(degree instanceof Fraction)) {
		degree = new Fraction({
			text: degree
		});
	}
	if (degree.toNumber() != 0) {
		this.variable[name] = degree;
	} else {
		delete this.variable[name];
	}
	return degree;
}
AlgebraGroup.prototype.incrementVar = function(name, degree) {
	if (!(degree instanceof Fraction)) {
		degree = new Fraction({
			text: degree
		});
	}
	if (!this.hasVar(name)) {
		return this.setVar(name, degree);
	} else {
		this.variable[name].add(degree);
		return (this.variable[name]);
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
	var coefficient = new RegExp("^-?(?:" +
		FRACTION_REGEX + ")?").exec(text);
	if (coefficient != null) {
		if (coefficient[0] == "-") coefficient[0] += "1"
		this.coefficient = new Fraction({
			text: coefficient[0],
			parent: this,
			equation: this.equation,
			side: this.side
		});
	}
	variables = text.match(new RegExp(
		"[a-z\u03C0](?:\\^" + NEG_FRACTION_REGEX + ")?",
		"gi"));
	if (variables == null) {
		// console.error("No variables!");
		return;
	}
	variables.reverse();
	var constant_str = "";
	var i = variables.length;
	while (i --) {
		// Constants ?
		if (/^[ei\u03C0]/.test(variables[i])) {
			constant_str = variables[i] + constant_str;
			continue;
		}
		if (variables[i].length == 1) {
			variables[i] += "^1";
		}
		var var_letter = variables[i][0];
		var var_exp = variables[i].substr(2);
		if (this.temp_variables) this.temp_variables.push(var_letter + var_exp);
		this.incrementVar(var_letter, var_exp);
	}
	// Constants?
	if (constant_str.length) {
		var coefficient = new ConstantGroup({
			text: constant_str,
			parent: this,
			equation: this.equation,
			side: this.side
		});
		coefficient.coefficient = this.coefficient;
		this.coefficient.parent = coefficient;
		this.coefficient = coefficient;
	}
	// No variables ?
	if (!this.temp_variables.length) {
		// console.log("No variables!");
		this.value = this.coefficient;
		if (this.parent != null) {
			this.parent.replace(this, this.value);
		} else {
			this.equation[this.side] = this.value;
			this.value.top_parent = this.value;
			this.value.parent = null;
			this.value.fixLinks();
		}
	}
	this.text = text;
}
AlgebraGroup.prototype.highlight = function(part) {
	// Un-highlight everything
	if (part === false) {
		this.highlighted = false;
		this.coefficient.highlighted = false;
		this.highlighted_temp.splice(0);
		return null;
	}
	// Highlight everything
	if (part === true || part == null) {
		this.highlighted = true;
		return this;
	}
	// Highlight coefficient
	if (new RegExp("^" + NEG_FRACTION_REGEX).test(part)) {
		this.coefficient.highlighted = true;
		return this.coefficient;
	}
	// Highlight a var
	var vars = part.replace(new RegExp("\\^" +
		NEG_FRACTION_REGEX, "g"), "").split("");
	this.highlighted_temp =
		this.highlighted_temp.concat(vars);
	console.log(this.highlighted_temp);
}
AlgebraGroup.prototype.multiply = function(n) {
	// Plus/Minus?
	if (n instanceof PlusMinusGroup) {
		this.multiply(n.group);
		n.group.value = this.valueOf();
		this.value = n;
		this.highlighted = false;
		return;
	}
	// FractionGroup
	if (n instanceof FractionGroup) {
		n.multiply(this);
		this.value = n.valueOf();
		return;
	}
	// ExpressionGroup
	if (n instanceof ExpressionGroup) {
		n.multiply(this);
		this.value = n.valueOf();
		return;
	}
	// Multiply coefficients
	if ((n instanceof Fraction &&
		!(n instanceof ConstantGroup)) ||
		typeof n === 'number') {
		this.coefficient.multiply(n);
		return;
	}
	// ConstantGroup
	if (n instanceof ConstantGroup) {
		this.coefficient.multiply(n);
		this.coefficient = this.coefficient.valueOf();
		this.fixLinks();
		return;
	}
	// Multiply everything
	this.coefficient.multiply(n.coefficient);
	for (var name in n.variable) {
		this.incrementVar(name, n.variable[name]);
	}
}
AlgebraGroup.prototype.factorOut = function(factor, showSteps) {
	var showSteps = showSteps || false;
	if (showSteps) {
		this.highlighted = true;
		push_module_step({
			type: "simplify",
			title: describe_operation({
				operation: "/f",
				n1: factor,
				n2: this
			}),
			visual: this.equation.element()
		});
		this.highlighted = false;
	}
	// Actually factor - THIS HASN'T BEEN TESTED <!>
	var coefficient;
	if (this.coefficient instanceof ConstantGroup) {
		coefficient = coefficient = factor;
	} else {
		coefficient = factor.match(new RegExp("^" + NEG_FRACTION_REGEX));
	}
	if (coefficient != null) {
		var c_val = coefficient[0];
		this.coefficient.factorOut(c_val);
		console.log(this.coefficient);
	}
	var factors = factor.match(new RegExp("[a-df-hj-zA-Z](?:\\^" +
		NEG_FRACTION_REGEX + ")?", "g"));
	if (factors == null) {
		this.simplify(true);
		return;
	}
	// console.log("AlegbraGroup:");
	// console.log(factors);
	for (var i = factors.length; i --; ) {
		var letter = factors[i][0];
		var exp = factors[i].substr(2) || "1";
		this.incrementVar(letter, "-" + exp);
	}
	this.simplify(true);
}
AlgebraGroup.prototype.add = function(n) {
	// Add coefficients
	this.coefficient.add(n.coefficient);	
}
AlgebraGroup.prototype.duplicate = function() {
	var variable = new Object();
	var result = new AlgebraGroup({
		text: this.variableText().replace(
			/([a-z])(-|\d)/gi, "$1^$2"),
		parent: this.parent
	});
	result.coefficient = this.coefficient.duplicate();
	result.fixLinks();
	return result;
}
AlgebraGroup.prototype.toString = function() {
	// Variable String
	var v_array = new Array();
	for (var name in this.variable) {
		v_array.push(name + "^" +
			this.variable[name]);
	}
	var v_str = v_array.join("");
	return this.coefficient.toString() +
		v_str;
}
AlgebraGroup.prototype.factors = function() {
	var factors = new Array();
	// Coefficient factors
	factors = factors.concat(this.coefficient.factors());
	// Variable factors
	for (var name in this.variable) {
		var power = this.getVar(name).toNumber();
		if (power == 0) continue;
		if (power > 0) factors.push(name);
		if (power < 0) factors.push(name + "^-1");
		// All possible higher factors
		if (power % 1 == 0) {
			for (var s = sign(power), i = Math.abs(power) + 1;
				-- i >= 2; ) {
				factors.push(name + "^" + s * i);
			}
		}
	}
	return factors;
}
AlgebraGroup.prototype.replaceFactor = function(json) {
	var json = replace_factor_json(arguments);
	// Check each factor separately
	for (var n in json) {
		// Break down the factor being tested
		var n_factors = n.match(new RegExp("(?:^" + NEG_FRACTION_REGEX +
			"|[a-zA-Z\u03C0](?:\\^" + NEG_FRACTION_REGEX + ")?)", "g"));
		if (!n_factors) continue;
		// How many times the factor was removed
		var exp = 0;
		var partial; // Indicates that the factor was only partially removed
		var copy = this.duplicate();
		while (true) {
			var factors = copy.factors();
			var okay = true;
			for (var i = n_factors.length; i --; ) {
				if (factors.indexOf(n_factors[i]) === -1) {
					okay = false;
					break;
				}
			}
			if (!okay) break;
			// Increment the count of the times this factor was removed
			++ exp;
			// Remove factors in copies of children
			var coefficient = !/[a-zA-Z\u03C0]/.test(n_factors[0]);
			if (coefficient) {
				var c_val = n_factors[0];
				var c_fraction = new Fraction(c_val).reciprocal();
				copy.coefficient.multiply(c_fraction);
			}
			var vars = n_factors.slice(coefficient);
			for (var i = vars.length; i --; ) {
				var v = vars[i][0];
				if (/[ei\u03C0]/.test(v)) {
					if (copy.coefficient instanceof ConstantGroup) {
						if (!copy.coefficient.hasConst(v)) break;
						if (Math.abs(copy.coefficient.getConst(v).toNumber() < 1)) {
							if (vars[i].substr(2) != "1" && vars[i].length >= 3) break;
							partial = copy.coefficient.getConst(v).duplicate();
							copy.coefficient.setConst(v, "0");
							continue;
						} else {
							copy.coefficient.incrementConst(v, vars[i][2] == "-" ? vars[i].substr(3) :
								"-" + vars[i].substr(2));
						}
					} else {
						break;
					}
				} else {
					if (!copy.hasVar(v)) break;
					if (Math.abs(copy.getVar(v).toNumber() < 1)) {
						if (vars[i].substr(2) != "1" && vars[i].length >= 3) break;
						partial = copy.getVar(v).duplicate();
						copy.setVar(v, "0");
						continue;
					} else {
						copy.incrementVar(v, vars[i][2] == "-" ? vars[i].substr(3) :
							"-" + vars[i].substr(2));
					}
				}
			}
			// Prevent an infinite loop from occurring here
			if (coefficient && n_factors[0] == "1") break;
		}
		// If nothing can be replaced, skip to the next factor
		if (!exp) continue;
		// If the factor was only partially replaced, correct exp
		if (partial) {
			exp = new Fraction(exp);
			exp.add(new Fraction(-1));
			exp.add(partial);
		}
		// Create visuals for the title
		var n1 = new MultiplyGroup({
			text: exp == 1 ? n : "(" + n + ")^" + exp
		});
		var n2 = new ExpressionGroup({
			text: exp == 1 ? json[n] : "(" + json[n] + ")^" + exp
		});
		// Highlight this
		this.highlighted = true;
		// Show the steps
		push_module_step({
			type: "simplify",
			title: describe_operation({
				operation: "rf",
				n1: n1,
				n2: n2
			}),
			visual: this.top_parent.element()
		});
		this.highlighted = false;
		// Actually remove factors in children
		if (this.coefficient instanceof ConstantGroup) {
			var this_co = this.coefficient;
			var copy_co = copy.coefficient;
			this_co.coefficient.numerator =
				copy_co.coefficient.numerator;
			this_co.coefficient.denominator =
				copy_co.coefficient.denominator;
			for (var name in this_co.constant) {
				this_co.setConst(name, (copy_co.constant[name] || "0").toString());
			}
		} else {
			this.coefficient.numerator = copy.coefficient.numerator;
			this.coefficient.denominator = copy.coefficient.denominator;
		}
		for (var name in this.variable) {
			this.setVar(name, (copy.variable[name] || "0").toString());
		}
		var replace_val = json[n];
		// Add in the replacement values
		if (exp == 1) {
			var m_group = this.multiplyGroup();
			if (m_group.groups.length == 1 && replace_val[0] == "-" &&
				!/[a-zA-Z](?!\^0)/.test(this.toString()) &&
				this.coefficient.toNumber() == -1) {
				this.coefficient.multiply(-1);
				replace_val = replace_val.substr(1);
			}
			m_group.push(new ExpressionGroup({
				text: replace_val,
				parent: m_group
			}));
		} else if (exp) {
			var m_group = this.multiplyGroup();
			m_group.push(new ExpressionGroup({
				text: "(" + replace_val + ")^" + exp,
				parent: m_group
			}));
		}
	}
	// Check whether there are any variables left
	if (!/[a-zA-Z](?!\^0)/.test(this.toString())) {
		if (this.coefficient.toNumber() == 1) {
			this.multiplyGroup().remove(this);
		} else {
			this.value = this.coefficient;
			this.fixLinks();
		}
	}
}
AlgebraGroup.prototype.fixLinks = function() {
	if (this.value != this.coefficient) {
		// Fix links between this and this.coefficient
		this.coefficient = this.coefficient.valueOf();
		this.coefficient.parent = this;
		this.coefficient.top_parent = this.top_parent;
		// Fix the links within this.coefficient
		this.coefficient.fixLinks();
	} else {
		// Fix links between this and this.coefficient
		this.coefficient.parent = this.parent;
		if (this.parent != null) {
			this.value.top_parent = this.top_parent;
		} else {
			this.value.top_parent = this.value;
		}
		// Fix the links within this.coefficient
		this.coefficient.fixLinks();
	}
}
AlgebraGroup.prototype.simplify = function(hideSteps) {
	var hideSteps = hideSteps || false;
	// Simplify coefficient
	this.coefficient.simplify(hideSteps ? false : null);
	// Is it a constant?
	var constant = true;
	for (var name in this.variable) {
		if (this.variable[name].toNumber() == 0) {
			if (!hideSteps) {
				this.highlighted_temp.push(name);
				var var_obj = new AlgebraGroup({
					text: name
				});
				// ModuleStep: Simplify var^0
				push_module_step({
					type: "simplify",
					title: describe_operation({
						operation: "^",
						n1: var_obj,
						n2: 0
					}),
					visual: this.equation.element()
				});
				this.highlighted_temp.splice(0);
			}
			this.removeVar(name);
			continue;
		}
		constant = false;
	}
	if (this.coefficient.toNumber() == 0) {
		constant = true;
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
		this.temp_variables = null;
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
			// Get fractions of exponents
			var e1 = new Fraction({
				text: other.substr(1)
			});
			var e2 = new Fraction({
				text: temp_var.substr(1)
			});
			// ModuleStep (Variable Exp.)
			push_module_step({
				type: "simplify",
				title: describe_operation({
					operation: "+",
					n1: e1,
					n2: e2
				}),
				visual: this.equation.element()
			});
			this.highlighted_temp.splice(0);
			// Combine data
			e1.add(e2);
			var new_exp = e1.toString();
			this.temp_variables[var_pos] =
				other[0] + new_exp;
			this.temp_variables[x] = "";
		}
		var_letters.push(temp_var[0]);
	}
	this.temp_variables = null;
}
AlgebraGroup.prototype.multiplyGroup = function(n) {
	var m_group;
	if (this.parent != null && this.parent.valueOf() instanceof MultiplyGroup) {
		m_group = this.parent.valueOf();
	} else {
		var par = this.parent;
		if (par != null) par = par.valueOf();
		m_group = new MultiplyGroup({
			parent: par,
			side: this.side,
			equation: this.equation
		});
		m_group.push(this);
		if (par == null) {
			this.top_parent = m_group.top_parent = m_group;
			if (this.equation != null) this.equation[this.side] = m_group;
		} else {
			par.valueOf().replace(this, m_group);
		}
	}
	if (n) m_group.push(n);
	return m_group;
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
	if (constant instanceof ConstantGroup ||
		constant.numerator != 1 ||
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
				temp_var[0], new Fraction({
					text: temp_var.substr(1),
					parent: this
				}),
				true,
				this.highlighted_temp.indexOf(
					x) != -1 ||
				this.highlighted_temp.indexOf(
					temp_var[0]) != -1));
		}
	}

	return elem;
}

FunctionGroup = function(json) {
	var json = json || {};
	this.name = json.name || "";
	this.arguments = json.arguments || new Array();
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
	// Update config_used
	if (this.name in DefaultFunctions) {
		// Trig?
		if (/^(?:sin|cos|tan)$/.test(this.name)) {
			config_used.preferences.angle = true;
			config_used.preferences.trig = true;
			config_used.preferences.angle = true;
		}
	}
}

FunctionGroup.prototype.replace = function(g1, g2) {
	// g1 = The old group
	// g2 = The new group

	var index = this.arguments.indexOf(g1);
	if (index == -1) {
		for (var i = this.arguments.length; i --; ) {
			if (this.arguments[i].valueOf() != g1) continue;
			index = i;
			break;
		}
	}
	this.arguments[index] = g2;
	g2.parent = this;
	g2.top_parent = this.top_parent;
	g2.side = this.side;
	g2.equation = this.equation;
}

FunctionGroup.prototype.factors = function() {
	return [this.toString()];
}

FunctionGroup.prototype.factorOut = function(factor) {
	if (factor == this.toString()) {
		this.value = new Fraction({
			numerator: 1,
			parent: this.parent
		});
	}
}

FunctionGroup.prototype.replaceFactor = function(json) {
	var json = replace_factor_json(arguments);
	for (var x = 0, y = this.arguments.length; x < y; ++ x) {
		this.arguments[x].valueOf().replaceFactor(json);
		this.arguments[x] = this.arguments[x].valueOf();
	}
}

FunctionGroup.prototype.fixLinks = function() {
	for (var x = 0, y = this.arguments.length; x < y; ++ x) {
		this.arguments[x].parent = this;
		this.arguments[x].equation = this.equation;
		this.arguments[x].side = this.side;
		this.arguments[x].fixLinks();
	}
}

FunctionGroup.prototype.valueOf = function() {
	if (this.value) return this.value;
	return this;
}

FunctionGroup.prototype.toString = function() {
	return this.name + "(" + this.arguments.join(",") + ")";
}

FunctionGroup.prototype.simplify = function() {
	// Simplify arguments
	for (var x = 0, y = this.arguments.length; x < y; ++ x) {
		this.arguments[x].simplify();
		this.arguments[x] = this.arguments[x].valueOf();
	}
	this.fixLinks();
	// If appropriate, simplify the function
	if (this.name in DefaultFunctions) {
		var value;
		// Trig?
		if (/^(?:sin|cos|tan)$/.test(this.name)) {
			value = trig_function.call(this,
				this.name, this.arguments[0]);
		} else {
			value = DefaultFunctions[this.name].apply(
				this, this.arguments);
		}
		if (value) {
			// ModuleStep: Evaluate function
			this.highlighted = true;
			push_module_step({
				type: "simplify",
				title: "Evaluate " + truncate_number(this),
				visual: (this.equation || this).element()
			});
			this.highlighted = false;
			this.value = value;
			this.value.equation = this.equation;
			this.value.side = this.side;
			if (this.parent == null) {
				this.equation[this.side] = this.value;
			} else {
				this.value.parent = this.parent;
				this.value.top_parent = this.top_parent;
			}
		}
	}
}

FunctionGroup.prototype.element = function() {
	var elem = document.createElement("div");
	elem.addClass("function");
	if (this.highlighted) {
		elem.addClass("highlighted");
	}
	elem.appendTextNode(this.name);
	var args = document.createElement("span");
	args.addClass("arguments parentheses");
	elem.appendChild(args);
	for (var x = 0, y = this.arguments.length; x < y; ++ x) {
		if (x) {
			var comma = document.createElement("span");
			comma.addClass("comma");
			comma.appendTextNode(",");
			args.appendChild(comma);
		}
		args.appendChild(this.arguments[x].element());
	}
	return elem;
}

Fraction = function(json) {
	if (json === 0) json = '0';
	var json = json || {};
	if (typeof json === 'string' ||
		typeof json === 'number') json = { text: json };
	if (json.text) {
		if (typeof json.text === 'number') {
			json.text = String(json.text);
		}
		if (json.text == "-" || json.text == "") {
			json.text += "1";
		}
		var slash_pos = json.text.indexOf("/");
		if (slash_pos != -1) {
			json.numerator =
				+json.text.substr(0, slash_pos);
			json.denominator =
				+json.text.substr(slash_pos + 1);
		} else {
			json.numerator = +json.text;
		}
	}
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

Fraction.prototype.highlight = function(part) {
	// Un-highlight everything
	if (part === false) {
		this.highlighted = false;
		return null;
	}
	// Highlight everything
	if (part === true || part == null) {
		this.highlighted = true;
		return this;
	}
}

Fraction.prototype.add = function(n) {
	// Fractions
	if (n instanceof Fraction) {
		// Convert decimal to fraction
		if (this.numerator % 1 &&
			this.denominator % 1 == 0) {
			var val = this.numerator.toString();
			if (/\.\d{1,5}$/.test(val.toString())) {
				var ratio = Math.pow(10,
					val.match(/\.\d+/)[0].length - 1);
				this.numerator *= ratio;
				this.denominator *= ratio;
			}
		}
		if (n.numerator % 1 &&
			n.denominator % 1 == 0) {
			var val = n.numerator.toString();
			if (/\.\d{1,5}$/.test(val.toString())) {
				var ratio = Math.pow(10,
					val.match(/\.\d+/)[0].length - 1);
				n.numerator *= ratio;
				n.denominator *= ratio;
			}
		}
		// Match denominators
		var this_d = this.denominator;
		var n_d = n.denominator;
		if (n_d != this_d) {
			this.numerator *= n_d;
			this.denominator *= n_d;
			n.numerator *= this_d;
			n.denominator *= this_d;
		}
		this.numerator += n.numerator;
		var n_factors = get_factors(
			this.numerator).slice(1);
		var d_factors = get_factors(
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
	// Plus/Minus?
	if (n instanceof PlusMinusGroup) {
		this.multiply(n.group);
		n.group.value = this.valueOf();
		this.value = n;
		this.highlighted = false;
		return;
	}
	// Number
	if (typeof n === 'number') {
		this.numerator *= n;
	}
	// Fractions
	if (n instanceof Fraction &&
		!(n instanceof ConstantGroup)) {
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
	if (n instanceof AlgebraGroup ||
		n instanceof FractionGroup ||
		n instanceof ConstantGroup) {
		n.multiply(this);
		this.value = n.valueOf();
	}
}
Fraction.prototype.factorOut = function(factor, showSteps) {
	var showSteps = showSteps || false;
	if (showSteps) {
		this.highlighted = true;
		push_module_step({
			type: "simplify",
			title: describe_operation({
				operation: "/f",
				n1: factor,
				n2: this
			}),
			visual: this.equation.element()
		});
		this.highlighted = false;
	}
	// Actually factor
	this.multiply(new Fraction(factor).reciprocal());
	this.simplify(false);
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
	var n = this.toNumber();
	return new Fraction({
		numerator: Math.abs(this.denominator) * sign(n),
		denominator: Math.abs(this.numerator),
		parent: this.parent
	});
}
Fraction.prototype.fixLinks = function() {
	// Don't think there's really anything to be done here
}
Fraction.prototype.simplify = function(visibleGroup) {
	// visibleGroup is used to indicate
	// that another group should be used for
	// rendering (default = null)
	// if visibleGroup === false, nothing will be rendered
	// var visibleGroup = (visibleGroup != null ? visibleGroup : null);
	var n = this.numerator;
	var d = this.denominator;
	var abs_n = Math.abs(n);
	var abs_d = Math.abs(d);
	if (this.numerator < 0 &&
		this.denominator < 0) {
		if (visibleGroup !== false) {
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
		}
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
		if (visibleGroup !== false) {
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
		}
		if (n % d == 0) {
			this.numerator /= d;
			this.denominator = 1;
		} else {
			this.denominator /= n;
			this.numerator = 1;
		}
		return true;
	}
	var n_factors = get_factors(abs_n).slice(1);
	var d_factors = get_factors(abs_d).slice(1);
	var i = n_factors.length;
	while (i --) {
		var x = n_factors[i];
		if (d_factors.indexOf(x) != -1) { // GCF
			// ModuleStep (Simplify)
			if (visibleGroup !== false) {
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
			}
			this.numerator /= x;
			this.denominator /= x;
			return true;
		}
	}
	return false;
}
Fraction.prototype.multiplyGroup = function(n) {
	var m_group;
	if (this.parent != null && this.parent.valueOf() instanceof MultiplyGroup) {
		m_group = this.parent.valueOf();
	} else {
		var par = this.parent;
		if (par != null) par = par.valueOf();
		m_group = new MultiplyGroup({
			parent: par,
			side: this.side,
			equation: this.equation
		});
		m_group.push(this);
		if (par == null) {
			this.top_parent = m_group.top_parent = m_group;
			if (this.equation != null) this.equation[this.side] = m_group;
		} else {
			par.valueOf().replace(this, m_group);
		}
	}
	if (n) m_group.push(n);
	return m_group;
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
		return this.numerator.toString();
	}
	return this.numerator + "/" +
		this.denominator;
}
Fraction.prototype.factors = function() {
	var n_val = this.numerator;
	var d_val = this.denominator;
	var factors;
	if (n_val % 1) {
		factors = new Array();
		factors.push(n_val.toString().replace("-", ""));
	} else {
		factors = get_factors(Math.abs(n_val));
	}
	if (d_val % 1) {
		factors.push(d_val.toString().replace("-", ""));
	} else {
		var new_factors = get_factors(Math.abs(d_val));
		for (var i = new_factors.length; i --; ) {
			if (new_factors[i] == "1") continue;
			factors.push("1/" + new_factors[i]);
		}
	}
	for (var i = factors.length; i --; ) {
		factors[i] = factors[i].toString();
	}
	if (this.toNumber() < 0) factors.push("-1");
	return factors;
}
Fraction.prototype.replaceFactor = function(json) {
	var json = replace_factor_json(arguments);
	// Check each factor separately
	for (var n in json) {
		var factors = this.factors();
		if (factors.indexOf(n) === -1) {
			continue;
		}
		// Remove factors in children
		var n_fraction = new Fraction(n).reciprocal();
		console.log(n_fraction);
		this.multiply(n_fraction);
		// Add in the replacement values
		var m_group = this.multiplyGroup();
		m_group.push(new ExpressionGroup({
			text: json[n]
		}));
	}
}
Fraction.prototype.element = function() {
	var elem = fraction_element(this.numerator,
		this.denominator, true, this.highlighted);
	if (this.parent == null && this.side != null) {
		elem.addClass(this.side + "-side");
	}
	return elem;
}

ConstantGroup = function(json) {
	var json = json || {};
	this.text = json.text || "0";
	// Store the constants from text
	// (before simplifying)
	this.temp_constants = new Array();
	// Stores constants in the group and
	// their degree (e.g. x^2 would be {x:2})
	this.constant = json.constant || new Object();
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
		json.constant == null ||
		json.coefficient == null)) {
		this.updateFromText(this.text);
	} else {
		this.temp_constants = null;
	}
}

ConstantGroup.prototype = new Fraction();

ConstantGroup.prototype.hasConst = function(name) {
	return (this.constant[name] != null);
}
ConstantGroup.prototype.getConst = function(name) {
	return this.constant[name];
}
ConstantGroup.prototype.removeConst = function(name) {
	delete this.constant[name];
}
ConstantGroup.prototype.setConst = function(name, degree) {
	if (name == "\u03C0") {
		// The pi preference affected the output
		config_used.preferences.pi = true;
	}
	if (name == "e") {
		// The e preference affected the output
		config_used.preferences.e = true;
	}
	if (!(degree instanceof Fraction)) {
		degree = new Fraction({
			text: degree
		});
	}
	if (degree.toNumber() != 0) {
		this.constant[name] = degree;
	} else {
		delete this.constant[name];
	}
	return degree;
}
ConstantGroup.prototype.incrementConst = function(name, degree) {
	if (!(degree instanceof Fraction)) {
		degree = new Fraction({
			text: degree
		});
	}
	if (!this.hasConst(name)) {
		return this.setConst(name, degree);
	} else {
		this.constant[name].add(degree);
		return (this.constant[name]);
	}
}
ConstantGroup.prototype.constantText = function() {
	var constants = new Array();

	for (var name in this.constant) {
		constants.push(name + this.constant[name]);
	}

	return constants.join("");
}
ConstantGroup.prototype.updateFromText = function(text) {
	var constants;
	var coefficient = new RegExp("^-?(?:" +
		FRACTION_REGEX + ")?").exec(text);
	if (coefficient != null) {
		if (coefficient[0] == "-") coefficient[0] += "1"
		this.coefficient = new Fraction({
			text: coefficient[0],
			parent: this,
			equation: this.equation,
			side: this.side
		});
	}
	constants = text.match(new RegExp(
		"[ei\u03C0](?:\\^" + NEG_FRACTION_REGEX + ")?",
		"gi"));
	if (constants == null) {
		// console.error("No constants!");
		return;
	}
	constants.reverse();
	var i = constants.length;
	while (i --) {
		if (constants[i].length == 1) {
			constants[i] += "^1";
		}
		var var_letter = constants[i][0];
		var var_exp = constants[i].substr(2);
		if (this.temp_constants) this.temp_constants.push(var_letter + var_exp);
		this.incrementConst(var_letter, var_exp);
	}
	this.text = text;
}
ConstantGroup.prototype.highlight = function(part) {
	// Un-highlight everything
	if (part === false) {
		this.highlighted = false;
		this.coefficient.highlighted = false;
		this.highlighted_temp.splice(0);
		return null;
	}
	// Highlight everything
	if (part === true || part == null) {
		this.highlighted = true;
		return this;
	}
	// Highlight coefficient
	if (new RegExp("^" + NEG_FRACTION_REGEX).test(part)) {
		this.coefficient.highlighted = true;
		return this.coefficient;
	}
	// Highlight a var
	var vars = part.replace(new RegExp("\\^" +
		NEG_FRACTION_REGEX, "g"), "").split("");
	this.highlighted_temp =
		this.highlighted_temp.concat(vars);
}
ConstantGroup.prototype.multiply = function(n) {
	// Plus/Minus?
	if (n instanceof PlusMinusGroup) {
		this.multiply(n.group);
		n.group.value = this.valueOf();
		this.value = n;
		this.highlighted = false;
		return;
	}
	// FractionGroup
	if (n instanceof FractionGroup) {
		n.multiply(this);
		this.value = n.valueOf();
		return;
	}
	// ExpressionGroup
	if (n instanceof ExpressionGroup) {
		n.multiply(this);
		this.value = n.valueOf();
		return;
	}
	// Multiply coefficients
	if ((n instanceof Fraction &&
		!(n instanceof ConstantGroup)) ||
		typeof n === 'number') {
		this.coefficient.multiply(n);
		return;
	}
	// AlgebraGroup
	if (n instanceof AlgebraGroup) {
		n.coefficient.multiply(this);
		n.coefficient = n.coefficient.valueOf();
		return;
	}
	// Multiply everything
	this.coefficient.multiply(n.coefficient);
	for (var name in n.constant) {
		this.incrementConst(name, n.constant[name]);
	}
}
ConstantGroup.prototype.factorOut = function(factor, showSteps) {
	var showSteps = showSteps || false;
	if (showSteps) {
		this.highlighted = true;
		push_module_step({
			type: "simplify",
			title: describe_operation({
				operation: "/f",
				n1: factor,
				n2: this
			}),
			visual: this.equation.element()
		});
		this.highlighted = false;
	}
	// Actually factor - THIS HASN'T BEEN TESTED <!>
	var coefficient = factor.match(new RegExp("^" + NEG_FRACTION_REGEX));
	if (coefficient != null) {
		var c_val = coefficient[0];
		this.coefficient.factorOut(c_val);
		console.log(this.coefficient);
	}
	var factors = factor.match(new RegExp("[ei\u03C0](?:\\^" +
		NEG_FRACTION_REGEX + ")?", "g"));
	if (factors == null) {
		this.simplify(true);
		return;
	}
	console.log("AlegbraGroup:");
	console.log(factors);
	for (var i = factors.length; i --; ) {
		var letter = factors[i][0];
		var exp = factors[i].substr(2) || "1";
		this.incrementConst(letter, "-" + exp);
	}
	this.simplify(true);
}
ConstantGroup.prototype.add = function(n) {
	// Add coefficients
	this.coefficient.add(n.coefficient);
}
ConstantGroup.prototype.duplicate = function() {
	var constant = new Object();

	return new ConstantGroup({
		text: this.toString(),
		parent: this.parent
	});
}
ConstantGroup.prototype.toNumber = function() {
	// Approximate the value of this ConstantGroup
	var result = 1;
	result *= this.coefficient.toNumber();
	// Multiply each constant's value
	for (var c in this.constant) {
		var exp = this.constant[c].toNumber();
		var val = 1;
		switch (c) {
			case "e": val = Math.pow(Math.E, exp); break;
			case "\u03C0": val = Math.pow(Math.PI, exp); break;
			case "i":
				var mod = exp % 4;
				val = (mod % 2 ? NaN : 1) * (mod == 2 ? -1 : 1);
				break;
			default: break; 
		}
		result *= val;
	}
	return result;
}
ConstantGroup.prototype.toString = function() {
	// Constant String
	var v_array = new Array();
	for (var name in this.constant) {
		v_array.push(name + "^" +
			this.constant[name]);
	}
	var v_str = v_array.join("");
	return this.coefficient.toString() +
		v_str;
}
ConstantGroup.prototype.factors = function() {
	var factors = new Array();
	// Coefficient factors
	factors = factors.concat(this.coefficient.factors());
	// constant factors
	for (var name in this.constant) {
		var power = this.getConst(name).toNumber();
		if (power == 0) continue;
		if (power > 0) factors.push(name);
		if (power < 0) factors.push(name + "^-1");
		// All possible higher factors
		if (power % 1 == 0) {
			for (var s = sign(power), i = Math.abs(power) + 1;
				-- i >= 2; ) {
				factors.push(name + "^" + s * i);
			}
		}
	}
	return factors;
}
ConstantGroup.prototype.replaceFactor = function(json) {
	var json = replace_factor_json(arguments);
	// Check each factor separately
	for (var n in json) {
		// Break down the factor being tested
		var n_factors = n.match(new RegExp("(?:^" + NEG_FRACTION_REGEX +
			"|[ei\u03C0](?:\\^" + NEG_FRACTION_REGEX + ")?)", "g"));
		if (!n_factors) continue;
		// How many times the factor was removed
		var exp = 0;
		var partial;
		var copy = this.duplicate();
		while (true) {
			var factors = copy.factors();
			var okay = true;
			for (var i = n_factors.length; i --; ) {
				if (factors.indexOf(n_factors[i]) === -1) {
					okay = false;
					break;
				}
			}
			if (!okay) break;
			// Increment the count of the times this factor was removed
			++ exp;
			// Remove factors in copies of children
			var coefficient = !/[ei\u03C0]/.test(n_factors[0]);
			if (coefficient) {
				var c_val = n_factors[0];
				var c_fraction = new Fraction(c_val).reciprocal();
				copy.coefficient.multiply(c_fraction);
			}
			var vars = n_factors.slice(coefficient);
			for (var i = vars.length; i --; ) {
				var v = vars[i][0];
				if (!copy.hasConst(v)) continue;
				if (Math.abs(copy.getConst(v).toNumber()) < 1) {
					if (vars[i].substr(2) != "1" && vars[i].length >= 3) break;
					partial = copy.getConst(v).duplicate();
					copy.setConst(v, "0");
					continue;
				} else {
					copy.incrementConst(v, vars[i][2] == "-" ? vars[i].substr(3) :
						"-" + vars[i].substr(2));
				}
			}
			// Prevent an infinite loop from occurring here
			if (coefficient && n_factors[0] == "1") break;
		}
		// If nothing can be replaced, skip to the next factor
		if (!exp) continue;
		// If the factor was only partially replaced, correct exp
		if (partial) {
			exp = new Fraction(exp);
			exp.add(new Fraction(-1));
			exp.add(partial);
		}
		// Create visuals for the title
		var n1 = new MultiplyGroup({
			text: exp == 1 ? n : "(" + n + ")^" + exp
		});
		var n2 = new ExpressionGroup({
			text: exp == 1 ? json[n] : "(" + json[n] + ")^" + exp
		});
		// Highlight this
		this.highlighted = true;
		// Show the steps
		push_module_step({
			type: "simplify",
			title: describe_operation({
				operation: "rf",
				n1: n1,
				n2: n2
			}),
			visual: this.top_parent.element()
		});
		this.highlighted = false;
		// Actually remove factors in children
		this.coefficient.numerator = copy.coefficient.numerator;
		this.coefficient.denominator = copy.coefficient.denominator;
		for (var name in this.constant) {
			this.setConst(name, (copy.constant[name] || "0").toString());
		}
		var replace_val = json[n];
		// Add in the replacement values
		if (exp == 1) {
			var m_group = this.multiplyGroup();
			if (m_group.groups.length == 1 && replace_val[0] == "-" &&
				!/[ei\u03C0](?!\^0)/.test(this.toString()) &&
				this.coefficient.toNumber() == -1) {
				this.coefficient.multiply(-1);
				replace_val = replace_val.substr(1);
			}
			m_group.push(new ExpressionGroup({
				text: replace_val,
				parent: m_group
			}));
		} else if (exp) {
			var m_group = this.multiplyGroup();
			m_group.push(new ExpressionGroup({
				text: "(" + replace_val + ")^" + exp,
				parent: m_group
			}));
		}
	}
	// Check whether there are any constants left
	if (!/[ei\u03C0](?!\^0)/.test(this.toString())) {
		if (this.coefficient.toNumber() == 1) {
			this.multiplyGroup().remove(this);
		} else {
			this.value = this.coefficient;
			this.fixLinks();
		}
	}
}
ConstantGroup.prototype.fixLinks = function() {
	if (this.value != this.coefficient) {
		// Fix links between this and this.coefficient
		this.coefficient = this.coefficient.valueOf();
		this.coefficient.parent = this;
		this.coefficient.top_parent = this.top_parent;
		// Fix the links within this.coefficient
		this.coefficient.fixLinks();
	} else {
		// Fix links between this and this.coefficient
		this.coefficient.parent = this.parent;
		if (this.parent != null) {
			this.value.top_parent = this.top_parent;
		} else {
			this.value.top_parent = this.value;
		}
		// Fix the links within this.coefficient
		this.coefficient.fixLinks();
	}
}
ConstantGroup.prototype.simplify = function(hideSteps) {
	var hideSteps = hideSteps || false;
	// Simplify coefficient
	this.coefficient.simplify(hideSteps ? false : null);
	// Is it a constant?
	var constant = true;
	for (var name in this.constant) {
		if (this.constant[name].toNumber() == 0) {
			if (!hideSteps) {
				this.highlighted_temp.push(name);
				var var_obj = new ConstantGroup({
					text: name
				});
				// ModuleStep: Simplify var^0
				push_module_step({
					type: "simplify",
					title: describe_operation({
						operation: "^",
						n1: var_obj,
						n2: 0
					}),
					visual: this.equation.element()
				});
				this.highlighted_temp.splice(0);
			}
			this.removeConst(name);
			continue;
		} else if (name == "e" || name == "\u03C0") {
			var pref_name = (name == "\u03C0" ? "pi" : name);
			// ModuleStep: Approximate constant
			if (!Config.preferences[pref_name]) {
				this.highlight(name);
				push_module_step({
					type: "simplify",
					title: "Approximate " + truncate_number(
						new ConstantGroup({
							text: name + "^" + this.getConst(name)
						})),
					visual: this.equation.element()
				});
				this.highlight(false);
				this.coefficient.multiply(Math.pow(
					Math[pref_name.toUpperCase()], this.getConst(name).toNumber()));
				this.removeConst(name);
				continue;
			}
		} else if (name == "i") {
			var e_val = this.getConst(name).toNumber();
			if (e_val % 2 == 0) {
				this.highlight("i");
				push_module_step({
					type: "simplify",
					title: describe_operation({
						operation: "^",
						n1: new ConstantGroup({text: "i"}),
						n2: this.getConst(name).duplicate()
					}),
					visual: this.equation.element()
				});
				this.highlight(false);
				this.removeConst(name);
				this.coefficient.multiply(Math.pow(-1, e_val * 0.5));
				continue;
			}
		}
		constant = false;
	}
	if (this.coefficient.toNumber() == 0) {
		constant = true;
	}
	if (constant) {
		this.value = this.coefficient;
		this.value.parent = this.parent;
		if (this.parent == null) {
			this.value.top_parent = this.value;
		}
	}
	// Join constants
	if (this.temp_constants == null) {
		return false;
	}
	if (!this.temp_constants.length) {
		this.temp_constants = null;
		return false;
	}
	var var_letters = [];
	for (var x = 0, y =
		this.temp_constants.length; x < y;
		++ x) {
		var temp_var = this.temp_constants[x];
		if (!temp_var.length) {
			continue;
		}
		var var_pos = var_letters.indexOf(
			temp_var[0]);
		if (var_pos != -1) {
			var other = this.temp_constants[var_pos];
			this.highlighted_temp.push(var_pos);
			this.highlighted_temp.push(x);
			// Get fractions of exponents
			var e1 = new Fraction({
				text: other.substr(1)
			});
			var e2 = new Fraction({
				text: temp_var.substr(1)
			});
			// ModuleStep (constant Exp.)
			push_module_step({
				type: "simplify",
				title: describe_operation({
					operation: "+",
					n1: e1,
					n2: e2
				}),
				visual: this.equation.element()
			});
			this.highlighted_temp.splice(0);
			// Combine data
			e1.add(e2);
			var new_exp = e1.toString();
			this.temp_constants[var_pos] =
				other[0] + new_exp;
			this.temp_constants[x] = "";
		}
		var_letters.push(temp_var[0]);
	}
	this.temp_constants = null;
}
ConstantGroup.prototype.multiplyGroup = function(n) {
	var m_group;
	if (this.parent != null && this.parent.valueOf() instanceof MultiplyGroup) {
		m_group = this.parent.valueOf();
	} else {
		var par = this.parent;
		if (par != null) par = par.valueOf();
		m_group = new MultiplyGroup({
			parent: par,
			side: this.side,
			equation: this.equation
		});
		m_group.push(this);
		if (par == null) {
			this.top_parent = m_group.top_parent = m_group;
			if (this.equation != null) this.equation[this.side] = m_group;
		} else {
			par.valueOf().replace(this, m_group);
		}
	}
	if (n) m_group.push(n);
	return m_group;
}
ConstantGroup.prototype.valueOf = function() {
	if (this.value != null) {
		return this.value;
	} else {
		return this;
	}
}
ConstantGroup.prototype.element = function() {
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

	// constant / Exponent elements
	if (this.temp_constants == null) {
		// Simplified
		for (var name in this.constant) {
			var exponent = this.constant[name];
			elem.appendChild(exponent_element(
				name, exponent, true,
				this.highlighted_temp.indexOf(
					name) != -1));
		}
	} else {
		// Before simplification
		for (var x = 0, y =
			this.temp_constants.length; x < y;
			++ x) {
			var temp_var = this.temp_constants[x];
			if (!temp_var.length) {
				continue;
			}
			elem.appendChild(exponent_element(
				temp_var[0], new Fraction({
					text: temp_var.substr(1),
					parent: this
				}),
				true,
				this.highlighted_temp.indexOf(
					x) != -1 ||
				this.highlighted_temp.indexOf(
					temp_var[0]) != -1));
		}
	}

	return elem;
}

BracketGroup = function(json) {
	this.groups = json.groups || new Array();
	if (json.text != null && !this.groups.length) {
		var groups = json.text.split(",");
		for (var x = 0, y = groups.length; x < y;
			++ x) {
			this.groups.push(new ExpressionGroup({
				text: groups[x]
			}));
			if (!json.preventSimplify) {
				this.groups[x].simplify();
				this.groups[x] =
					this.groups[x].valueOf();
			}
		}
	}
}

BracketGroup.prototype.simplify = function() {
	for (var x = 0, y = this.groups.length; x < y;
		++ x) {
		var group = this.groups[x];
		group.simplify();
		this.groups[x] = group.valueOf();
	}
}

BracketGroup.prototype.element = function() {
	var wrapper = document.createElement("div");
	wrapper.addClass("brackets");

	for (var x = 0, y = this.groups.length; x < y;
		++ x) {
		var group = this.groups[x];
		var group_elem = group.element();
		// Correct negative fractions
		if (group_elem.hasClass("fraction") &&
			group_elem.hasClass("negative")) {
			group_elem.removeClass("negative");
			group_elem.children[0].addClass(
				"negative");
		}
		// Comma
		if (x) {
			var comma = document.createElement("span");
			comma.addClass("comma");
			comma.appendTextNode(",");
			wrapper.appendChild(comma);
		}
		// Group element
		wrapper.appendChild(group_elem);
	}

	return wrapper;
}

PlusMinusGroup = function(json) {
	var json = json || {};
	this.group = json.group || null;
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
	this.value = this;
}

PlusMinusGroup.prototype.duplicate = function() {
	var copy = new PlusMinusGroup({
		group: this.group.duplicate()
	});
}

PlusMinusGroup.prototype.multiply = function(n) {
	this.group.multiply(n);
	this.group = this.group.valueOf();
	this.group.highlighted = false;
	if (this.group instanceof AlgebraGroup) {
		this.group.temp_highlighted.splice(0);
	}
}

PlusMinusGroup.prototype.factorOut = function(factor, showSteps) {
	var showSteps = showSteps || false;
	if (showSteps) {
		this.highlighted = true;
		push_module_step({
			type: "simplify",
			title: describe_operation({
				operation: "/f",
				n1: factor,
				n2: this
			}),
			visual: this.equation.element()
		});
		this.highlighted = false;
	}
	// Actually factor
	if (factor[0] == "-") factor = factor.substr(1);
	this.group.factorOut(factor);
}

PlusMinusGroup.prototype.replace = function(g1, g2) {
	// g1 = The old group
	// g2 = The new group

	if (this.group == g1 ||
		this.group.valueOf() == g1) {
		this.group = g2;
		g2.parent = this;
	} else {
		console.warn("Attempt to replace nonexistant " +
			"child in PlusMinusGroup");
	}
}

PlusMinusGroup.prototype.toString = function() {
	return "\u00B1" + this.group.toString();
}

PlusMinusGroup.prototype.factors = function() {
	var factors = new Array();
	factors.push("-1");
	factors = factors.concat(this.group.factors());
	return factors;
}

PlusMinusGroup.prototype.replaceFactor = function(json) {
	var json = replace_factor_json(arguments);
	// TODO: Make it possible to replace expressions?
	// Replace factors in child
	this.group.valueOf().replaceFactor(json);
	this.group = this.group.valueOf();
}

PlusMinusGroup.prototype.fixLinks = function() {
	// Fix links between this and this.group
	this.group = this.group.valueOf();
	this.group.parent = this;
	this.group.top_parent = this.top_parent;
	// Fix the links within this.group
	this.group.fixLinks();
}

PlusMinusGroup.prototype.simplify = function() {
	// Simplify group
	this.group.simplify();
	this.group = this.group.valueOf();

	// Can only simplify if 0
	if (this.group instanceof Fraction) {
		if (this.group.toNumber() == 0) {
			this.value = this.group;
		}
	}
}

PlusMinusGroup.prototype.multiplyGroup = function(n) {
	var m_group;
	if (this.parent != null && this.parent.valueOf() instanceof MultiplyGroup) {
		m_group = this.parent.valueOf();
	} else {
		var par = this.parent;
		if (par != null) par = par.valueOf();
		m_group = new MultiplyGroup({
			parent: par,
			side: this.side,
			equation: this.equation
		});
		m_group.push(this);
		if (par == null) {
			this.top_parent = m_group.top_parent = m_group;
			if (this.equation != null) this.equation[this.side] = m_group;
		} else {
			par.valueOf().replace(this, m_group);
		}
	}
	if (n) m_group.push(n);
	return m_group;
}

PlusMinusGroup.prototype.valueOf = function() {
	return this.value || this;
}

PlusMinusGroup.prototype.element = function() {
	var wrapper =
		document.createElement("span");
	wrapper.addClass("plus-minus-group");
	if (this.highlighted) {
		wrapper.addClass("highlighted");
	}
	var plus_minus = document.createElement(
		"span");
	plus_minus.addClass("operation");
	plus_minus.setAttribute("data-operation",
		"\u00B1");
	plus_minus.innerHTML = "&#177;";
	wrapper.appendChild(plus_minus);
	wrapper.appendChild(
		this.group.element());
	return wrapper;
}

ResultText = function(json) {
	this.text = json.text || new String();
	this.icon = json.icon || null;
}

ResultText.prototype.element = function() {
	var elem = document.createElement("div");
	elem.addClass("result-text");
	if (this.icon != null) {
		var icon = document.createElement("i");
		icon.addClass("fa fa-" + this.icon);
		elem.appendChild(icon);
	}
	elem.appendTextNode(this.text);

	return elem;
}

function describe_operation(json) {
	if (json.abs == null) {
		json.abs = true;
	}
	if (json.operation == "^") {
		var o_string = null;
		var root = get_fraction(json.n2);
		if (json.n2 == 2) {
			o_string = "Square";
		} else if (json.n2 == 3) {
			o_string = "Cube";
		} else if (root.numerator == 1 &&
			root.denominator != 1) {
			var n = root.denominator;
			var n_str;
			switch (n) {
				case 2: n_str = "square"; break;
				case 3: n_str = "cubed"; break;
				default: n_str = n + ordinal_of(
					n); break;
			}
			o_string = "Take the " +
				n_str + " root of";
		}
		if (o_string != null) {
			return o_string + " " +
				truncate_number(json.n1);
		}
	}
	if (json.operation == "/f") {
		json.n1 = new ExpressionGroup({
			text: json.n1
		});
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
		case "*r":
			start = "Multiply";
			middle = "by the reciprocal of";
			break;
		case "*+":
			start = "Distribute";
			middle = "to everything inside";
			break;
		case "/":
			start = "Divide";
			middle = "by";
			break;
		case "/d":
			start = "Move";
			middle = "to the top of";
			break;
		case "/f":
			start = "Factor";
			middle = "out of";
			break;
		case "/n":
			start = "Move";
			middle = "to the bottom of";
			break;
		case "^":
			start = "Raise";
			middle = "to the";
			end = ordinal_of(json.n2) + " power";
			break;
		case "^/":
			start = "Divide";
			middle = "out of";
			break;
		case "rf":
			start = "Replace";
			middle = "with";
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

function sign(n) {
	if (n == 0) return 0;
	return n / Math.abs(n);
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
		n_elem.removeClass("equation");
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
	var temp_str = n.toString();
	if (/^-?\d(?:\.\d+)?e-?\d+/.test(temp_str)) {
		var n_str = temp_str.replace(/^(-?\d\.\d{4})\d*/, "$1");
		var e_index = n_str.indexOf("e");
		return new MultiplyGroup({
			text: n_str.substr(0, e_index) + "*10^" +
				n_str.substr(e_index + 1)
		}).element().outerHTML;
	} else if (/\.\d{5,}$/.test(temp_str)) {
		if (/\.0{4,}/.test(temp_str)) {
			var digits = temp_str.match(/\.0+/)[0].length;
			return new MultiplyGroup({
				text: (Math.pow(10, digits) * n).toFixed(4) + "*10^-" +
					digits
			}).element().outerHTML;
		} else {
			var n_str = n.toFixed(4);
		}
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

function get_factors(x) {
	var factors = new Array();
	// Only does integral factors <!>
	// if x has no integral factors,
	// return empty array
	if (/\.\d+/.test(x.toString()) || x == 0) {
		return factors;
	}
	x = Math.abs(x);
	for (var y = 1; y <= x; ++ y) {
		if (factors.indexOf(y) != -1) {
			break;
		}
		if (x % y == 0) {
			factors.push(y);
			if (x / y != y) {
				factors.push(x / y);
			}
		}
	}
	factors.sort(function(a, b) {
		return (a - b);
	});
	return factors;
}

function sanitize_factors(factors) {
	// Removes duplicates
	var result = new Array();
	for (var i = factors.length; i --; ) {
		if (result.indexOf(factors[i]) != -1) continue;
		result.push(factors[i]);
	}
	return result;
}

function sort_factors(factors) {
	// Don't change the original array
	var sorted = factors.concat([]);
	sorted.sort(function(a, b) {
		var a_vars = /[a-zA-Z]/.test(a);
		var b_vars = /[a-zA-Z]/.test(b);
		if (a_vars && !b_vars) {
			return -1;
		} else if (!a_vars && b_vars) {
			return 1;
		} else if (!a_vars && !b_vars) {
			var a_val = get_number(a);
			var b_val = get_number(b);
			var dif = Math.abs(b_val) - Math.abs(a_val);
			return dif != 0 ? dif : a_val - b_val;
		}
		// Algebra
		var a_letter = a[a.search(/[a-zA-Z]/)];
		var b_letter = b[b.search(/[a-zA-Z]/)];
		if (a_letter != b_letter) {
			// This hasn't been tested !!!
			return b_letter <= a_letter;
		}
		var a_exp = a.indexOf("^");
		if (a_exp != -1) {
			a_exp = +a.substr(a_exp + 1);
		} else {
			a_exp = 1;
		}
		var b_exp = b.indexOf("^");
		if (b_exp != -1) {
			b_exp = +b.substr(b_exp + 1);
		} else {
			b_exp = 1;
		}
		return b_exp - a_exp;
	});
	return sorted;
}

function replace_factor_json(args) {
	if (!args.length) return new Object();
	if (args.length == 2) {
		var result = new Object();
		result[String(args[0])] = String(args[1]);
		return result;
	}
	return args[0];
}

function get_fraction(x, plain) {
	// x (Number)
	// plain (Boolean)
	// when plain is true the return value
	// will be a plain object, not a
	// Fraction object
	var plain = plain || false;

	var return_obj = (plain ? new Object() :
		new Fraction());
	var sign = (x < 0 ? -1 : 1);
	if (typeof x === 'number') {
		var n = Math.abs(x);
		var d = 1;	
	} else if (x instanceof Fraction) {
		var n = Math.abs(x.numerator);
		var d = Math.abs(x.denominator);
	} else {
		var n = 1;
		var d = 1;
	}
	var dec_digits = /\.\d+$/.exec(n.toString());
	if (dec_digits == null) {
		return_obj.numerator = sign * n;
		return_obj.denominator = d;
		return return_obj;
	}

	// Get rid of numbers past the decimal point
	var dec_digits = dec_digits[0].length - 1;
	var ratio = Math.pow(10, dec_digits);
	n *= ratio;
	d *= ratio;

	// Simplify (if possible)
	if (n % d == 0) {
		n /= d;
		d = 1;
	} else if (d % n == 0) {
		d /= n;
		n = 1;
	} else { // GCF?
		var n_factors = get_factors(n).slice(1);
		var d_factors = get_factors(d).slice(1);
		var i = n_factors.length;
		while (i --) {
			var f = n_factors[i];
			if (d_factors.indexOf(f) != -1) {
				n /= f;
				d /= f;
				break;
			}
		}
	}

	return_obj.numerator = sign * n;
	return_obj.denominator = d;
	return return_obj;
}

function get_number(fraction_string) {
	var index = fraction_string.indexOf("/");
	if (index == -1) {
		return +fraction_string;
	}
	return (+fraction_string.substr(0, index) /
		+fraction_string.substr(index + 1));
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

	// Radical? (e.g. e = 1/2)
	var radical = false;
	var r_index = 0;
	if (typeof e === 'number' ||
		e instanceof Fraction) {
		var e_fraction = get_fraction(e);
	}
	
	if (e_fraction) {
		if (e_fraction.numerator == 1 &&
			e_fraction.denominator != 1) {
			radical = true;
			r_index = e_fraction.denominator;
		}
	}

	if (!simple || e != 1) {
		wrapper = document.createElement("span");
		if (marked) {
			wrapper.addClass("highlighted");
		}
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
		if (b.groups != null &&
			b.groups.length > 1) {
			base.addClass("parentheses");
		}
		if ((b instanceof AlgebraGroup ||
			b instanceof ConstantGroup) &&
			(b.coefficient.toNumber() != 1 ||
			/[a-zA-Z]\^(?:\d{2,}|[2-9])/i.test(b.toString()))) {
			base.addClass("parentheses");
		}
		if (b instanceof ExponentGroup) {
			base.addClass("parentheses");
		}
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

	// Radical
	if (radical) {
		wrapper.removeClass("exponent-wrapper");
		wrapper.addClass("radical-wrapper");

		if (r_index != 2) {
			// Index value
			var index = document.createElement("div");
			index.addClass("index");
			index.appendTextNode(r_index);
			wrapper.appendChild(index);
		}

		// Radicand
		var radicand = document.createElement("div");
		radicand.addClass("radicand");
		radicand.appendChild(base);
		wrapper.appendChild(radicand);

		// Radical
		var radical_elem = document.createElement(
			"span");
		radical_elem.addClass("radical");
		radicand.appendChild(radical_elem);

		return wrapper;
	}

	base.addClass("base");
	wrapper.appendChild(base);

	// Exponent
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

	if (typeof n !== 'object' &&
		typeof d !== 'object' && d != 1) {
		// The fraction preference affected the output
		config_used.preferences.fraction = true;
	}

	if (!Config.preferences.fraction &&
		typeof n !== 'object' &&
		typeof d !== 'object') {
		var numerator = fraction;
		n = +n / +d;
		d = 1;
	} else if (!Config.preferences.fraction &&
		n instanceof Fraction && d instanceof Fraction &&
		n.denominator == 1 && d.denominator == 1) {
		var numerator = fraction;
		n = n.numerator / d.numerator;
		d = 1;
	} else if (simple && d == 1) {
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
		var denominator = document.createElement("span");
		denominator.addClass("denominator");
		if (typeof d !== 'object') {
			denominator.addClass("number");
			if (d < 0) {
				denominator.addClass("negative");
			}
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