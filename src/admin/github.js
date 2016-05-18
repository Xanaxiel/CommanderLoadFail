"use strict"; // Required by Node for ES6

// -- Node Modules -----------------------------------------------------------------------------------------------------

const jsonFile = require("jsonfile");
const request  = require("superagent");

// -- Local Variables --------------------------------------------------------------------------------------------------

const Command = require(__dirname + "/../command.js");

// -- Github Command ---------------------------------------------------------------------------------------------------

class Github extends Command {

	constructor() {
		super("Github");
		this.description   = "Add/Remove repos in the Github updates feed.";
		this.usage         = "<add/remove> <channel> <link>";
		this.subscriptions = jsonFile.readFileSync(__dirname + "/../../subscriptions.json");
		this.queue         = [];
		setInterval(this.poll.bind(this), 60000); // poll once per minute
	}

	execute(message) {
		return;
	}

	poll() {

		// save newest etags
		jsonFile.writeFileSync(__dirname + "/../../subscriptions.json", this.subscriptions, { "spaces" : 2 });

		// send any messages in the queue
		if (this.queue.length) this.sendQueue();

		// check for repo changes and add them to the next queue
		for (let subscription of this.subscriptions) {
			request.get(`https://api.github.com/repos/${subscription.repo}/events`)
			.set("If-None-Match", subscription.etag)
			.end((error, response) => {
				if (error) this.pollFail(error);
				else this.pollSuccess(subscription, response);
			});
		}

	}

	sendQueue() {
		console.log(`[Github] Sending ${this.queue.length} new messages.`);
		while (this.queue.length) {
			let message = this.queue.shift();
			global.bot.client.sendMessage(message.channel, message.content);
		}
	}

	createMessage(event) {
		switch (event.type) {
			case "PushEvent":
				return templates.push(event);
				break;
			case "PullRequestEvent":
				if (event.payload.action === "opened") return templates.pullRequest(event);
				break;
			/*case "IssuesEvent":
				if (event.payload.action === "opened") return templates.issue(event);
				break;*/
		}
		return false;
	}

	pollFail(error) {
		if (error.status === 304) return; // no new events
		else console.log("[Github]", error); // actual error
	}

	pollSuccess(subscription, response) {
		if (!response.header.etag) return console.log(`[Github] No ETag header found for "${subscription.repo}"!`);
		for (let event of response.body) {
			let content = this.createMessage(event);
			if (content) {
				this.queue.push({
					"channel" : subscription.channel,
					"content" : content
				});
			}
		}
		subscription.etag = response.header.etag;
	}

}

// -- Event Templates --------------------------------------------------------------------------------------------------

const templates = {
	push : function(event) {
		let repo = event.repo.name;
		let content = `**[${repo}]** - ${event.payload.size} new commit(s):`;
		for (let commit of event.payload.commits) {
			let url = `https://github.com/${repo}/commit/${commit.sha.substring(0, 7)}`;
			content += `\n*${commit.message}* — ${commit.author.name}`;
			content += `\n${url}`;
		}
		return content;
	},
	pullRequest : function(event) {
		let repo = event.repo.name;
		let user = event.payload.pull_request.user.login;
		let size = event.payload.pull_request.commits;
		let changed = event.payload.pull_request.changed_files;
		let additions = event.payload.pull_request.additions;
		let deletions = event.payload.pull_request.deletions;
		let url = `https://github.com/${repo}/pull/${event.payload.number}`;
		let content = `**[${repo}]** New pull request from ${user}:`;
		content += `\n${size} commits • ${changed} changed files • ${additions} additions • ${deletions} deletions`;
		content += `\n${url}`;
		return content;
	}
	/*issue : function(event) {
		let repo = event.repo.name;
		let user = event.payload.issue.user.login;
		let url = `https://github.com/${repo}/issues/${event.payload.issue.number}`;
		let content = `**[${repo}]** New issue opened by ${user}: *${event.payload.issue.title}*`;
		content += `\n${url}`;
		return content;
	}*/
}

// -- Export Variables -------------------------------------------------------------------------------------------------

module.exports = Github;
