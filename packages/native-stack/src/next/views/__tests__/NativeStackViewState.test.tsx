import { expect, test } from '@jest/globals';
import type { ParamListBase, Route } from '@react-navigation/native';

import type {
  NativeStackDescriptorMap,
  NativeStackNavigationProp,
} from '../../../types';
import { type NativeStackViewState, reducer } from '../NativeStackViewState';

const createRoute = (name: string): Route<string> => ({
  key: name,
  name,
});

const A = createRoute('A');
const B = createRoute('B');
const C = createRoute('C');
const D = createRoute('D');

function getParent(): NativeStackNavigationProp<ParamListBase> {
  return navigation;
}

const navigation = {
  addListener: () => () => {},
  canGoBack: () => false,
  dispatch: () => {},
  getParent,
  getState: () => ({
    stale: false,
    type: 'stack',
    key: 'stack',
    index: 0,
    routeNames: [],
    routes: [],
    retainedRouteKeys: [],
  }),
  goBack: () => {},
  isFocused: () => true,
  navigate: () => {},
  pop: () => {},
  popTo: () => {},
  popToTop: () => {},
  preload: () => {},
  push: () => {},
  pushParams: () => {},
  removeListener: () => {},
  replace: () => {},
  replaceParams: () => {},
  reset: () => {},
  retain: () => {},
  setOptions: () => {},
  setParams: () => {},
} satisfies NativeStackNavigationProp<ParamListBase>;

const descriptors = {
  A: {
    navigation,
    options: {},
    render: () => <></>,
    route: A,
  },
  B: {
    navigation,
    options: {},
    render: () => <></>,
    route: B,
  },
  C: {
    navigation,
    options: {},
    render: () => <></>,
    route: C,
  },
  D: {
    navigation,
    options: {},
    render: () => <></>,
    route: D,
  },
} satisfies NativeStackDescriptorMap;

function createState(): NativeStackViewState {
  const routes = [A, B, C];

  return {
    previous: { index: 2, routes },
    renderedRoutes: routes,
    poppedByKey: new Map(),
    nativelyDismissedRouteKeys: new Set(),
  };
}

const syncState = (
  state: NativeStackViewState,
  routes: Route<string>[],
  previousDescriptors: NativeStackDescriptorMap = descriptors
) =>
  reducer(
    state,
    {
      type: 'SYNC_STATE',
      index: routes.length - 1,
      routes,
    },
    previousDescriptors
  );

const getRouteKeys = (state: NativeStackViewState) =>
  state.renderedRoutes.map((route) => route.key);

const getPoppedRouteKeys = (state: NativeStackViewState) =>
  state.renderedRoutes
    .filter((route) => state.poppedByKey.has(route.key))
    .map((route) => route.key);

test('preserves route order across consecutive pops', () => {
  let state = syncState(createState(), [A, B]);

  state = syncState(state, [A]);

  expect(getRouteKeys(state)).toEqual(['A', 'B', 'C']);
  expect(getPoppedRouteKeys(state)).toEqual(['B', 'C']);
});

test('retains all routes removed by pop-to-top in their original order', () => {
  let state = syncState(createState(), [A]);

  expect(getRouteKeys(state)).toEqual(['A', 'B', 'C']);
  expect(getPoppedRouteKeys(state)).toEqual(['B', 'C']);

  state = reducer(
    state,
    {
      type: 'REMOVE_POPPED_ROUTE',
      key: 'C',
    },
    descriptors
  );

  expect(getRouteKeys(state)).toEqual(['A', 'B']);
  expect(getPoppedRouteKeys(state)).toEqual(['B']);
});

test('keeps a removed route above its replacement while it closes', () => {
  const state = syncState(createState(), [A, B, D]);

  expect(getRouteKeys(state)).toEqual(['A', 'B', 'D', 'C']);
  expect(getPoppedRouteKeys(state)).toEqual(['C']);
});

test('stops retaining a route when its key returns to navigation state', () => {
  let state = syncState(createState(), [A, B]);

  state = syncState(state, [A, B, C]);

  expect(getRouteKeys(state)).toEqual(['A', 'B', 'C']);
  expect(getPoppedRouteKeys(state)).toEqual([]);
});

test('does not retain routes that were dismissed natively', () => {
  let state = reducer(
    createState(),
    {
      type: 'ADD_NATIVELY_DISMISSED_ROUTES',
      keys: ['C'],
    },
    descriptors
  );

  state = syncState(state, [A, B]);

  expect(getRouteKeys(state)).toEqual(['A', 'B']);
  expect(getPoppedRouteKeys(state)).toEqual([]);
  expect(state.nativelyDismissedRouteKeys).toEqual(new Set());
});

test('retains a natively dismissed route if it stayed in navigation state', () => {
  let state = reducer(
    createState(),
    {
      type: 'ADD_NATIVELY_DISMISSED_ROUTES',
      keys: ['C'],
    },
    descriptors
  );

  // The pop action following the native dismissal didn't remove the route, e.g.
  // when a 'beforeRemove' listener prevented it.
  state = syncState(state, [A, B, C]);

  expect(state.nativelyDismissedRouteKeys).toEqual(new Set());

  state = syncState(state, [A, B]);

  expect(getRouteKeys(state)).toEqual(['A', 'B', 'C']);
  expect(getPoppedRouteKeys(state)).toEqual(['C']);
});

test('does not retain detached routes removed from navigation state', () => {
  const initialState: NativeStackViewState = {
    previous: { index: 1, routes: [A, B, C] },
    renderedRoutes: [A, B, C],
    poppedByKey: new Map(),
    nativelyDismissedRouteKeys: new Set(),
  };

  const state = syncState(initialState, [A, B]);

  expect(getRouteKeys(state)).toEqual(['A', 'B']);
  expect(getPoppedRouteKeys(state)).toEqual([]);
});

test('retains a popped route and its previous descriptor until dismissal', () => {
  const state = syncState(createState(), [A, B]);

  expect(state.poppedByKey.get('C')).toEqual({
    descriptor: descriptors.C,
    previousDescriptor: descriptors.B,
  });

  const dismissedState = reducer(
    state,
    {
      type: 'REMOVE_POPPED_ROUTE',
      key: 'C',
    },
    descriptors
  );

  expect(getRouteKeys(dismissedState)).toEqual(['A', 'B']);
  expect(getPoppedRouteKeys(dismissedState)).toEqual([]);
});
