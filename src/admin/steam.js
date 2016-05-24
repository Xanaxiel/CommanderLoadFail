"use strict"; // Required by Node for ES6

// -- Node Modules -----------------------------------------------------------------------------------------------------

const request  = require("request");

// -- Local Variables --------------------------------------------------------------------------------------------------

const Command = require(__dirname + "/../command.js");

// -- Steam Command ---------------------------------------------------------------------------------------------------

class Steam extends Command {

	constructor() {
		super("Steam");
		this.description = "Enable/Disable Steam news feed. (Leave empty to toggle.)";
		this.usage       = "<enable/disable>";
		this.queue       = [];
		setInterval(this.poll.bind(this), 300000); // poll once per 5 minutes
	}

	execute(message) {

        let params = this.getParams(message);
        let toggle = global.bot.config.newsEnabled;

        if (params[0] != "enable" && params[0] != "disable") toggle = !toggle;
        else if (params[0] === "enable") toggle = true;
		else if (params[0] === "disable") toggle = false;

		console.log(`[Steam] Steam news set to "${toggle}".`)
		global.bot.client.sendMessage(message, `Steam news set to "${toggle}".`);
		return this.poll();

	}

	poll() {

		// save newest id
		global.bot.saveConfigFile();

		// send any messages in the queue
		if (this.queue.length) this.sendQueue();

		// check to make sure news is enabled
		if (!global.bot.config.steamEnabled) return;

		// check for news updates and add them to the next queue
		request({
			"method" : "GET",
			"url" : "http://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=372000&count=10&format=json",
			"json" : true
		}, (error, response, body) => {
			if (error) console.log("[News]", error);
			else if (body) {
				for (let item of body.appnews.newsitems) {
					if (item.gid === global.bot.config.steamLatest) break; // only queue new news
					this.queue.push(`**${item.title}**:\n${item.url}`);
				}
				global.bot.config.steamLatest = body.appnews.newsitems[0].gid; // store the latest id
			}
		});

	}

	sendQueue() {
		console.log(`[Steam] Sending ${this.queue.length} new messages.`);
		while (this.queue.length) {
			let message = this.queue.shift();
			global.bot.client.sendMessage(global.bot.config.updateChannel, message);
		}
	}

}

// -- Export Variables -------------------------------------------------------------------------------------------------

module.exports = Steam;
