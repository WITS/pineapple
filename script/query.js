function handle_query(f, e) {
	e.preventDefault();

	var output = document.createDocumentFragment();
	var text = f.text.value.trim();

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
		"(?: does| is)? )([a-z])\\s?(?:=|is)?\\s?(" +
		FLOAT_NUM_REGEX + ")(?: for| in | when| where)?",
		"i").exec(text);
	if (result == null) {
		result = new RegExp("(?:find|(?:find )?where)" +
			"([a-z])\\s?(?:=|is)?\\s?(" +
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

	// Pre-Module
	modules.splice(0);

	// Input card
	var equation = new Equation({
		text: equation_text
	});

	output.appendChild((new Card({
		label: "Input",
		joined: "bottom",
		color: "leaf",
		children: equation.element()
	})).element());

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
			icon: "search-plus"
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
		// TODO: Link/onclick query thing
		sug_wrapper.appendChild(suggestion);
	}

	var output_element = document.getElementById("output");
	output_element.empty();
	output_element.appendChild(output);
}

// Homepage Styling
window.addEventListener("load", function() {
	if (IS_MOBILE) {
		document.body.addClass("mobile");	
	}
	// document.body.addClass("homepage");
});