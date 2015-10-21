/*
 * Query.js - interprets instructions from
 * queries and determines what actions to take
 * Copyright (C) 2015  Ian Jones
 * http://pineapple.pub/LICENSE.txt
 */

last_query = "";
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
		if (str.indexOf("NaN") != -1) {
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
		var replace_results;
		if (child_count) {
			replace_results = function() {
				output_element.empty();
				output_element.removeClass("out");
				output_element.appendChild(output);
			};
		} else {
			replace_results = function() {
				output_element.empty();
				output_element.removeClass("out");
				document.body.addClass("homepage");
			}
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
			var delay = Math.max(0.005, old_result_count - 2) * 200;
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
			console.log(elem);
			if (elem.innerHTML != "NaN") return;
			elem.innerHTML = "<i class='fa fa-square'></i>";
		});
		// Create the result card
		var error_child = document.createElement("div");
		error_child.addClass("error-result");
		error_child.appendTextNode("Sorry, something went wrong");
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

	// Pre-Processing
	var equation_text = text;
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

	result = new RegExp("^solve (.*) for ([a-z](?!\\^))",
		"i").exec(text);
	if (result == null) {
		result = new RegExp("^solve (.*([a-z]).*)",
			"i").exec(text);
	}
	if (result != null) {
		console.log(result);
		equation_text = result[1];
		query_info.type = "solve-for";
		query_info.variable = result[2];
	}
	

	if (result == null) {
		result = new RegExp("(?:find |(?:find )?whe(?:re|n)" +
		"(?: does| is)? |solve(?: for)?(?: whe(?:re|n))? )" +
		"([a-z](?!\\^))(?:\\s?(?:=|is)?\\s?(-?" +
		NEG_FRACTION_REGEX + "))?" +
		"(?: for| in| when| where)?",
		"i").exec(text);
	}
	if (result == null) {
		result = new RegExp("(?:find|(?:find )?where|,\\s?)" +
			"([a-z](?!\\^))(?:\\s?(?:=|is)?\\s?(-?" +
			NEG_FRACTION_REGEX + "))?",
			"i").exec(text);
	}
	if (query_info.type == "simplify" &&
		result != null) {
		equation_text = text.replace(result[0], "");
		equation_text = equation_text.replace(
			/^\s*(?:for|in|when|where)/i, "");
		query_info.type = "solve-for";
		query_info.variable = result[1];
		if (result[2] != null) {
			query_info.value = result[2];
		}
	}

	if (result == null) {
		result = new RegExp("\\b(?:what are the )?("+
			"(?:factor|root)s?\\b(?: of)?" +
			"(?: ([a-z])(?!\\s?[=+*/^-])\\s?" +
			"(?:for|in|when|where)?)?)",
			"i").exec(text);
		if (result != null) {
			equation_text = text.replace(result[0], "");
			query_info.type = "factor";
			query_info.phrasing = result[1];
			query_info.variable = result[2];
		}
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
			post_input.push("_" + query_info.variable);
			post_input.push("=");
			post_input.push("_" + truncate_number(
				new Fraction({
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

	if (equation.left != null) {
		var left = equation.left;
		left.simplify();
		left = equation.left = left.valueOf();
		left.parent = null;
		left.top_parent = left;
	}
	var right = equation.right;
	right.simplify();
	right = equation.right = right.valueOf();
	right.parent = null;
	right.top_parent = right;

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
	if (equation.all_vars.length) {
		if (query_info.type == "solve-for") {
			console.log(query_info);
			// Put in the first variable where appropriate
			if (query_info.value != null) {
				equation.replace(query_info.variable,
					query_info.value);
				console.log(equation);
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
			}
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
	// Factors of a constant
	if (v_info.max_degree == 0 &&
		equation.left == null &&
		query_info.type == "factor") {
		// console.log(get_factors(equation.right));
		equation.result = new BracketGroup({
			text: (get_factors(equation.right)).join(",")
		});
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

	// Suggestions
	var suggestions = new Array();

	if (v_info.max_degree == 0 &&
		equation.left == null) {
		var n = equation.right.toString();
		if (query_info.type != "factor" &&
			!/[\/.]/.test(n)) {
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

// Page load
window.addEventListener("load", function() {
	document.querySelectorAll("#homepage-text code").forEach(
		function(elem) {
			elem.setAttribute("data-query", elem.innerHTML);
			elem.addEventListener("click", handle_query_suggestion);
		});
	handle_hash_query();
});

// Hash change
window.addEventListener("hashchange", handle_hash_query);