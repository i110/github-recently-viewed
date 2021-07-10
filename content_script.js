function htmlToElement(html) {
    var template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}

function getRepo() {
  const parts = document.location.pathname.split('/');
  if (parts.length < 3) {
    return null;
  }
  return [parts[1], parts[2]].join('/');
}

function doit() {
  const repo = getRepo();
  if (!repo) {
    return;
  }
  const containerId = 'grv-recent-select-menu';
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
      console.warn('cound not find searchInput by class `subnav-search`')
      return;
  }
  searchInput.parentElement.insertBefore(elem, searchInput);
  chrome.runtime.sendMessage({type: 'query', repo: repo, count: 100}, (response) => {
    if (!response) {
      return;
    }
    const list = document.querySelector(`#${containerId} .SelectMenu-list`);
    response.forEach((item) => {
      const justTitle = item.title.replace(/ · .+$/, '');
      const link = htmlToElement(`
        <a class="SelectMenu-item" role="menuitemradio" aria-checked="false" href="${item.url}">
          <span class="grv-typenum">[${item.type}#${item.number}]</span> ${justTitle}
        </a>
      `);
      list.appendChild(link);
    });
  });
}

doit();

