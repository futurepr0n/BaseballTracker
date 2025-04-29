# First part of the capsheet is based on Baseball.

## How to use

In order to build your datasets I have created a couple different apps. I will be adding them to the repository as time goes or hopefully integrating them.

Standard workflow to create new files would be to first use CappingScraper (yet to come)

First we use:
`node src/services/scheduleGenerator.js`
This will create the schedule based on fixturedownload.com MLB scheduling

Next you will need to use the python scraper mentioned to create all your csv files to load.

After you do, you can use:
`./process_all_stats.sh` 

This will link to create json files based on the matchup data scraped.

npm install
npm start

and the server will come up on localhost:3000
