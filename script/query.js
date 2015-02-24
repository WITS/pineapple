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
	var equation = new EquationRender({
		text: text
	});

	output.appendChild((new Card({
		label: "Input",
		joined: "bottom",
		color: "leaf",
		children: equation.element()
	})).element());

	// Modules
	for (var x = 0, y = modules.length; x < y; ++ x) {
		output.appendChild(modules[x].element());
	}

	// Solution
	var solution = new SolutionRender({
		value: equation.group.value
	});

	output.appendChild((new Card({
		label: "Solution",
		color: "skin",
		children: solution.element()
	})).element());
}

// Homepage Styling
window.addEventListener("load", function() {
	if (IS_MOBILE) {
		document.body.addClass("mobile");	
	}
	// document.body.addClass("homepage");
});