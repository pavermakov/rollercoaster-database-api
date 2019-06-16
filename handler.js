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

module.exports.park = (event) => {
  const url = `${URL}/${event.pathParameters.id}.htm`;

  return new Promise((resolve) => {
    JSDOM.fromURL(url, { runScripts: 'dangerously', resources: 'usable' })
      .then((dom) => {
        setTimeout(() => {
          const { document } = dom.window;
          const feature = document.querySelector('#feature');
          const article = document.querySelector('#article');
          const data = {};

          // get park name
          const header = feature.querySelector('h1');
          data.name = header.textContent;

          // get park location
          let location = `${header.nextSibling.textContent}`;
          const locationElem = feature.querySelectorAll('h1 ~ a') || [];

          locationElem.forEach((elem) => {
            location += `, ${elem.textContent}`;
          });

          data.location = location;

          // get opening date
          const timeElem = feature.querySelector('time');

          if (timeElem) {
            data.opened = timeElem.attributes.datetime.value;
          }

          // get phone
          let phoneSentence =  feature.querySelector('br + br').nextSibling.textContent;
          const phone = phoneSentence.split(': ')[1];

          data.phone = phone;

          // add socials
          const socials = {};
          const socialElements = feature.querySelectorAll('#media_row > .bkg');

          socialElements.forEach((elem) => {
            const url = elem.attributes.href.value;

            if (url.includes('facebook')) {
              return socials.facebook = url;
            }

            if (url.includes('twitter')) {
              return socials.twitter = url;
            }

            if (url.includes('instagram')) {
              return socials.instagram = url;
            }

            if (url.includes('youtube')) {
              return socials.youtube = url;
            }

            return socials.website = url;
          });

          data.socials = socials;

          // add images
          data.images = [...Array.from(document.querySelectorAll('#pic_data > div')).map(elem => `${URL}${elem.dataset.url}`)];

          // add rides
          const rides = {};

          // add operating rollercoasters
          const operating = [];
          let rows = article.querySelectorAll('section:nth-child(2) tbody > tr') || [];

          rows.forEach((row) => {
            const columns = row.querySelectorAll('td') || [];

            if (columns.length === 0) {
              return;
            }

            const id = extractId(columns[1].querySelector('a').attributes.href.value);
            const name = columns[1].textContent;
            const type = columns[2].textContent;
            const design = columns[3].textContent;
            const scale = columns[4].textContent;
            const opened = columns[5].textContent;
            const closed = (columns[6] || {}).textContent;

            operating.push({ id, name, type, design, scale, opened, closed });
          });

          if (operating.length > 0) {
            rides.operating = operating;
          }

          // add defunct rides
          const defunct = [];
          rows = article.querySelectorAll('section:nth-child(3) tbody > tr') || [];

          rows.forEach((row) => {
            const columns = row.querySelectorAll('td') || [];

            if (columns.length === 0) {
              return;
            }

            const id = extractId(columns[1].querySelector('a').attributes.href.value);
            const name = columns[1].textContent;
            const type = columns[2].textContent;
            const design = columns[3].textContent;
            const scale = columns[4].textContent;
            const opened = columns[5].textContent;
            const closed = (columns[6] || {}).textContent;

            defunct.push({ id, name, type, design, scale, opened, closed });
          });

          if (defunct.length > 0) {
            rides.defunct = defunct;
          }

          data.rides = rides;

          // add notes
          const notes = document.querySelector('.sec > div');

          if (notes) {
            data.notes = notes.textContent;
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
