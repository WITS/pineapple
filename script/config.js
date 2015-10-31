/*
 * Config.js - stores and manges user preferences
 * and memory (constants/functions)
 * Copyright (C) 2015  Ian Jones
 * http://pineapple.pub/LICENSE.txt
 */

Config = function() {
	this.preferences = {
		fraction: true,
		radical: true
	};
	this.constants = new Object();
	this.functions = new Object();
}



Config = new Config();