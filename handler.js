
const axios = require('axios');

// SET QUERIES FOR YOUR REPORT (EACH ONE WILL ADD A CHART)
// TYPE: AREA, BILLBOARD, BAR, PIE, LINE, BULLET, FUNNEL, HEATMAP, EVENT_FEED, SCATTER, HISTOGRAM, TABLE, STACKED_HORIZONTAL_BAR, VERTICAL_BAR
const NEWRELIC_QUERY_IMG = [
  { "nrql": "FROM BrowserInteraction SELECT count(*) AS '# Visits' SINCE 1 week ago FACET appName LIMIT 5 TIMESERIES", "chartType":"AREA", "title":"# Visits"},
  { "nrql": "FROM AjaxRequest SELECT count(*) AS '# Requests' FACET httpResponseCode SINCE 1 week ago COMPARE with 1 week ago", "chartType":"PIE", "title": "# Requests"}, 
];

// OPTIONALLY SEND A LINK TO YOUR DASHBOARD
const NEWRELIC_LINK_DASHBORD = "";

// CUSTOMIZE THE SLACK REPORT
const SLACK_BODY = {
	"blocks": [
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Management Weekly Performance Report"
			}
		},
  ],
};

const SLACK_ATTACHMENT = [{
    "type": "divider"
  },{
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*<{{CHART_URL}}|{{CHART_TITLE}}>*\nPowered By New Relic\n`{{CHART_QUERY}}`"
    },
    "accessory": {
      "type": "image",
      "image_url": "{{CHART_URL}}",
      "alt_text": "{{CHART_TITLE}}"
    }
},]

const SLACK_BUTTON = [{
    "type": "divider"
  },{
    "type": "actions",
    "elements": [
      {
        "type": "button",
        "text": {
          "type": "plain_text",
          "emoji": true,
          "text": "Team Dashboard"
        },
        "value": "link",
        "url": "{{DASHBOARD}}"
      }
    ]
  }
];

module.exports.report = async () => {
    if(!process.env.NEW_RELIC_ACCOUNT_ID || !process.env.NEW_RELIC_API_USER_KEY){
      console.log(`ERROR Missing mandatory parameters (New Relic AccountId and/or API Key)`);
      return;
    }
    const promises = NEWRELIC_QUERY_IMG.map(async (query) => { // query the image URLs for each query for the report
      return getImageUrl(query) || "";
    });
    let attachments = (await Promise.all(promises)).filter(resp => resp != null); // filter all the queries that failed.
    if(attachments.length >0){ // sends the report to Slack
      let slack_payload = JSON.parse(JSON.stringify(SLACK_BODY));
      slack_payload["blocks"] = slack_payload["blocks"].concat(attachments.flat());
      if(NEWRELIC_LINK_DASHBORD && NEWRELIC_LINK_DASHBORD.length>0) 
        slack_payload["blocks"] = slack_payload["blocks"].concat(JSON.parse(JSON.stringify(SLACK_BUTTON).replace(/{{DASHBOARD}}/g, NEWRELIC_LINK_DASHBORD)));
      await sendReportToSlack(slack_payload);
    }
};


// Function to post the slack report 
const sendReportToSlack = async (slack_body) => {
  try{
    await axios({
      method:"POST",
      url: process.env.SLACK_WEBHOOK_URL,
      data: JSON.stringify(slack_body),
      headers: {
          'Content-Type': 'application/json',
      },
    });
  } catch(error){
    console.log(`Unable to send the slack report - ${JSON.stringify(error)}`);
  }
};
  
// Function to fetch NR API to get a static URL for a chart 
const getImageUrl = async ({nrql, chartType, title})=>{
    const query = `{
        actor {
          account(id: ${process.env.NEW_RELIC_ACCOUNT_ID}) {
            nrql (query: ${JSON.stringify(nrql)}) {
                staticChartUrl(chartType: ${chartType}, format: PNG)
              }
            }
        }
    }`
    try{
        const response = await axios({
            method:"POST",
            url: 'https://api.newrelic.com/graphql',
            headers: {
                'Content-Type': 'application/json',
                'API-Key': process.env.NEW_RELIC_API_USER_KEY
            },
            data: { query, timeout: 120 },
        });
        if(response.data.data.errors) {
          console.log(`ERROR - Fetching static chart url: ${JSON.stringify(response.data.data.errors)}`);
          return null;
        }
        return JSON.parse(JSON.stringify(SLACK_ATTACHMENT).replace(/{{CHART_URL}}/g, response.data.data.actor.account.nrql.staticChartUrl)
                                  .replace(/{{CHART_TITLE}}/g, title)
                                  .replace(/{{CHART_QUERY}}/g, nrql)
                          );
    } catch(error){
      return null;
    }
};

