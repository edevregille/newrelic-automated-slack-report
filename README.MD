# Publish in Slack a New Relic Performance report

Lambda function that runs at a chosen frequency or schedule like every monday morning.

## How to set-up

In the `handler.js` file, customize your report:
- set the NRQL queries and chart type with title for each with `NEWRELIC_QUERY_IMG` array.
- optionnally, set a link for your dashboard (it will add a button to the slack message)
- customize the slack message title with the `SLACK_BODY` value

You can go further in customizing the Slack message https://app.slack.com/block-kit-builder

Then add a .env file at the root and set the following values in the file
```
NEW_RELIC_API_USER_KEY=
NEW_RELIC_ACCOUNT_ID=
SLACK_WEBHOOK_URL=
```
You will need to create a Slack app to get your incoming Webhook URL.

Finally, set in the `serverless.yml` file the schedule / frequency for your report to run. Examples:
```
schedule: rate(10 minutes)
schedule: 
  rate: cron(0 0 ? * MON *) 
```

See AWS docs https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html


## How to deploy

```serverless deploy```

![alt text](https://github.com/edevregille/newrelic-automated-slack-report/blob/master/report.png?raw=true)