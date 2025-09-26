import { $ } from '../../utils/dom.js';
import { life5050, lifePause } from './engine.js';

const noop = () => {};

export function registerQuizEvents({
  onShareResult = noop,
  onPlayAgain = noop,
  onBackToDashboard = noop,
} = {}) {
  $('#btn-share')?.addEventListener('click', onShareResult);
  $('#btn-again')?.addEventListener('click', onPlayAgain);
  $('#btn-back-results')?.addEventListener('click', onBackToDashboard);

  $('#life-5050')?.addEventListener('click', life5050);
  $('#life-pause')?.addEventListener('click', lifePause);
}
