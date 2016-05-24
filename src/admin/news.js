"use strict"; // Required by Node for ES6

// -- Node Modules -----------------------------------------------------------------------------------------------------

const request  = require("request");

// -- Local Variables --------------------------------------------------------------------------------------------------

const Command = require(__dirname + "/../command.js");

// -- News Command ---------------------------------------------------------------------------------------------------

class News extends Command {

	constructor() {
		super("News");
		this.description = "Enable/Disable News updates feed. (Leave empty to toggle.)";
		this.usage       = "<enable/disable>";
		setInterval(this.poll.bind(this), 300000); // poll once per 5 minutes
	}

	execute(message) {

        let params = this.getParams(message);
        let toggle = global.bot.config.newsEnabled;

        if (params[0] != "enable" && params[0] != "disable") toggle = !toggle;
        else if (params[0] === "enable") toggle = true;
		else if (params[0] === "disable") toggle = false;

		console.log(`[News] News updates set to "${toggle}".`)
		global.bot.client.sendMessage(message, `News updates set to "${toggle}".`);
		return this.poll();

	}

	poll() {

		// save newest id
		global.bot.saveConfigFile();

		// send any messages in the queue
		if (this.queue.length) this.sendQueue();

		// check to make sure news is enabled
		if (!global.bot.config.newsEnabled) return;

		// check for news updates and add them to the next queue
		request({
			"method" : "GET",
			"url" : "https://forum.treeofsavior.com/c/news.json",
			"json" : true
		}, (error, response, body) => {
			if (error) console.log("[News]", error);
			else if (body) {
				this.createQueue(body.topic_list.topics);
			}
		});

	}

	sendQueue() {
		console.log(`[Github] Sending ${this.queue.length} new messages.`);
		while (this.queue.length) {
			let message = this.queue.shift();
			global.bot.client.sendMessage(global.bot.config.updateChannel, message);
		}
	}

	createQueue(topics) {
		for (let topic of topics) {
			if (topic.id === global.bot.config.newsLatest) break; // only queue new news
			let url = `https://forum.treeofsavior.com/t/${topic.slug}/${topic.id}`;
			let content = `**${topic.title}**:`;
			content += `\n${url}`;
			this.queue.push(content);
		}
		global.bot.config.newsLatest = topics[0].id; // store the latest id
	}

}

// -- Export Variables -------------------------------------------------------------------------------------------------

module.exports = News;
