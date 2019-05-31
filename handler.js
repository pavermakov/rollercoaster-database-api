'use strict';
const jsdom = require("jsdom");
const { extractId, extractBackgroundUrl } = require('./helpers');

const { JSDOM } = jsdom;
const URL = 'https://rcdb.com';
const URL_SEARCH = 'https://rcdb.com/qs.htm?qs=';

module.exports.random = () => {
  return new Promise((resolve) => {
    JSDOM.fromURL(URL, { runScripts: 'dangerously', resources: 'usable' })
      .then((dom) => {
        setTimeout(() => {
          const { document } = dom.window;
          const specs = document.querySelectorAll('#rrc_text p');
          const data = {};

          for (let [index, elem] of specs.entries()) {
            if (index === 0) {
              let id = elem.querySelector('a').attributes.href.value;
              id = id.slice(1).split('.')[0];

              data.Id = id;
            }

            const name = elem.querySelector('span').innerHTML.replace(/\s/g, '');
            const value = (elem.querySelector('a') || {}).innerHTML || elem.querySelector('span').nextSibling.textContent;

            data[name] = value;
          }

          const image = document.getElementById('rrc_pic');
          const imageUrl = `${URL}${image.style.backgroundImage.slice(4, -1).replace(/["']/g, '')}`;

          data.Image = imageUrl;

          const response = {
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(data)
          };

          resolve(response);
        }, 0);
      })
      .catch((error) => {
        const response = {
          statusCode: 500,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error })
        };

        resolve(response);
      });
  })
};

module.exports.latest = () => {
  return new Promise((resolve) => {
    JSDOM.fromURL(URL, { runScripts: 'dangerously', resources: 'usable' })
      .then((dom) => {
        setTimeout(() => {
          const { document } = dom.window;
          const rows = document.querySelectorAll('table.t-list tr');
          const data = [];

          for (let elem of rows) {
            const timestamp = elem.querySelector('time').attributes.datetime.value;
            const [nameLink, parkLink] = elem.querySelectorAll('a');

            const rideName = (nameLink.querySelector('span') || nameLink).innerHTML;
            const rideId = extractId(nameLink.attributes.href.value);
            const parkName = (parkLink.querySelector('span') || parkLink).innerHTML;
            const parkId = extractId(parkLink.attributes.href.value);
            const location = parkLink.nextSibling.textContent.slice(2, -1);

            data.push({ timestamp, rideId, rideName, parkId, parkName, location });
          }

          const response = {
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(data)
          };

          resolve(response);
        }, 0);
      })
      .catch((error) => {
        const response = {
          statusCode: 500,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error })
        };

        resolve(response);
      });
  })
};

module.exports.videos = () => {
  return new Promise((resolve) => {
    JSDOM.fromURL(URL, { runScripts: 'dangerously', resources: 'usable' })
      .then((dom) => {
        setTimeout(() => {
          const { document } = dom.window;
          const videos = document.querySelectorAll('section#lv > div');
          const data = [];

          for (let elem of videos) {
            const videoLink = elem.querySelector('a[target="_blank"]');
            const thumbnail = extractBackgroundUrl(videoLink.style.backgroundImage);
            const source = videoLink.attributes.href.value;
            const duration = videoLink.querySelector('div > span').innerHTML;

            const titleElem = elem.querySelector('div:nth-child(3)');
            const title = titleElem.innerHTML;

            const authorElem = elem.querySelector('div:nth-child(4) > span');
            const author = authorElem.innerHTML;

            data.push({ thumbnail, title, source, duration, author });
          }

          const response = {
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(data)
          };

          resolve(response);
        }, 500);
      })
      .catch((error) => {
        const response = {
          statusCode: 500,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error })
        };

        resolve(response);
      });
  });
};

module.exports.search = (event) => {
  const url = `${URL_SEARCH}${event.queryStringParameters.query}`;

  return new Promise((resolve) => {
    JSDOM.fromURL(url, { runScripts: 'dangerously', resources: 'usable' })
      .then((dom) => {
        setTimeout(() => {
          const { document } = dom.window;
          const results = document.querySelectorAll('section:first-of-type p') || [];
          const data = [];

          for (let elem of results) {
            const rideElem = elem.querySelector('a:first-child');
            const rideName = rideElem.innerHTML;
            const rideId = extractId(rideElem.attributes.href.value);

            const parkElem = elem.querySelector('a:last-child');
            const parkName = parkElem.innerHTML;
            const parkId = extractId(parkElem.attributes.href.value);

            const location = parkElem.nextSibling.textContent.slice(2, -1);

            data.push({ rideId, rideName, parkId, parkName, location });
          }

          resolve({
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(data)
          });
        }, 0);
      })
      .catch((error) => {
        const response = {
          statusCode: 500,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error })
        };

        resolve(response);
      });
  });
};
