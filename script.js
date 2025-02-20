const urlsInput = getElement("#inputUrls");
const targetUrl = getElement("#targetUrl");
const generateButton = getElement("#generateButton");
const copyButton = getElement("#copyButton");
const downloadButton = getElement("#downloadButton");
const resetButton = getElement("#clearButton");
const output = getElement("#output");
const notification = getElement("#notification");
const error = getElement("#error");

function getElement(selector) {
  return selector ? document.querySelector(selector) : null;
}

function setShielding(ex) {
  return ex.replace(/([.*+?^${}()|[\]\\])/g, '\\$1').replace([/ /g, '\\+']);
}

function generateNginxRedirects(urls, targetUrl) {
  const targetUrlLine = `set $target_url_ ${targetUrl};\n\n`;
  const groupedRedirects = {};
  const existingRedirects = new Set();
  let queryRedirects = '';
  let redirects;

  urls.forEach((url) => {
    const parsedUrl = new URL(url);
    const tempPath = parsedUrl.pathname.replace(/%20/g, '__SPACE__');
    const path = decodeURIComponent(tempPath);
    const finalPath = path.replace(/__SPACE__/g, '%20');
    const params = parsedUrl.searchParams;
    if ([...params.keys()].length > 0) {
      let redirectConditionAdded = false;
      for (const [key, value] of params) {
        const redirectCondition = `if ($args ~* "^${setShielding(finalPath)}\?${key}=${setShielding(value)}$") {\n    return 301 ${targetUrl};\n}\n`;
          if (!existingRedirects.has(redirectCondition)) {
              queryRedirects += redirectCondition;
              existingRedirects.add(redirectCondition);
              redirectConditionAdded = true;
          }
      }
      if (redirectConditionAdded) return;
    } else {
      groupedRedirects[path] = [];
      groupedRedirects[path].push(path);
      redirects = Object.keys(groupedRedirects).map((path) => {
        return `rewrite ^${setShielding(finalPath)}$ $target_url_ permanent;`;
      });
    }
  });

  if(redirects && queryRedirects) {
    return targetUrlLine + queryRedirects + '\n\n' + redirects.join('\n') + '\n'
  } else if(redirects && !queryRedirects) {
    return targetUrlLine + redirects.join('\n') + '\n'
  } else if(!redirects && queryRedirects) {
    return targetUrlLine + queryRedirects;
  } else return
}

generateButton.addEventListener("pointerup", () => {
  const targetUrlValue = targetUrl.value.trim();
  const urls = urlsInput.value
    .split("\n")
    .map((url) => url.trim());
  error.textContent = "";

  if (!targetUrlValue) {
    error.textContent = "Пожалуйста, введите целевой URL";
  } else {
    output.textContent = generateNginxRedirects(urls, targetUrlValue);
  }
});

copyButton.addEventListener("pointerup", () => {
  navigator.clipboard
    .writeText(output.textContent)
    .then(() => {
      notification.textContent = "Вывод скопирован в буфер обмена!";
      setTimeout(() => {
        notification.textContent = "";
      }, 3000);
    })
    .catch((err) => {
      console.error("Ошибка при копировании: ", err);
    });
});

downloadButton.addEventListener("pointerup", () => {
  const outputText = output.textContent;
  const blob = new Blob([outputText], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.download = "redirects.conf";
  link.click();
  window.URL.revokeObjectURL(link.href);
});

resetButton.addEventListener("pointerup", () => {
  urlsInput.value = "";
  targetUrl.value = "";
  output.textContent = "";
  notification.textContent = "";
  error.textContent = "";
});