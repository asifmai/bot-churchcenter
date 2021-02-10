const pupHelper = require('./puppeteerhelper');
const fs = require('fs');
const pLimit = require('p-limit');
const csvtojson = require('csvtojson');

let churchesLinks = [];

const run = async () => {
  try {
    await fetchLinks();

    if (churchesLinks.length) {
      await pupHelper.launchBrowser({ debug: true });

      await fetch();

      await pupHelper.closeBrowser();
    } else {
      console.log('No Links Found');
    }
  } catch (error) {
    await pupHelper.closeBrowser();
    return error;
  }
};

const fetch = () =>
  new Promise(async (resolve, reject) => {
    try {
      const limit = pLimit(20);
      const promises = [];

      for (let i = 0; i < churchesLinks.length; i++) {
        promises.push(limit(() => fetchChurch(i)));
      }

      await Promise.all(promises);

      resolve(true);
    } catch (error) {
      console.log(`Run Error: ${error}`);
      reject(error);
    }
  });

const fetchChurch = (churchIdx) =>
  new Promise(async (resolve, reject) => {
    let page;
    try {
      console.log(`${churchIdx + 1}/${churchesLinks.length} - Fetching Church Details [${churchesLinks[churchIdx]}]`);
      page = await pupHelper.launchPage({ blockResources: true });
      await page.goto(churchesLinks[churchIdx], { timeout: 0, waitUntil: 'load' });
      await page.waitForSelector('footer.site-footer');

      const church = {};
      church.url = churchesLinks[churchIdx];
      church.title = await pupHelper.getTxt('footer.site-footer > ul:last-child > li:first-child', page);
      church.email = await pupHelper.getTxt('footer.site-footer > ul:last-child > li:nth-child(2)', page);
      church.phone = await pupHelper.getTxt('footer.site-footer > ul:last-child > li:nth-child(3)', page);

      const cleanedChurch = pupHelper.cleanObjectForSaveing(church);

      await pupHelper.saveToCsv('results.csv', cleanedChurch);

      await page.close();
      resolve(true);
    } catch (error) {
      if (page) await page.close();
      console.log('fetchChurch Error: ', error);
      reject(error);
    }
  });

const fetchLinks = async () => {
  const jsonArray = await csvtojson().fromFile('links.csv');
  churchesLinks = jsonArray.map((c) => {
    return c.name.startsWith('https') ? c.name : 'https://' + c.name;
  });
};

run();
