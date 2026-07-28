import type {
  ParamListBase,
  Route,
  StackNavigationState,
} from '@react-navigation/native';
import * as React from 'react';

import type {
  NativeStackDescriptor,
  NativeStackDescriptorMap,
} from '../../types';

export type NativeStackViewState = {
  previous: {
    index: number;
    routes: Route<string>[];
  };
  renderedRoutes: Route<string>[];
  poppedByKey: Map<
    string,
    {
      descriptor: NativeStackDescriptor;
      previousDescriptor: NativeStackDescriptor | undefined;
    }
  >;
  nativelyDismissedRouteKeys: Set<string>;
};

type NativeStackViewStateAction =
  | {
      type: 'SYNC_STATE';
      index: number;
      routes: Route<string>[];
    }
  | { type: 'REMOVE_POPPED_ROUTE'; key: string }
  | { type: 'ADD_NATIVELY_DISMISSED_ROUTES'; keys: string[] };

export function reducer(
  state: NativeStackViewState,
  action: NativeStackViewStateAction,
  descriptors: NativeStackDescriptorMap
): NativeStackViewState {
  switch (action.type) {
    case 'SYNC_STATE': {
      const routeKeys = new Set(action.routes.map((route) => route.key));

      const poppedByKey = new Map(state.poppedByKey);

      for (const key of routeKeys) {
        // A route may be added again before its native pop finishes.
        poppedByKey.delete(key);
      }

      const previousActiveRoutes = state.previous.routes.slice(
        0,
        state.previous.index + 1
      );

      for (const [index, route] of previousActiveRoutes.entries()) {
        const descriptor = descriptors[route.key];

        if (
          descriptor == null ||
          routeKeys.has(route.key) ||
          poppedByKey.has(route.key) ||
          state.nativelyDismissedRouteKeys.has(route.key)
        ) {
          continue;
        }

        const previousRoute = previousActiveRoutes[index - 1];

        poppedByKey.set(route.key, {
          descriptor,
          previousDescriptor:
            previousRoute == null ? undefined : descriptors[previousRoute.key],
        });
      }

      // Current navigation state defines the new order. Popped routes are
      // inserted back at their previous boundaries so consecutive pops keep
      // their native stack order, while new routes stay underneath the routes
      // animating out.
      const poppedRoutesBeforeKey = new Map<
        string | undefined,
        Route<string>[]
      >();
      let nextRouteKey: string | undefined;

      for (let index = state.renderedRoutes.length - 1; index >= 0; index--) {
        const route = state.renderedRoutes[index];

        if (route == null) {
          continue;
        }

        if (routeKeys.has(route.key)) {
          nextRouteKey = route.key;
        } else if (poppedByKey.has(route.key)) {
          const poppedRoutes = poppedRoutesBeforeKey.get(nextRouteKey) ?? [];

          poppedRoutes.unshift(route);
          poppedRoutesBeforeKey.set(nextRouteKey, poppedRoutes);
        }
      }

      const renderedRoutes = action.routes
        .flatMap((route) => [
          ...(poppedRoutesBeforeKey.get(route.key) ?? []),
          route,
        ])
        .concat(poppedRoutesBeforeKey.get(undefined) ?? []);

      return {
        previous: {
          index: action.index,
          routes: action.routes,
        },
        renderedRoutes,
        poppedByKey,
        nativelyDismissedRouteKeys: new Set(),
      };
    }

    case 'REMOVE_POPPED_ROUTE': {
      if (!state.poppedByKey.has(action.key)) {
        return state;
      }

      const poppedByKey = new Map(state.poppedByKey);

      poppedByKey.delete(action.key);

      return {
        ...state,
        renderedRoutes: state.renderedRoutes.filter(
          (route) => route.key !== action.key
        ),
        poppedByKey,
      };
    }

    case 'ADD_NATIVELY_DISMISSED_ROUTES': {
      const nativelyDismissedRouteKeys = new Set(
        state.nativelyDismissedRouteKeys
      );
      let changed = false;

      for (const key of action.keys) {
        if (!nativelyDismissedRouteKeys.has(key)) {
          nativelyDismissedRouteKeys.add(key);
          changed = true;
        }
      }

      if (!changed) {
        return state;
      }

      return {
        ...state,
        nativelyDismissedRouteKeys,
      };
    }
  }
}

export function useViewState({
  state,
  descriptors,
}: {
  state: StackNavigationState<ParamListBase>;
  descriptors: NativeStackDescriptorMap;
}) {
  const descriptorsRef = React.useRef(descriptors);

  React.useInsertionEffect(() => {
    descriptorsRef.current = descriptors;
  }, [descriptors]);

  const [view, dispatch] = React.useReducer(
    (
      view: NativeStackViewState,
      action: NativeStackViewStateAction
    ): NativeStackViewState => reducer(view, action, descriptorsRef.current),
    {
      previous: {
        index: state.index,
        routes: state.routes,
      },
      renderedRoutes: state.routes,
      poppedByKey: new Map(),
      nativelyDismissedRouteKeys: new Set<string>(),
    }
  );

  if (
    state.index !== view.previous.index ||
    state.routes !== view.previous.routes
  ) {
    dispatch({
      type: 'SYNC_STATE',
      index: state.index,
      routes: state.routes,
    });
  }

  return [view, dispatch] as const;
}
