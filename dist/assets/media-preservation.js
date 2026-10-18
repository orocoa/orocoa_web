// Update locally authored markup without detaching unchanged media. A language
// change must not restart a video, drop its controls state or decode every image.
export function updateMediaMarkup(root, markup, preserve = false) {
  if (!preserve) { root.innerHTML = markup; return; }
  const template = document.createElement('template');
  template.innerHTML = markup;
  const source = element => element.getAttribute('data-video-src') ||
    element.getAttribute('data-src') || element.getAttribute('src') ||
    element.querySelector('source')?.getAttribute('src');
  function patch(parent, incoming) {
    const next = [...incoming.childNodes];
    for (let index = 0; index < next.length; index++) {
      const fresh = next[index], current = parent.childNodes[index];
      if (!current) { parent.append(fresh); continue; }
      if (current.nodeType !== fresh.nodeType || current.nodeName !== fresh.nodeName) {
        current.replaceWith(fresh); continue;
      }
      if (fresh.nodeType !== Node.ELEMENT_NODE) {
        if (current.nodeValue !== fresh.nodeValue) current.nodeValue = fresh.nodeValue;
        continue;
      }
      const sameMedia = /^(IMG|VIDEO)$/.test(fresh.tagName) && source(current) === source(fresh);
      // Keep src/preload/autoplay bookkeeping added by the media controller.
      // Updating accessible copy does not disturb the connected player node.
      if (sameMedia) {
        for (const name of ['alt', 'aria-label', 'title', 'width', 'height']) {
          const value = fresh.getAttribute(name);
          if (value !== null && current.getAttribute(name) !== value) current.setAttribute(name, value);
        }
        continue;
      }
      for (const { name } of [...current.attributes]) {
        if (!fresh.hasAttribute(name)) current.removeAttribute(name);
      }
      for (const { name, value } of fresh.attributes) {
        if (current.getAttribute(name) !== value) current.setAttribute(name, value);
      }
      patch(current, fresh);
    }
    while (parent.childNodes.length > next.length) parent.lastChild.remove();
  }
  patch(root, template.content);
}
