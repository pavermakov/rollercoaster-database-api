'use strict';
const jsdom = require("jsdom");
const { extractId, extractBackgroundUrl, formatProperty } = require('./helpers');

const { JSDOM } = jsdom;
const URL = 'https://rcdb.com';

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

              data.id = id;
            }

            const name = formatProperty(elem.querySelector('span').innerHTML);
            const value = (elem.querySelector('a') || {}).innerHTML || elem.querySelector('span').nextSibling.textContent;

            data[name] = value;
          }

          const image = document.getElementById('rrc_pic');
          const imageUrl = `${URL}${image.style.backgroundImage.slice(4, -1).replace(/["']/g, '')}`;

          data.image = imageUrl;

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
  const url = `${URL}/qs.htm?qs=${event.queryStringParameters.query}`;

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

module.exports.ride = (event) => {
  const url = `${URL}/${event.pathParameters.id}.htm`;

  return new Promise((resolve) => {
    JSDOM.fromURL(url, { runScripts: 'dangerously', resources: 'usable' })
      .then((dom) => {
        setTimeout(() => {
          const { document } = dom.window;
          const feature = document.querySelector('#feature');
          let data = {};

          const rideName = feature.querySelector('h1').innerHTML;
          const parkName = feature.querySelector('h1 + a').innerHTML;
          const parkId = extractId(feature.querySelector('h1 + a').attributes.href.value);
          const location = Array.from(feature.querySelectorAll('h1 ~ a:not(:first-of-type)'))
            .map((el) => el.innerHTML)
            .join(', ');

          data = { rideName, rideId: event.pathParameters.id, parkName, parkId, location };

          // images
          data.images = [...Array.from(document.querySelectorAll('#pic_data > div')).map(elem => `${URL}${elem.dataset.url}`)];

          // general info
          const infoElements = [...Array.from(document.querySelectorAll('section > h3'))];

          // tracks
          const tracksInfo = infoElements.find(el => el.textContent === 'Tracks');

          if (tracksInfo) {
            const tracks = {};
            const parent = tracksInfo.parentNode;
            const rows = parent.querySelectorAll('tr') || [];

            rows.forEach((row) => {
              const name = formatProperty(row.querySelector('th').textContent);
              const value = row.querySelector('td').textContent;

              if (name === 'Elements') {
                // very complicated, try to come up with a solution later
                return;
              }

              tracks[name] = value;
            });

            data.tracks = tracks;
          }

          // trains
          const trainsInfo = infoElements.find(el => el.textContent === 'Trains');

          if (trainsInfo) {
            const trains = {};
            const parent = trainsInfo.parentNode;
            const rows = parent.querySelectorAll('tr') || [];

            rows.forEach((row) => {
              const data = row.querySelectorAll('td');
              const name = formatProperty(data[0].textContent.slice(0, -1));
              const value = data[1].textContent;

              trains[name] = value;
            });

            data.trains = trains;
          }

          // details
          const detailsInfo = infoElements.find(el => el.textContent === 'Details');

          if (detailsInfo) {
            const details = {};
            const parent = detailsInfo.parentNode;
            const rows = parent.querySelectorAll('tr') || [];

            rows.forEach((row) => {
              const data = row.querySelectorAll('td');
              const name = formatProperty(data[0].textContent);
              const value = data[1].textContent;

              details[name] = value;
            });

            data.details = details;
          }

          // facts
          const factsInfo = infoElements.find(el => el.textContent === 'Facts');

          if (factsInfo) {
            const parent = factsInfo.parentNode;
            const facts = parent.querySelector('div').textContent;

            data.facts = facts;
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
