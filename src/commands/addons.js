"use strict"; // Required by Node for ES6

// -- Node Modules -----------------------------------------------------------------------------------------------------

const duration = require("humanize-duration");

// -- Local Variables --------------------------------------------------------------------------------------------------

const Command = require(__dirname + "/../command.js");

// -- Addons Command -----------------------------------------------------------------------------------------------------

class Addons extends Command {

    constructor() {
        super("Addons");
        this.description = "Returns a list of all the currently tracked repos.";
    }

    execute(message) {

    	let links = ["Currently tracking these repos:"];
    	for (let subscription of global.bot.config.githubSubscriptions) {
    		links.push(`- _https://github.com/${subscription.repo}_`);
    	}

    	return global.bot.client.sendMessage(message, links);

    }

}

// -- Export Variables -------------------------------------------------------------------------------------------------

module.exports = Addons;
