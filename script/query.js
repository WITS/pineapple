function handle_query(f, e) {
	if (e != null) {
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

	// Return to the homepage?
	if (!text.length) {
		// document.body.addClass("homepage");
		return;
	} else {
		// document.body.removeClass("homepage");
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

	result = new RegExp("(?:find|(?:find )?where" +
		"(?: does| is)? )([a-z])\\s?(?:=|is)?\\s?(-?" +
		FLOAT_NUM_REGEX + ")(?: for| in | when| where)?",
		"i").exec(text);
	if (result == null) {
		result = new RegExp("(?:find|(?:find )?where|,\\s?)" +
			"([a-z])\\s?(?:=|is)?\\s?(-?" +
			FLOAT_NUM_REGEX + ")",
			"i").exec(text);
	}
	if (result != null) {
		equation_text = text.replace(result[0], "");
		equation_text = equation_text.replace(
			/^\s*(?:for|in|when|where)/i, "");
		query_info.type = "solve-for";
		query_info.variable = result[1];
		query_info.value = +result[2];
	}

	if (result == null) {
		result = new RegExp("\\bfactors?\\b(?: of)?" +
			"(?: ([a-z])(?!\\s?[=+*/^-])\\s?" +
			"(?:for|in|when|where)?)?",
			"i").exec(text);
		if (result != null) {
			// console.log(result);
			equation_text = text.replace(result[0], "");
			query_info.type = "factor";
			query_info.variable = result[1];
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
		post_input.push("where ");
		post_input.push("_" + query_info.variable);
		post_input.push("=");
		post_input.push("_" + query_info.value);
	}

	if (query_info.type == "factor") {
		pre_input.push("factor");
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
	console.log(equation);

	// Additional work
	if (equation.all_vars.length == 2) {
		if (query_info.type == "solve-for") {
			console.log(query_info);
			// Put in the first variable where appropriate
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
			// What degree is the equation now?
			if (v_info.max_degree == 1) {
				equation.isolate(query_info.other);
			}
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

	// Add expanding hint
	if (modules.length) {
		var hint = document.createElement("div");
		hint.addClass("hint");
		input_card.appendChild(hint);

		var icon = document.createElement("i");
		icon.addClass("fa fa-chevron-down");
		hint.appendChild(icon);

		hint.appendChild(document.createTextNode(
			(IS_MOBILE ? "Tap" : "Click") +
			" below to see each step"));
	}

	// Modules
	for (var x = 0, y = modules.length; x < y; ++ x) {
		output.appendChild(modules[x].element());
	}

	// Result
	output.appendChild((new Card({
		label: "Result",
		color: "skin",
		children: equation.element()
	})).element());

	// Suggestions
	var suggestions = new Array();

	if (v_info.min_degree >= 1 &&
		query_info.type != "solve-for") {
		suggestions.push({
			title: "Find where " + equation[
				v_info.min_side + "_vars"][0] + " = 0",
			icon: "search-plus",
			query: equation_text + " where " + equation[
				v_info.min_side + "_vars"][0] + " = 0"
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

	var output_element = document.getElementById("output");
	output_element.empty();
	output_element.appendChild(output);

	// Clear the modules array so that the
	// garbage collector can remove module objects
	modules.splice(0);
}

function handle_query_suggestion() {
	handle_query(this.getAttribute("data-query"));
}

// Homepage Styling
window.addEventListener("load", function() {
	if (IS_MOBILE) {
		document.body.addClass("mobile");	
	}
	// document.body.addClass("homepage");
});