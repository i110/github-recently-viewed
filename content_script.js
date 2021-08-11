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
        <summary role="button" id="grv-recent-button" data-view-component="true" class="btn" aria-haspopup="menu">
          Recent
          <span class="dropdown-caret"></span>
        </summary>
        <details-menu class="SelectMenu" role="menu">
          <div class="SelectMenu-modal">
            <div class="SelectMenu-list">
              <div class="SelectMenu-item grv-filter subnav-search" aria-checked="false">
                <input type="text" id="grv-filter-input" class="form-control subnav-search-input input-contrast width-full" placeholder="Filter" aria-label="Filter" autocomplete="off">
                <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-search subnav-search-icon grv-filter-icon">
                    <path fill-rule="evenodd" d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"></path>
                </svg>
              </div>
            </div>
          </div>
        </details-menu>
      </details>
    `);
    const anchorElem = document.getElementsByClassName('subnav-search')[0];
    if (!anchorElem) {
      console.warn('cound not find anchor element by the class `subnav-search`')
      return false;
    }
    anchorElem.parentElement.insertBefore(elem, anchorElem);

    const filterInput = document.getElementById('grv-filter-input');
    filterInput.addEventListener('input', (e) => {
        updateList(e.target.value);
    });
    const recentButton = document.getElementById('grv-recent-button');
    recentButton.addEventListener('click', (e) => {
        setTimeout(() => {
            filterInput.focus();
        }, 50);
    });
  }

  const listElem = document.querySelector(`#${containerId} .SelectMenu-list`);

  let histories = null;
  const updateList = (query) => {
    const items = listElem.querySelectorAll('.grv-removable-item');
    items.forEach((item) => item.remove());

    let filteredHistories = histories;
    if (query) {
        query = query.toLowerCase().trim().split(/\s+/).join(' ');
        filteredHistories = histories.filter((item) => item._filterText.includes(query));
    }

    const listItems = filteredHistories.reverse().map((item) => {
      return htmlToElement(`
        <a class="SelectMenu-item grv-removable-item" role="menuitemradio" aria-checked="false" href="${item._href}">
          <span class="grv-typenum">${item._text}</span>
        </a>
      `);
    });
    if (listItems.length === 0) {
        listItems.push(htmlToElement('<span class="SelectMenu-item grv-removable-item">No history</span>'));
    }
    listItems.forEach((item) => listElem.appendChild(item));
  };

  chrome.storage.local.get(parsed.repo, (result) => {
    const state = result[parsed.repo] || {};
    histories = state.histories || [];
    histories.forEach((item) => {
        const typeString = item.type === TYPE_PULL ? 'PR' : 'Issue';
        const typePathComp = item.type === TYPE_PULL ? 'pull' : 'issues';
        item._href = `/${parsed.repo}/${typePathComp}/${item.num}`;
        item._text = `[${typeString}#${item.num}]</span> ${item.title} <span class="grv-author">by ${item.author || '???'}`;
        item._filterText = item._text.toLowerCase();
    });
    updateList();
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

