const urlsInput = getElement("#inputUrls");
const targetUrl = getElement("#targetUrl");
const generateButton = getElement("#generateButton");
const copyButton = getElement("#copyButton");
const downloadButton = getElement("#downloadButton");
const resetButton = getElement("#clearButton");
const output = getElement("#output");
const notification = getElement("#notification");
const error = getElement("#error");

generateButton.addEventListener("pointerup", () => {
  const targetUrlValue = targetUrl.value.trim();
  const urls = urlsInput.value
    .split("\n")
    .map((url) => url.trim())
    .filter((url) => url);
  error.textContent = "";

  if (!targetUrl) {
    output.textContent = "Пожалуйста, введите целевой URL";
    return;
  }

  output.textContent = generateNginxRedirects(urls, targetUrlValue);
});

function generateNginxRedirects(urls, targetUrl) {
  const targetUrlLine = `set $target_url_ ${targetUrl};\n\n`;
  const groupedRedirects = {};
  let queryRedirects = "";
  let firstParamProcessed = false;

  urls.forEach((url) => {
      try {
          const decodedUrl = decodeURIComponent(url);
          const parsedUrl = new URL(decodedUrl);
          const path = parsedUrl.pathname;

          const trimmedPath = path.split("%")[0];

          const params = parsedUrl.searchParams;
          for (const [key, value] of params) {
              if (!firstParamProcessed) {
                  queryRedirects += `if ($args ~* "^${key}=(.*)") {\n    return 301 ${targetUrl};\n}\n`;
                  firstParamProcessed = true;
              }
          }

          const segments = trimmedPath.split(/[\/-]/).filter((segment) => segment);
          // const segmentCount = segments.length;

          let prefix;
          // if (segmentCount > 2) {
          //     prefix = `${segments[0]}-${segments[1]}`;
          // } else if (segmentCount === 2) {
          //     prefix = segments.join("-");
          // } else if (segmentCount === 1) {
          //   prefix = segments[0];
          // }
          
          prefix = segments[0];
            
          if (!groupedRedirects[prefix]) {
              groupedRedirects[prefix] = [];
          }
          groupedRedirects[prefix].push(trimmedPath);

      } catch (e) {
          console.error(`Некорректный URL: ${url}`);
      }
  });

  const redirects = Object.keys(groupedRedirects).map((prefix) => {
      return `rewrite ^/${prefix}(.*)?$ $target_url_ permanent;`;
  });

  const filteredRedirects = redirects.filter(
      (item) => !item.includes("rewrite ^/(.*)?$")
  );

  return targetUrlLine + queryRedirects + filteredRedirects.join("\n") + "\n";
}

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

function getElement(selector) {
  return selector ? document.querySelector(selector) : null;
}