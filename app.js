const markdownInput = document.getElementById("markdownInput");
const preview = document.getElementById("preview");
const layout = document.getElementById("layout");
const toggleView = document.getElementById("toggleView");

const storageKey = "visualmd:draft";
const defaultMarkdown = `# VisualMD\n\nEditor markdown visuale pensato anche per mobile.\n\n- Scrivi nel riquadro\n- Vedi l'anteprima\n- Alterna vista su smartphone\n\n**Buon editing!**`;

function escapeHtml(input) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function inlineMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>');
}

function parseMarkdown(markdown) {
  const lines = escapeHtml(markdown).split(/\r?\n/);
  const html = [];
  let inList = false;
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        html.push("</code></pre>");
        inCodeBlock = false;
      } else {
        html.push("<pre><code>");
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      html.push(`${line}\n`);
      continue;
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      continue;
    }

    if (inList) {
      html.push("</ul>");
      inList = false;
    }

    if (!line.trim()) {
      html.push("");
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  if (inList) html.push("</ul>");
  if (inCodeBlock) html.push("</code></pre>");

  return html.join("\n");
}

function render() {
  const value = markdownInput.value;
  preview.innerHTML = parseMarkdown(value);
  localStorage.setItem(storageKey, value);
}

function setMobileView(showPreview) {
  layout.classList.toggle("preview-only", showPreview);
  layout.classList.toggle("input-only", !showPreview);
  toggleView.textContent = showPreview ? "Editor" : "Anteprima";
  toggleView.setAttribute("aria-pressed", String(showPreview));
}

const saved = localStorage.getItem(storageKey);
markdownInput.value = saved || defaultMarkdown;
setMobileView(false);
render();

markdownInput.addEventListener("input", render);

if (toggleView) {
  toggleView.addEventListener("click", () => {
    setMobileView(!layout.classList.contains("preview-only"));
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {});
  });
}
