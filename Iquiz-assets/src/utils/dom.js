export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => Array.from(document.querySelectorAll(selector));

export function ensureButtonType(root = document) {
  root.querySelectorAll('button:not([type])').forEach((btn) => {
    btn.type = 'button';
  });
}

function handleAddedNode(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (node.matches && node.matches('button:not([type])')) node.type = 'button';
  if (node.querySelectorAll) ensureButtonType(node);
}

export const buttonTypeObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach(handleAddedNode);
  });
});

export function startButtonTypeObserver() {
  if (!document.body) return;
  ensureButtonType();
  buttonTypeObserver.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startButtonTypeObserver, { once: true });
} else {
  startButtonTypeObserver();
}
