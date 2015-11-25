/*
 * Query.js - interprets instructions from
 * queries and determines what actions to take
 * Copyright (C) 2015  Ian Jones
 * http://pineapple.pub/LICENSE.txt
 */

last_query = "";
last_graph = null;
new_results_timeout = null;

function handle_query(f, e) {
	if (e != null) {
		if (IS_MOBILE) f.text.blur();
		e.preventDefault();
	}

	if (typeof f !== 'string') {
		var text = f.text.value.trim();
	} else {
		var text = f.trim();
		var f = document.getElementById("input-form");
		f.text.value = text;
	}

	var output = document.createDocumentFragment();

	// In case something goes wrong
	function validate_equation_string(str) {
		if (/(?:NaN|Infinity)/.test(str)) {
			return false;
		}
		if (/\/0\.?0*(?:[^0-9]|$)/.test(str)) {
			return false;
		}
		return true;
	}

	function update_results() {
		if (new_results_timeout != null) clearTimeout(new_results_timeout);
		// Animation stagger
		var children;
		if (output.children != null) {
 			children = output.children;
		} else { // Thanks, Microsoft
			children = output.childNodes;
		}
		child_count = children.length;
		for (var i = child_count; i --; ) {
			var card = children[i];
			var style_text = (0.5 + 0.2 * i).toFixed(1) + "s";
			card.style.animationDuration = style_text;
			if (IS_WEBKIT) {
				card.style.webkitAnimationDuration = style_text;
			}
			if (IS_FIREFOX) {
				card.style.mozAnimationDuration = style_text;
			}
		}

		// Swap results
		var output_element = document.getElementById("output");
		var replace_results_action;
		if (child_count) {
			replace_results_action = function() {
				output_element.appendChild(output);
			};
		} else {
			replace_results_action = function() { 
				document.body.addClass("homepage");
			}
		}
		var replace_results = function() {
			var logo = document.getElementById("logo");
			if (document.activeElement == logo) {
				logo.blur();
			}
			if (last_graph) {
				last_graph.stop();
				last_graph = null;
			}
			output_element.empty();
			output_element.removeClass("out");
			window.scrollTo(0, 0);
			if (graph) last_graph = graph;
			replace_results_action();
		}
		if (last_query == "") { // From homepage
			new_results_timeout = setTimeout(replace_results, 250);
		} else { // Animate out old results
			var old_result_count = output_element.children.length;
			output_element.addClass("out");
			for (var i = old_result_count; i --; ) {
				var card = output_element.children[i];
				var style_text = (0.2 * (old_result_count - i)).toFixed(1) + "s";
				card.style.animationDuration = style_text;
				if (IS_WEBKIT) {
					card.style.webkitAnimationDuration = style_text;
				}
				if (IS_FIREFOX) {
					card.style.mozAnimationDuration = style_text;
				}
				card.removeClass("expanded");
			}
			var delay = Math.max(0.005, Math.min(old_result_count - 2, 3)) * 200;
			new_results_timeout = setTimeout(replace_results, delay);
		}

		// Update the hash
		last_query = text;
		location.hash = "#!/" + encodeURIComponent(text);
	}

	function show_error() {
		console.log(equation);
		// Convert NaN to icon representation
		output.querySelectorAll(".card .render .number"
			).forEach(function(elem) {
			if (!/(?:NaN|Infinity)/.test(elem.innerHTML)) return;
			elem.innerHTML = "<i class='fa fa-square'></i>";
		});
		// Check whether division by zero
		var zero = (/\/0\.?0*(?:[^0-9]|$)/.test(equation.toString()));
		// Create the result card
		var error_child = document.createElement("div");
		error_child.addClass("error-result");
		if (!zero) { // Who knows?
			error_child.appendTextNode("Sorry, something went wrong");
		} else { // Seriously? Dividing by zero? Amateur.
			error_child.appendTextNode("Division by zero");
		}
		output.appendChild((new Card({
			label: "Result",
			color: "skin",
			children: error_child
		})).element());
		// Show the error to the user
		update_results();
	}

	// Return to the homepage?
	if (!text.length) {
		update_results();
		return;
	} else {
		document.body.removeClass("homepage");
	}

	// Pre-Module
	config_used = new ConfigUsed();

	// Pre-Processing
	var equation_text = text;
	text = text.replace(/^(?:what(?:'?s)?\s+(?:is|are)(?:\s+the)?)/, "")
	text = text.replace(/\u00D7/g, "*");
	text = text.replace(/\u00F7/g, "/");
	text = text.replace(/\u00B2/g, "^2");
	text = text.replace(/\?/g, "");
	text = text.replace(/\s{2,}/g, " ");
	equation_text = text;

	// What are we showing?
	var query_info = new Object();
	query_info.type = "simplify";
	var result;

	// Simplifying (a bit redundant, because this is the default)
	if (test_query(text, "simplify EQTN")) {
		result = true;
		equation_text = last_query_vars[0];
	}

	// Solving for a variable
	if (!result && (test_query(text, "solve EQTN for FACTOR") ||
		test_query(text, "EQTN solve for? FACTOR") ||
		test_query(text, "solve EQTN"))) {
		query_info.variable = last_query_vars[1] || null;
		if (!is_algebra(last_query_vars[1])) query_info.variable = null;
		if (query_info.variable == null) {
			var v = last_query_vars[0].match(/[a-zA-Z]/);
			if (v != null) query_info.variable = v[0];
		}
		if (query_info.variable != null) {
			result = true;
			query_info.type = "solve-for";
			equation_text = last_query_vars[0];
		}
	} else if (!result &&
		test_query(text, "solve for? FACTOR in|when|where EQTN")) {
		query_info.variable = last_query_vars[0] || null;
		if (!is_algebra(last_query_vars[0])) query_info.variable = null;
		if (query_info.variable == null) {
			var v = last_query_vars[1].match(/[a-zA-Z]/);
			if (v != null) query_info.variable = v[0];
		}
		if (query_info.variable != null) {
			result = true;
			query_info.type = "solve-for";
			equation_text = last_query_vars[1];
		}
	}

	// Replacing factors
	if (!result) {
		if (test_query(text, "EQTN where|when FACTOR equals EXPR") ||
			test_query(text, "EQTN replace FACTOR with EXPR")) {
			console.log("SUCCESS: EQTN where|when FACTOR equals EXPR");
			console.log(last_query_vars);
			equation_text = last_query_vars[0];
			query_info.type = "solve-for";
			query_info.variable = last_query_vars[1];
			query_info.value = last_query_vars[2];
			result = true;
		} else if (test_query(text, "replace FACTOR with EXPR in|when|where EQTN")) { 
			console.log("SUCCESS: replace FACTOR with EXPR in|when|where EQTN");
			console.log(last_query_vars);
			equation_text = last_query_vars[2];
			query_info.type = "solve-for";
			query_info.variable = last_query_vars[0];
			query_info.value = last_query_vars[1];
			result = true;
		}
	}

	// Factoring
	if (!result && test_query(text, "what? is? find? the? factor|root of? EXPR")) {
		console.log("SUCCESS: factor|root of? EXPR");
		console.log(last_query_vars);
		if (last_query_vars.length) equation_text = last_query_vars[0];
		query_info.type = "factor";
		query_info.phrasing = "factor";
		query_info.variable = null;
	}

	// Graphing
	if (!result && test_query(text, "what? is? the? graph of? EQTN")) {
		console.log("SUCCESS: what? is? the? graph of? EQTN");
		console.log(last_query_vars);
		equation_text = last_query_vars[0];
		query_info.type = "graph";
	}

	// Pre-Module
	modules.splice(0);

	// Input card
	var equation = new Equation({
		text: equation_text
	});

	var input_children = new Array();
	var pre_input = new Array();
	var post_input = new Array();

	if (query_info.type == "solve-for") {
		if (query_info.value != null) {
			post_input.push("where ");
			post_input.push("_" + truncate_number(
				new ExpressionGroup({
					text: query_info.variable
				})));
			post_input.push("=");
			post_input.push("_" + truncate_number(
				new ExpressionGroup({
					text: query_info.value
				})
			));
		} else {
			pre_input.push("solve");
			post_input.push("for ");
			post_input.push("_" + query_info.variable);
		}
	}

	if (query_info.type == "factor") {
		pre_input.push(
			query_info.phrasing.toLowerCase());
	}

	if (query_info.type == "graph") {
		pre_input.push("graph");
	}

	if (pre_input.length) {
		var query_info_elem =
			document.createElement("span");
		query_info_elem.addClass("query-info");
		input_children.push(query_info_elem);
		for (var x = 0, y = pre_input.length; x < y;
			++ x) {
			if (pre_input[x][0] == "_") {
				var child = document.createElement(
					"em");
				em.innerHTML = pre_input[x].substr(1);
			} else {
				var child = document.createTextNode(
					pre_input[x]);
			}
			query_info_elem.appendChild(child);
		}
	}

	input_children.push(equation.element());

	if (post_input.length) {
		var query_info_elem =
			document.createElement("span");
		query_info_elem.addClass("query-info");
		input_children.push(query_info_elem);
		for (var x = 0, y = post_input.length; x < y;
			++ x) {
			if (post_input[x][0] == "_") {
				var child = document.createElement(
					"span");
				child.addClass("emphasis");
				child.innerHTML = post_input[x].substr(1);
			} else if (post_input[x] == "=") {
				var child = document.createElement(
					"span");
				child.addClass("equals");
				child.innerHTML = "=";
			}
			else {
				var child = document.createTextNode(
					post_input[x]);
			}
			query_info_elem.appendChild(child);
		}
	}

	var input_card = (new Card({
		label: "Input",
		joined: "bottom",
		color: "leaf",
		children: input_children
	})).element();

	output.appendChild(input_card);

	{
		var equation_str = equation.toString();
		console.log(equation_str);
		if (!validate_equation_string(equation_str)) {
			// ABORT! SOMETHING DUN GOOFED
			show_error();
			return false;
		}
	}

	equation.simplify();

	equation.updateVarInfo();
	var v_info = equation.getVarInfo();
	// console.log(equation);
	{
		var equation_str = equation.toString();
		console.log(equation_str);
		if (!validate_equation_string(equation_str)) {
			// ABORT! SOMETHING DUN GOOFED
			show_error();
			return false;
		}
	}

	// Additional work
	if (true /*equation.all_vars.length*/) {
		if (query_info.type == "solve-for") {
			query_info.variable = query_info.variable.replace(
				/pi/g, "\u03C0");
			console.log(query_info);
			// Put in the first variable where appropriate
			if (query_info.value != null) {
				equation.replace(query_info.variable,
					query_info.value);
				// console.log(equation);
				// Simplify again
				if (equation.left) {
					equation.left.simplify();
					equation.left = equation.left.valueOf();
				}
				equation.right.simplify();
				equation.right = equation.right.valueOf();
				// What's the other variable?
				query_info.other = equation.all_vars[1 -
					equation.all_vars.indexOf(
					query_info.variable)];
				// Update variable info
				equation.updateVarInfo();
				v_info = equation.getVarInfo();
			} else {
				query_info.other = query_info.variable;
				// What degree is the equation now?
				if (v_info.max_degree == 1) {
					if (modules.length) {
						// Output reference visual
						push_module_step({
							type: "reference",
							visual: equation.element()
						});
					}
					equation.isolate(query_info.other);
				} else if (v_info.max_degree == 2) {
					equation.factor(query_info.other,
						true);
				}
			}
		}
	}

	{
		var equation_str = equation.toString();
		console.log(equation_str);
		if (!validate_equation_string(equation_str)) {
			// ABORT! SOMETHING DUN GOOFED
			show_error();
			return false;
		}
	}

	// Factors of a constant
	if (v_info.max_degree == 0 &&
		equation.left == null &&
		query_info.type == "factor") {
		var e_str = equation.right.toString();
		if (/^\(*\d+\)*$/.test(e_str)) {
			equation.result = new BracketGroup({
				text: (get_factors(equation.right)).join(",")
			});
		} else {
			var error = "a fraction";
			if (e_str.indexOf(".") !== -1) error = "a decimal";
			if (/[e\u03C0]/.test(e_str)) error = "an irrational number";
			equation.result = new ResultText({
				text: "Cannot factor " + error,
				icon: "exclamation-triangle"
			});
		}
	}
	// TEMP: Limit the degree to 2 for factoring
	if (v_info.max_degree == 2) {
		if (query_info.type == "factor") {
			if (query_info.variable == null) {
				if (equation.left_degree ==
					v_info.max_degree) {
					query_info.variable =
						equation.left_vars[0];
				} else {
					query_info.variable =
						equation.right_vars[0];
				}
			}
			console.log(query_info);
			// Factor
			equation.factor(query_info.variable);
			// Update variable info
			equation.updateVarInfo();
			v_info = equation.getVarInfo();
		}
	}

	// Graphing
	var graph;
	if (query_info.type == "graph") {
		var e_str = equation.toString();
		console.log(e_str);
		var i_var = ""; // Independent variable
		if (equation.left_degree && equation.right_degree) {
			// Make sure the equation is solved for one var
			if (equation.all_vars.length == 1) {
				// Same var on both sides? Das bad
				show_error();
				return;
			} else if (/^1[a-df-hj-zA-Z]\^1=(.*)$/.test(e_str)) {
				i_var = equation.right_vars[0];
				e_str = e_str.replace(/^1[a-df-hj-zA-Z]\^1=(.*)$/, "$1");
			} else if (/^(.*)=1[a-df-hj-zA-Z]\^1$/.test(e_str)) {
				i_var = equation.left_vars[0];
				e_str = e_str.replace(/^(.*)=1[a-df-hj-zA-Z]\^1$/, "$1");
			} else {
				// Uh-oh
				show_error();
				return;
			}
		} else if (equation.all_vars.length == 1) {
			if (equation.left != null) {
				if (/^1[a-df-hj-zA-Z]\^1=(.*)$/.test(e_str)) {
					e_str = e_str.replace(/^1[a-df-hj-zA-Z]\^1=(.*)$/, "$1");
				} else if (/^(.*)=1[a-df-hj-zA-Z]\^1$/.test(e_str)) {
					e_str = e_str.replace(/^(.*)=1[a-df-hj-zA-Z]\^1$/, "$1");
				} else {
					// Uh-oh
					show_error();
					return;
				}
			} else {
				i_var = equation.all_vars[0];
			}
		}
		console.log("We're good to graph " + e_str + " for " + i_var);
		graph = new CartesianGraph({
			equation: e_str,
			independent: i_var
		});
	}

	// Add expanding hint
	// TODO: Add expanding hint modal
	if (false /*modules.length*/) {
		var hint = document.createElement("div");
		hint.addClass("hint");
		input_card.appendChild(hint);

		var icon = document.createElement("i");
		icon.addClass("fa fa-angle-down");
		hint.appendChild(icon);

		hint.appendChild(document.createTextNode(
			(IS_MOBILE ? "Tap" : "Click") +
			" below to see each step"));
	}

	// Modules
	for (var x = 0, y = modules.length; x < y; ++ x) {
		if (x == y - 1 && modules[x].type == "reference") continue;
		output.appendChild(modules[x].element());
	}

	// Result
	var result_elem = equation.result.element();
	result_elem.addClass("render");
	output.appendChild((new Card({
		label: "Result",
		color: "skin",
		children: result_elem
	})).element());

	// Configuration
	output.appendChild(config_used.element());

	// Graph
	if (graph) {
		var graph_card = new Card({
			label: "Graph",
			color: "grey"
		});
		var elem = graph_card.element();
		elem.addClass("render graph");
		elem.appendChild(graph.element);
		output.appendChild(elem);
		graph.render();
	}

	// Suggestions
	var suggestions = new Array();

	if (v_info.max_degree == 0 &&
		equation.left == null) {
		var n = equation.right.toString();
		if (query_info.type != "factor" &&
			/^\(*\d+\)*$/.test(n)) {
			suggestions.push({
				title: "Find the factors of " + n,
				icon: "search-plus",
				query: "factors of " + n
			});
		}
	} else if (v_info.max_degree >= 1 &&
		query_info.type != "solve-for") {
		var v = equation[
			v_info.max_side + "_vars"][0];
		suggestions.push({
			title: "Solve for " + v,
			icon: "search-plus",
			query: "solve " + equation_text +
				" for " + v
		});
		suggestions.push({
			title: "Find where " + v + " = 0",
			icon: "search-plus",
			query: equation_text + " where " +
				v + " = 0"
		});
	}

	if (suggestions.length) {
		var sug_wrapper = document.createElement("ul");
		sug_wrapper.addClass("suggestions");
		sug_wrapper.addClass("card white no-padding");
		sug_wrapper.setAttribute("data-label",
			"Try " + (suggestions.length == 1 ? "this" :
				"one of these"));
		output.appendChild(sug_wrapper);
	}
	for (var x = 0, y = suggestions.length;
		x < y; ++ x) {
		var suggestion = document.createElement("li");
		suggestion.addClass("suggestion");
		var icon = document.createElement("i");
		icon.addClass("fa");
		icon.addClass("fa-" + suggestions[x].icon);
		suggestion.appendChild(icon);
		suggestion.appendChild(document.createTextNode(
			suggestions[x].title));
		suggestion.setAttribute("data-query",
			suggestions[x].query);
		suggestion.addEventListener("click",
			handle_query_suggestion);
		sug_wrapper.appendChild(suggestion);
	}

	update_results();

	// Clear the modules array so that the
	// garbage collector can remove module objects
	modules.splice(0);
}

function handle_query_suggestion() {
	handle_query(this.getAttribute("data-query"));
}

function handle_hash_query() {
	var hash = location.hash;
	// Fix Firefox's inconsistent hash behavior
	if (hash.indexOf("%") === -1) {
		hash = hash.substr(0, 3) + encodeURIComponent(hash.substr(3));
	}
	var query = /^#\!\/([a-zA-Z0-9%*\/+\-!=()<>\[\].]+)$/.exec(hash);
	if (query == null) { // Invalid location
		// Return to homepage
		handle_query("");
	} else {
		var query_text = decodeURIComponent(query[1]);
		if (last_query != query_text) {
			handle_query(query_text);
		}
	}
}

// Keywords (Used for breaking up queries)
KEYWORDS_STR = "simplify where when solve for with replace equals? "+
	"is in factors? roots? of ; are the find graph";
KEYWORDS_REGEX = "\\b(" + KEYWORDS_STR.split(" ").join("|") + ")\\b";
QUERY_FN_REGEX = "\\b(" + KEYWORDS_STR.split(" ").join("|") + "|FACTOR|EXPR)\\b";

// Splits a query on keywords and removed unnecessary spaces
function split_query(text) {
	var regex = new RegExp(KEYWORDS_REGEX, "gi");
	var result = text.split(regex);
	for (var i = result.length; i --; ) {
		// Get rid of spaces before/after the item
		result[i] = result[i].trim();
		if (regex.test(result[i])) result[i] = result[i].toLowerCase();
		// If the item is not blank, skip to the next one
		if (result[i]) continue;
		result.splice(i, 1);
	}
	return result;
}

// Tests to make sure a string is an equation
function is_equation(str) {
	if (!str.length) return false;
	if ((new RegExp(KEYWORDS_REGEX, "gi")).test()) return false;
	return true;
}

// Tests to make sure a string is an expression
// (Really just makes sure it's not keywords)
function is_expression(str) {
	if (!is_equation(str)) return false;
	// TODO: Test for characters that are not allowed in expressions
	if (/=/.test(str)) return false;
	return true;
}

// Tests to make sure a string is a valid factor
function is_factor(str) {
	return new RegExp("^(?:-1|" + FLOAT_NUM_REGEX + "|" +
		"1\\/" + FLOAT_NUM_REGEX + "|(?:" + NEG_FRACTION_REGEX +
		")?(?:[a-z\u03C0]|pi)(?:\\^-?\\d+)?|\\(?" + NEG_FRACTION_REGEX +
		"\\)?\\^\\(?1\\/\\d+\\)?)$", "gi").test(str);
}

// Tests to make sure a string is explicitly an AlgebraGroup
function is_algebra(str) {
	return new RegExp("^(?:" + NEG_FRACTION_REGEX +
		")?[a-z](?:\\^-?\\d+)?$", "i").test(str);
}

function test_query(str, query) {
	var keyword_regex = new RegExp(KEYWORDS_REGEX, "gi");
	var query_regex = new RegExp(QUERY_FN_REGEX, "gi");
	// Get all the parts and sanitize them
	var safe_str = str;
	var original_parts = safe_str.split(query_regex);
	var parts = original_parts.slice();
	for (var i = parts.length; i --; ) {
		// Get rid of spaces before/after the item
		original_parts[i] = parts[i] = parts[i].trim();
		if (keyword_regex.test(parts[i].replace(/\?$/, ""))) {
			parts[i] = parts[i].toLowerCase();
			if (/(?:factor|root)s/.test(parts[i])) {
				parts[i] = parts[i].substr(0, parts[i].length - 1);
			}
		} else if (is_factor(parts[i])) {
			parts[i] = "FACTOR";
		} else if (is_expression(parts[i])) {
			parts[i] = "EXPR";
		} else if (is_equation(parts[i])) {
			parts[i] = "EQTN";
		} else if (parts[i] != "=" && parts[i].length) {
			parts[i] = "UNKNOWN";
		}
		// If the item is not blank, skip to the next one
		if (parts[i]) continue;
		parts.splice(i, 1);
		original_parts.splice(i, 1);
	}
	// Test query
	// console.log("Tested. " + parts.join(" "));
	var query_parts = query.split(" ");
	var variable_parts = new Array();
	for (var x = 0, y = query_parts.length; x < y; ++ x) {
		// Can't possibly match
		if (parts[x] == null) return false;
		// Clean up optional queries
		var query_part = query_parts[x];
		var optional = query_part.substr(-1) == "?";
		if (optional) query_part = query_part.replace(/\?$/, "");
		// Perfect match
		if (parts[x] == query_part) {
			if (/(?:EQTN|EXPR|FACTOR)/.test(parts[x])) {
				variable_parts.push(original_parts[x]);
			}
			continue;
		}
		// Near matches (variable text)
		if (query_part == "EQTN" &&
			(["EXPR", "FACTOR"].indexOf(parts[x]) != -1)) {
			variable_parts.push(original_parts[x]);
			continue;
		}
		if (query_part == "EXPR" && parts[x] == "FACTOR") {
			variable_parts.push(original_parts[x]);
			continue;
		}
		// Near matches (multiple allowed keywords)
		if (query_part.split("|").indexOf(parts[x]) != -1) {
			continue;
		}
		if (query_part == "equals" && /(?:equals?|is)/.test(parts[x])) {
			continue;
		}
		// Near matches (equals/is)
		if (["FACTOR", "EXPR"].indexOf(query_parts[x]) != -1 &&
			query_parts[x + 1] == "equals" && parts[x] == "EQTN") {
			parts = parts.slice(0, x).concat(
				["EXPR", "equals", "EXPR"].concat(parts.slice(x + 1)));
			var original_str = original_parts[x];
			var equals_index = original_str.indexOf("=");
			original_parts = parts.slice(0, x).concat(
				[original_str.substr(0, equals_index).trim(), "equals", 
				original_str.substr(equals_index + 1).trim()
				].concat(parts.slice(x + 1)));
			variable_parts.push(original_parts[x]);
			if (is_factor(original_parts[x]) ||
				(query_parts[x] == "EXPR" &&
				is_expression(original_parts[x]))) continue;
		}
		// Optional
		if (query_parts[x].substr(-1) == "?") {
			parts = parts.slice(0, x).concat(
				[null].concat(parts.slice(x)));
			original_parts = original_parts.slice(0, x).concat(
				[null].concat(original_parts.slice(x)));
			continue;
		}
		return false;
	}
	last_query_vars = variable_parts.slice();
	return variable_parts;
}

last_query_vars = null;

// Page load
window.addEventListener("load", function() {
	document.querySelectorAll("#homepage-text code").forEach(
		function(elem) {
			elem.addEventListener("click", function() {
				if (last_query != "") return false;
				handle_query(this.getAttribute("data-query"));
			});
		});
	Config.loadLocalStorage();
	handle_hash_query();
	if (last_query == "") document.getElementById("input").focus();
});

// Hash change
window.addEventListener("hashchange", handle_hash_query);