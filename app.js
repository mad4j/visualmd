const markdownInput = document.getElementById("markdownInput");
const mdOverlay = document.getElementById("mdOverlay");

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

// Escapes a plain text segment that hasn't been processed yet
function escapeSegment(text) {
  return escapeHtml(text);
}

// Takes raw (unescaped) inline text, escapes text nodes, wraps syntax spans
function inlineMarkdown(raw) {
  // Process in a single pass using a regex that matches all inline patterns
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))/g;
  let result = "";
  let last = 0;
  let match;

  while ((match = pattern.exec(raw)) !== null) {
    // Escape and append the plain text before this match
    result += escapeSegment(raw.slice(last, match.index));
    last = match.index + match[0].length;

    const full = match[0];
    if (full.startsWith("`")) {
      const inner = full.slice(1, -1);
      result += `<span class="md-syntax">\`</span><span class="md-code">${escapeSegment(inner)}</span><span class="md-syntax">\`</span>`;
    } else if (full.startsWith("**")) {
      const inner = full.slice(2, -2);
      result += `<span class="md-syntax">**</span><span class="md-bold">${escapeSegment(inner)}</span><span class="md-syntax">**</span>`;
    } else if (full.startsWith("*")) {
      const inner = full.slice(1, -1);
      result += `<span class="md-syntax">*</span><span class="md-italic">${escapeSegment(inner)}</span><span class="md-syntax">*</span>`;
    } else {
      // Link [label](url) — url is already validated as https? by regex
      const label = match[2];
      const url = match[3];
      result += `<span class="md-syntax">[</span><span class="md-link">${escapeSegment(label)}</span><span class="md-syntax">](${escapeSegment(url)})</span>`;
    }
  }

  result += escapeSegment(raw.slice(last));
  return result;
}

function renderOverlay(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      html.push(`<div><span class="md-syntax">${escapeHtml(line)}</span></div>`);
      continue;
    }

    if (inCodeBlock) {
      html.push(`<div><span class="md-code-block">${escapeHtml(line)}</span></div>`);
      continue;
    }

    if (!line.trim()) {
      html.push(`<div>\u200b</div>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})(\s+)(.+)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<div><span class="md-syntax">${escapeHtml(heading[1] + heading[2])}</span><span class="md-heading md-heading-${level}">${inlineMarkdown(heading[3])}</span></div>`);
      continue;
    }

    if (line.startsWith("- ")) {
      html.push(`<div><span class="md-syntax">- </span>${inlineMarkdown(line.slice(2))}</div>`);
      continue;
    }

    const orderedMatch = line.match(/^(\d+\. )(.*)/);
    if (orderedMatch) {
      html.push(`<div><span class="md-syntax">${escapeHtml(orderedMatch[1])}</span>${inlineMarkdown(orderedMatch[2])}</div>`);
      continue;
    }

    if (line.startsWith("> ")) {
      html.push(`<div><span class="md-syntax">&gt; </span><span class="md-blockquote">${inlineMarkdown(line.slice(2))}</span></div>`);
      continue;
    }

    html.push(`<div>${inlineMarkdown(line)}</div>`);
  }

  return html.join("");
}

function syncScroll() {
  mdOverlay.scrollTop = markdownInput.scrollTop;
}

function render() {
  const value = markdownInput.value;
  mdOverlay.innerHTML = renderOverlay(value);
  syncScroll();
  localStorage.setItem(storageKey, value);
}

const saved = localStorage.getItem(storageKey);
markdownInput.value = saved || defaultMarkdown;
render();

markdownInput.addEventListener("input", render);
markdownInput.addEventListener("scroll", syncScroll);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {});
  });
}
