import { formatRelativeTime } from './src/utils/format.js';
import { RemoteConfig } from './src/config/remote-config.js';
import { State } from './src/state/state.js';
import { registerQuizEvents } from './src/features/quiz/events.js';
import { bootstrap, getQuizEventHandlers } from './src/app/bootstrap.js';

function registerFeatures() {
  const quizHandlers = {
    ...getQuizEventHandlers(),
    state: State,
    config: RemoteConfig,
    formatRelativeTime,
  };
  registerQuizEvents(quizHandlers);
}

function onReady() {
  registerFeatures();
  bootstrap();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onReady, { once: true });
} else {
  onReady();
}
