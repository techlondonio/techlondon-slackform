var request        = require('request'),
    Q              = require('q');
const all_channels = require('./channels.js');

function invite (channel, email, token, channels) {
	var d = Q.defer();

	request({
		url: 'https://' + channel + '.slack.com/api/users.admin.invite',
		method: 'POST',
		qs: {
			t: 1416723927
		},
		form: {
			email: email,
			token: token,
			set_active: true,
      channels: channels,
			_attempts: 1
		}
	}, function (error, response, body) {
		body = JSON.parse(body);

		if (error || !body || !body.ok) {
			d.resolve(error || body && body.error || 'Could not invite user.');
		} else {
			d.resolve('Invited user.');
		}
	});

	return d.promise;
}

function generate_channel_list(data) {
  var channel_list = process.env.DEFAULT_CHANNELS;

  for(var answer in data.answers) {
    if(answer.indexOf(process.env.TYPEFORM_CHANNEL_FIELD) >= 0) {
      channel_name = data.answers[answer].toLowerCase().replace(/\&/, 'and').replace(/ /g, '-');

      if(all_channels[channel_name]) {
        channel_list += `,${all_channels[channel_name]}`;
      }
    }
  }

  return channel_list;
}

var SlackForm = function (config) {
	this.typeformApiKey = config.typeformApiKey;
	this.typeformId = config.typeformId;
	this.typeformEmail = config.typeformEmail;
	this.slackChannel = config.slackChannel;
	this.slackToken = config.slackToken;
	this.channels = config.channels;
}

SlackForm.prototype.invite = function (callback) {
	var that = this;

	var hour = 60 * 60 * 1;

	request({
		url: 'https://api.typeform.com/v0/form/' + this.typeformId,
		method: 'GET',
		qs: {
			key: this.typeformApiKey,
			completed: true,
			since: Math.floor(Date.now() / 1000) - hour
		}
	}, function (error, response, body) {
		var data = JSON.parse(body);

		if (!data || !data.responses || !data.responses.length) {
			return callback('No results.');
		}

		Q.all(data.responses.map(function (response) {
      var channels = generate_channel_list(response);
			return invite(that.slackChannel, response.answers[that.typeformEmail], that.slackToken, channels);
		})).then(function (data) {
			callback(null, data);
		});
	});
}

module.exports = SlackForm;
