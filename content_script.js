const MAX_HISTORIES_PER_REPO = 1000;
const TYPE_PULL = 'P';
const TYPE_ISSUE = 'I';

function htmlToElement(html) {
    var template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}

function parsePath() {
  const parts = document.location.pathname.split('/');
  if (parts.length < 4) {
    return null;
  }
  if (!(parts[3] === 'pull' || parts[3] === 'pulls' || parts[3] === 'issues')) {
    return null;
  }
  const repo = `${parts[1]}/${parts[2]}`;
  const type = parts[3][0] === 'p' ? TYPE_PULL : TYPE_ISSUE;
  const isList = !parts[4];

  if (!isList && !parts[4].match(/^[0-9]+$/)) {
    return null;
  }

  return {
    repo,
    type,
    isList,
    num: isList ? null : parseInt(parts[4]),
  };
}

function list(parsed) {
  const containerId = 'grv-recent-select-menu';
  const existing = document.getElementById(containerId);
  if (!existing) {
    const elem = htmlToElement(`
      <details class="details-reset details-overlay subnav-search-context" id="${containerId}">
        <summary role="button" data-view-component="true" class="btn recent-button" aria-haspopup="menu">
          Recent
          <span class="dropdown-caret"></span>
        </summary>
        <details-menu class="SelectMenu" role="menu">
          <div class="SelectMenu-modal">
            <div class="SelectMenu-list">
            </div>
          </div>
        </details-menu>
      </details>
    `);
    const searchInput = document.getElementsByClassName('subnav-search')[0];
    if (!searchInput) {
      console.warn('cound not find searchInput by the class `subnav-search`')
      return false;
    }
    searchInput.parentElement.insertBefore(elem, searchInput);
  }

  const listElem = document.querySelector(`#${containerId} .SelectMenu-list`);

  chrome.storage.local.get(parsed.repo, (result) => {
    const state = result[parsed.repo] || {};
    const listItems = (state.histories || []).reverse().map((item) => {
      const typeString = item.type === TYPE_PULL ? 'PR' : 'Issue';
      const typePathComp = item.type === TYPE_PULL ? 'pull' : 'issues';
      const href = `/${parsed.repo}/${typePathComp}/${item.num}`;
      return htmlToElement(`
        <a class="SelectMenu-item" role="menuitemradio" aria-checked="false" href="${href}">
          <span class="grv-typenum">[${typeString}#${item.num}]</span> ${item.title} <span class="grv-author">by ${item.author || '???'}</span>
        </a>
      `);
    });
    if (listItems.length === 0) {
        listItems.push(htmlToElement('<span class="SelectMenu-item">No history</span>'));
    }
    listElem.replaceChildren(...listItems);
  });

  return true;
}

function detail(parsed) {
  const now = new Date().getTime();
  const authorElem = document.querySelector('a.author');
  const author = authorElem ? authorElem.text : null;
  let justTitle = document.title.replace(/ · .+$/, '');
  if (author) {
      justTitle = justTitle.replace(new RegExp(` by ${author}$`), '');
  }

  chrome.storage.local.get(parsed.repo, (result) => {
    let state = result[parsed.repo] || {};
    state.histories ||= [];
    const index = state.histories.findIndex((item) => item.type === parsed.type && item.num === parsed.num);
    let item = null;
    if (index === -1) {
      item = { type: parsed.type, num: parsed.num };
    } else {
      item = state.histories.splice(index, 1)[0];
    }
    item.title = justTitle;
    item.author = author;
    item.last = now;
    item.count = (item.count || 0) + 1;
    state.histories.push(item);
    while (state.histories.length > MAX_HISTORIES_PER_REPO) {
        state.histories.shift();
    }
    chrome.storage.local.set({[parsed.repo]: state});
  });
  return true;  
}

function main() {
  const parsed = parsePath();
  if (parsed) {
    if (parsed.isList) {
      return list(parsed);
    } else {
      return detail(parsed);
    }
  }
  return true;
}

new MutationObserver(main).observe(document.getElementsByTagName('title')[0], { childList: true });
main();

