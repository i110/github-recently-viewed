const githubUrl = 'https://github.com/';
function searchHistory(repo, count, callback) {
  const regexp = new RegExp(`^https://github.com/${repo}/(pull|issues)/([0-9]+)(/.+)?$`);

  let currentUrlSet = new Set();
  let accum = [];

  chrome.history.search({
    startTime: 0,
    maxResults: 1000000000,
    text: `${githubUrl}${repo}`,
  }, (historyItems) => {
    historyItems.forEach((item) => {
      const match = item.url.match(regexp);
      if (match) {
        const type = match[1] === 'pull' ? 'PR' : 'Issue';
        const number = match[2];
        const normalizedUrl = match[3] ? item.url.substr(0, item.url.length - match[3].length) : item.url;
        if (!currentUrlSet.has(normalizedUrl)) {
          accum.push({
            title: item.title,
            url: normalizedUrl,
            type: type,
            number: number,
            lastVisitTime: item.lastVisitTime,
          });
          currentUrlSet.add(normalizedUrl);
        }
      }
    });
    accum.splice(count);
    callback(accum);
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'query') {
    searchHistory(msg.repo, msg.count, sendResponse);
  } else {
    console.warn(`unknown message type: ${msg.type}`);
    sendResponse(null);
  }
  return true;
});
