function handle_query(f, e) {
	e.preventDefault();

	var text = f.text.value.trim();

	// Clear output
	var output = document.getElementById("output");
	output.empty();

	// Return to the homepage?
	if (!text.length) {
		// document.body.addClass("homepage");
		return;
	} else {
		// document.body.removeClass("homepage");
	}

	// Pre-Processing
	text = text.replace(/\u00D7/g, "*");
	text = text.replace(/\u00F7/g, "/");
	text = text.replace(/\u00B2/g, "^2");

	// Pre-Module
	modules.splice(0);

	// Input card
	var equation = new Equation({
		text: text
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
	console.log(equation);

	// Modules
	for (var x = 0, y = modules.length; x < y; ++ x) {
		output.appendChild(modules[x].element());
	}

	// Solution
	output.appendChild((new Card({
		label: "Solution",
		color: "skin",
		children: equation.element()
	})).element());

	// Suggestions
	var suggestions = new Array();
	if (equation.left_degree <= equation.right_degree) {
		var min_side = "left";
		var max_side = "right";
		var min_degree = equation.left_degree;
		var max_degree = equation.right_degree;
	} else {
		var min_side = "right";
		var max_side = "left";
		var min_degree = equation.right_degree;
		var max_degree = equation.left_degree;
	}

	if (min_degree >= 1) {
		suggestions.push({
			title: "Solve for " + equation[min_side +
				"_vars"][0] + " = 0",
			icon: "superscript"
		});
	}

	for (var x = 0, y = suggestions.length;
		x < y; ++ x) {
		var suggestion = document.createElement("div");
		suggestion.addClass("card white");
		suggestion.addClass("joined-top joined-bottom");
		suggestion.addClass("suggestion");
		var icon = document.createElement("i");
		icon.addClass("fa");
		icon.addClass("fa-" + suggestions[x].icon);
		suggestion.appendChild(icon);
		suggestion.appendChild(document.createTextNode(
			suggestions[x].title));
		// TODO: Link/onclick query thing
		output.appendChild(suggestion);
	}
}

// Homepage Styling
window.addEventListener("load", function() {
	if (IS_MOBILE) {
		document.body.addClass("mobile");	
	}
	// document.body.addClass("homepage");
});