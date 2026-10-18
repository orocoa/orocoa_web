import { text } from '../assets/language.js';
import { createUpstreamCarousel } from './vendor/viscose/carousel.js';

// Keep the official entry/layout implementation; configure site identity and
// the single requested effect change here. No example artwork or fonts load.
export function createCarousel(options) {
  const tokens = getComputedStyle(document.documentElement);
  return createUpstreamCarousel({
    ...options,
    listEl: document.querySelector('#project-list'),
    loaderEl: document.querySelector('#project-loader'),
    paramsOverride: {
      text: '',
      tagText: text('View', '查看'),
      textFont: tokens.getPropertyValue('--vi-font-ui').split(',')[0].trim().replaceAll('"', ''),
      textColor: tokens.getPropertyValue('--vi-ink').trim(),
      surface: tokens.getPropertyValue('--vi-surface').trim(),
      atlasSurface: tokens.getPropertyValue('--vi-conversation').trim(),
      neighborPeek: 0.10,
      neighborGap: 48,
    },
  });
}
