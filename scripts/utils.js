/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/*
 * ------------------------------------------------------------
 * Edit below at your own risk
 * ------------------------------------------------------------
 */

/**
 * The decision engine for where to get Milo's libs from.
 */
export const [setLibs, getLibs] = (() => {
  let libs;
  return [
    (prodLibs, location) => {
      libs = (() => {
        const { hostname, search } = location || window.location;
        if (!(hostname.includes('.hlx.') || hostname.includes('local'))) return prodLibs;
        const branch = new URLSearchParams(search).get('milolibs') || 'main';
        if (branch === 'local') return 'http://localhost:6456/libs';
        return branch.includes('--') ? `https://${branch}.hlx.live/libs` : `https://${branch}--milo--adobecom.hlx.live/libs`;
      })();
      return libs;
    }, () => libs,
  ];
})();

export const getVersion = async () => {
  const resp = await fetch('/fragments/release-note.plain.html');
  if (resp.ok) {
    const html = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const firstP = doc.querySelector('p');
    return `v${firstP.textContent.split(' ')[0]}`;
  }
  return '';
}

const getEnv = () => {
  const { host, search} = window.location;
  const params = new URLSearchParams(search);
  if (params.get('env')) {
    return params.get('env');
  }
  if (host.includes('localhost')) {
    return 'dev';
  } else if (host.includes('hlx.page')) {
    return 'page';
  }
  else if (host.includes('hlx.live')) {
    return 'live';
  }
  return 'prod';
};

export const getRiotAPIKey = async () => {
    const res = await fetch('/api-keys.json');
    const json = await res.json();
    let keyLookUpBy = 'riot-dev';
    if (getEnv() === 'prod') {
      keyLookUpBy = 'riot-prod';
    }
    let riotKey = '';
    json.data.forEach(d => {
      if (keyLookUpBy === d.key) {
        riotKey = d.value;
      }
    });

    return riotKey;
}

export const capitalize = ([firstLetter, ...restOfWord]) => firstLetter.toUpperCase() + restOfWord.join("");

export const getKeyByValue = (object, value) => {
    return Object.keys(object).find(key => object[key] === value);
}

export const roman2arabic = s => {
  if(!s) {
    return '';
  }
  const map = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000};
  return [...s].reduce((r,c,i,s) => map[s[i+1]] > map[c] ? r-map[c] : r+map[c], 0);
};
