"use strict"; // Required by Node for ES6

// -- Node Modules -----------------------------------------------------------------------------------------------------

const jsonFile = require("jsonfile");
const request  = require("request");

// -- Local Variables --------------------------------------------------------------------------------------------------

const Command = require(__dirname + "/../command.js");

jsonFile.spaces = 2;

// -- Github Command ---------------------------------------------------------------------------------------------------

class Github extends Command {

	constructor() {
		super("Github");
		this.description   = "Add/Remove repos in the Github updates feed.";
		this.usage         = "<add/remove> <channel> <link>";
		this.subscriptions = jsonFile.readFileSync(__dirname + "/../../subscriptions.json");
		this.queue         = [];
		setInterval(this.poll.bind(this), 60000); // poll once per minute
		this.poll(); // create initial queue
	}

	execute(message) {
		return global.bot.client.sendMessage(message, "Test.");
	}

	poll() {

		// save newest etags & ids
		jsonFile.writeFileSync(__dirname + "/../../subscriptions.json", this.subscriptions);

		// send any messages in the queue
		if (this.queue.length) this.sendQueue();

		// check for repo changes and add them to the next queue
		for (let subscription of this.subscriptions) {
			request({
				"method" : "GET",
				"url" : `https://api.github.com/repos/${subscription.repo}/events`,
				"json" : true,
				"headers" : {
					"Accept" : "application/vnd.github.v3+json",
					"If-None-Match" : subscription.etag,
					"User-Agent" : "Cmdr. LoadFail"
				}
			}, (error, response, body) => {
				if (error) console.log("[Github]", error);
				else if (response.statusCode === 304) return; // github responded with no changes
				else if (body) { // request() response contains some json... probably has changes
					if (response.headers.etag) subscription.etag = response.headers.etag;
					else console.log(`[Github] No ETag header found for "${subscription.repo}"!`);
					this.createQueue(subscription, body);
				}
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

	createQueue(subscription, events) {
		for (let event of events) {
			if (event.id === subscription.latest) break; // only queue new changes
			if (event.type === "PullRequestEvent" && event.payload.action === "opened") {
				this.queue.push({
					"channel" : subscription.channel,
					"content" : templates.pullRequest(event)
				});
			}
			else if (event.type === "PushEvent") {
				this.queue.push({
					"channel" : subscription.channel,
					"content" : templates.push(event)
				});
			}
		}
		subscription.latest = events[0].id; // store the latest id
	}

}

// -- Event Templates --------------------------------------------------------------------------------------------------

const templates = {
	push : function(event) {
		let repo = event.repo.name;
		let content = `**[${repo}]** - ${event.payload.size} new commit(s):`;
		for (let commit of event.payload.commits) {
			let url = `https://github.com/${repo}/commit/${commit.sha.substring(0, 7)}`;
			content += `\n${url}`;
			content += "\n```";
			content += `\n${commit.message} — ${commit.author.name}`;
			content += "\n```";
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
		content += `\n${url}`;
		content += "\n```";
		content += `\n${size} commits • ${changed} changed files • ${additions} additions • ${deletions} deletions`;
		content += "\n```";
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
