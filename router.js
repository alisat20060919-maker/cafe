import { Events, emit } from './event-bus.js?v=core06';

let routes = {};
let currentRoute = 'home';

function $all(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function setActiveRoute(routeName) {
  $all('.page').forEach((page) => {
    page.classList.toggle('active', page.id === `page-${routeName}`);
  });

  $all('[data-route]').forEach((button) => {
    button.classList.toggle('active', button.dataset.route === routeName);
  });

  document.querySelector('.game-window')?.setAttribute('data-current-page', routeName);
}

export function navigate(routeName = 'home') {
  const nextRoute = routes[routeName] ? routeName : 'home';
  currentRoute = nextRoute;
  setActiveRoute(nextRoute);
  routes[nextRoute]?.render?.();
  emit(Events.ROUTE_CHANGED, { route: nextRoute });
}

export function initRouter(routeMap, defaultRoute = 'home') {
  routes = routeMap;

  $all('[data-route]').forEach((button) => {
    button.addEventListener('click', () => navigate(button.dataset.route));
  });

  navigate(defaultRoute);
}

export function getCurrentRoute() {
  return currentRoute;
}
