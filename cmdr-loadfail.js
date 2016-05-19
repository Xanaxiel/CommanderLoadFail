"use strict"; // Required by Node for ES6

// -- Node Modules -----------------------------------------------------------------------------------------------------

const Client           = require("discord.js").Client;
const requireDirectory = require("require-directory");

// -- Local Variables --------------------------------------------------------------------------------------------------

//const version = require(__dirname + "/src/version.js");
const config  = require(__dirname + "/config.json");

var client   = new Client({ "maxCachedMessages" : 200, "revive" : true });
var admin    = requireDirectory(module, __dirname + "/src/admin", { visit : cmd => new cmd() });
var commands = requireDirectory(module, __dirname + "/src/commands", { visit : cmd => new cmd() });

// -- Initialization ---------------------------------------------------------------------------------------------------

client.once("ready", () => {
	console.log("[Ready] Commander loaded and ready to fail!");
});

// -- Command Parsers --------------------------------------------------------------------------------------------------

client.on("message", message => {

	if (message.author.equals(client.user)) return; // Prevents bot from gaining sentience

	if (message.content.indexOf(config.commandPrefix) === 0) {

		let cmd = message.content.substr(config.commandPrefix.length).split(" ")[0].toLowerCase();

		if (message.author.equals(message.channel.server.owner)) {
			for (let i in admin) {
				let command = admin[i];
				if (command.name.toLowerCase() === cmd) return command.execute(message);
				if (command.aliases.toString().toLowerCase().indexOf(cmd) !== -1) return command.execute(message);
			}
		}

		for (let i in commands) {
			let command = commands[i];
			if (command.name.toLowerCase() === cmd) return command.execute(message);
			if (command.aliases.toString().toLowerCase().indexOf(cmd) !== -1) return command.execute(message);
		}

	}

});

// -- Program Entry Point (Login) --------------------------------------------------------------------------------------

config.token ? client.loginWithToken(config.token) : client.login(config.email, config.password);

// -- Global Variables -------------------------------------------------------------------------------------------------

global.bot = { // Kids, don't ever do this... It's usually a bad idea.
	//version,
	config,
	client,
	admin,
	commands
}
