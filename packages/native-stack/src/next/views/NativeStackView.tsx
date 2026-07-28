import { SafeAreaProviderCompat } from '@react-navigation/elements/internal';
import {
  type ParamListBase,
  type Route,
  StackActions,
  type StackNavigationState,
} from '@react-navigation/native';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'react-native-screens';

import type {
  NativeStackDescriptorMap,
  NativeStackNavigationHelpers,
} from '../../types';
import { useDismissedRouteError } from '../../utils/useDismissedRouteError';
import { useInvalidPreventRemoveError } from '../../utils/useInvalidPreventRemoveError';
import { CardScreen } from './CardScreen';
import { useViewState } from './NativeStackViewState';
import { SheetScreen } from './SheetScreen';

type Props = {
  state: StackNavigationState<ParamListBase>;
  navigation: NativeStackNavigationHelpers;
  descriptors: NativeStackDescriptorMap;
};

export function NativeStackView({ state, navigation, descriptors }: Props) {
  useInvalidPreventRemoveError(descriptors);

  const [view, dispatch] = useViewState({
    state,
    descriptors,
  });
  const { setNextDismissedKey } = useDismissedRouteError(state);
  const removePoppedRoute = (key: string) => {
    dispatch({ type: 'REMOVE_POPPED_ROUTE', key });
  };

  // The native screen stayed in place, but the attempted removal still needs to
  // pass through the router. This lets usePreventRemove deliver the blocked
  // action to the app for confirmation.
  const dispatchPreventedPop = (key: string) => {
    navigation.dispatch({
      ...StackActions.pop(),
      source: key,
      target: state.key,
    });
  };

  // Pops the routes after their screens were dismissed natively, so the JS
  // state catches up with the native stack.
  const dismissRoutes = ({
    routeIndex,
    source,
    markNativelyDismissed,
  }: {
    routeIndex: number | undefined;
    source: string;
    markNativelyDismissed: boolean;
  }) => {
    if (routeIndex == null) {
      return;
    }

    const dismissedRoute = state.routes[routeIndex];
    const dismissCount = state.index - routeIndex + 1;

    if (dismissedRoute == null || dismissCount < 1) {
      return;
    }

    if (markNativelyDismissed) {
      dispatch({
        type: 'ADD_NATIVELY_DISMISSED_ROUTES',
        keys: state.routes
          .slice(routeIndex, state.index + 1)
          .map((route) => route.key),
      });
    }

    navigation.dispatch({
      ...StackActions.pop(dismissCount),
      source,
      target: state.key,
    });

    if (markNativelyDismissed) {
      setNextDismissedKey(dismissedRoute.key);
    }
  };

  const activeRoutes = state.routes.slice(0, state.index + 1);
  const detachedRoutes = state.routes.slice(state.index + 1);

  const renderedRoutes = view.renderedRoutes;
  const poppedByKey = view.poppedByKey;
  const detachedRouteKeys = new Set(detachedRoutes.map((route) => route.key));

  const getDescriptor = (route: Route<string>) => {
    const descriptor =
      descriptors[route.key] ?? poppedByKey.get(route.key)?.descriptor;

    if (descriptor == null) {
      throw new Error(
        `Couldn't find descriptor for route ${route.name} (${route.key}). This is likely a bug.`
      );
    }

    return descriptor;
  };

  const stateRouteIndexByKey = new Map(
    state.routes.map((route, index) => [route.key, index])
  );

  const getPreviousDescriptor = (route: Route<string>) => {
    const poppedRoute = poppedByKey.get(route.key);

    if (poppedRoute != null) {
      return poppedRoute.previousDescriptor;
    }

    const stateIndex = stateRouteIndexByKey.get(route.key);
    const previousRoute =
      stateIndex == null ? undefined : state.routes[stateIndex - 1];

    return previousRoute == null ? undefined : getDescriptor(previousRoute);
  };

  const isFormSheet = (route: Route<string>) =>
    (Platform.OS === 'android' || Platform.OS === 'ios') &&
    getDescriptor(route).options.presentation === 'formSheet';

  const firstRoute = activeRoutes[0];

  if (firstRoute != null && isFormSheet(firstRoute)) {
    throw new Error(
      `The route '${firstRoute.name}' cannot use 'formSheet' presentation because it is the first route in the native stack. Add a screen with 'card' presentation before it.`
    );
  }

  let activeSheetRoute: Route<string> | undefined;
  let routeAboveSheet: Route<string> | undefined;

  for (const [index, route] of activeRoutes.entries()) {
    if (isFormSheet(route)) {
      activeSheetRoute = route;
      routeAboveSheet = activeRoutes[index + 1];
      break;
    }
  }

  if (activeSheetRoute != null && routeAboveSheet != null) {
    throw new Error(
      `The route '${routeAboveSheet.name}' was pushed above the form sheet route '${activeSheetRoute.name}' in the same native stack. A form sheet does not create a nested stack automatically. Render a nested navigator inside '${activeSheetRoute.name}' and push '${routeAboveSheet.name}' on that nested navigator instead.`
    );
  }

  const cardRoutes: Route<string>[] = [];
  const sheetRoutes: Route<string>[] = [];

  for (const route of renderedRoutes) {
    if (isFormSheet(route)) {
      sheetRoutes.push(route);
    } else {
      cardRoutes.push(route);
    }
  }

  const closingSheetRoute = sheetRoutes.find((route) =>
    poppedByKey.has(route.key)
  );

  if (activeSheetRoute != null && closingSheetRoute != null) {
    throw new Error(
      `The form sheet route '${activeSheetRoute.name}' cannot replace '${closingSheetRoute.name}' in the same native stack. Wait for the previous sheet to close before presenting another sheet.`
    );
  }

  const sheets = sheetRoutes.map((route) => {
    const routeIndex = stateRouteIndexByKey.get(route.key);

    return (
      <SheetScreen
        key={route.key}
        descriptor={getDescriptor(route)}
        navigation={navigation}
        isOpen={routeIndex === state.index}
        isPopped={poppedByKey.has(route.key)}
        onRemovePoppedRoute={removePoppedRoute}
        onNativeDismiss={(markNativelyDismissed) => {
          dismissRoutes({
            routeIndex,
            source: route.key,
            markNativelyDismissed,
          });
        }}
        onNativeDismissPrevented={() => {
          if (routeIndex == null) {
            return;
          }

          dispatchPreventedPop(route.key);
        }}
      />
    );
  });

  const cards = cardRoutes.map((route) => {
    const routeIndex = stateRouteIndexByKey.get(route.key);

    return (
      <CardScreen
        key={route.key}
        descriptor={getDescriptor(route)}
        previousDescriptor={getPreviousDescriptor(route)}
        navigation={navigation}
        isFocused={routeIndex === state.index}
        isBeforeLast={routeIndex === state.index - 1}
        isPopped={poppedByKey.has(route.key)}
        isDetached={detachedRouteKeys.has(route.key)}
        onRemovePoppedRoute={removePoppedRoute}
        onNativeDismiss={() => {
          dismissRoutes({
            routeIndex,
            source: route.key,
            markNativelyDismissed: true,
          });
        }}
        onNativeDismissPrevented={() => {
          dispatchPreventedPop(route.key);
        }}
      />
    );
  });

  return (
    <SafeAreaProviderCompat>
      <View style={styles.container}>
        {cards.length > 0 ? <Stack.Host>{cards}</Stack.Host> : null}
        {sheets}
      </View>
    </SafeAreaProviderCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
