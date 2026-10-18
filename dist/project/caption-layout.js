// Measure the original English caption only when the project or viewport changes.
// Translations keep its canvas space and starting position, using the same fonts.
export function createCaptionLayout(caption, overview, controls, phone) {
  const reference = caption.cloneNode(true);
  reference.classList.add('project-caption-reference');
  reference.inert = true;
  reference.setAttribute('aria-hidden', 'true');
  reference.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
  reference.querySelectorAll('.project-meta-goo').forEach(element => element.remove());
  document.body.append(reference);
  const title = reference.querySelector('.project-caption-title');
  const category = reference.querySelector('.project-caption-category');
  const year = reference.querySelector('.project-context-row > :last-child');
  let project, measuredKey = '', referenceHeight = 0, offset = 0;

  function update(next = project) {
    project = next;
    if (!project || overview.hidden || caption.offsetHeight === 0) return;
    const actualHeight = caption.getBoundingClientRect().height;
    if (!phone.matches) {
      offset = 0;
      caption.style.removeProperty('--caption-language-offset');
      overview.style.setProperty('--project-caption-height', `${actualHeight}px`);
      return;
    }
    const style = getComputedStyle(caption.querySelector('#project-name'));
    const key = [project.id, caption.offsetWidth, style.fontSize, style.lineHeight, innerHeight].join(':');
    if (key !== measuredKey) {
      reference.style.width = `${caption.getBoundingClientRect().width}px`;
      title.textContent = project.layoutReference.title;
      category.textContent = project.layoutReference.category;
      year.textContent = project.layoutReference.year;
      referenceHeight = reference.getBoundingClientRect().height;
      measuredKey = key;
    }
    // A longer title grows into the existing gap below the caption. Only the
    // tightest screens constrain that adjustment to protect the arrow controls.
    const unshiftedBottom = caption.getBoundingClientRect().bottom - offset;
    const available = Math.max(0, controls.getBoundingClientRect().top - 16 - unshiftedBottom);
    offset = Math.min(actualHeight - referenceHeight, available);
    caption.style.setProperty('--caption-language-offset', `${offset}px`);
    overview.style.setProperty('--project-caption-height', `${referenceHeight}px`);
  }
  document.fonts?.ready.then(() => { measuredKey = ''; update(); });
  return { update };
}
