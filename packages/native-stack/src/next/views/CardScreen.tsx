import {
  NavigationProvider,
  usePreventRemoveContext,
  useTheme,
} from '@react-navigation/native';
import { Stack } from 'react-native-screens';

import type {
  NativeStackDescriptor,
  NativeStackNavigationHelpers,
} from '../../types';
import { CardContent } from './CardContent';
import { HeaderConfig } from './HeaderConfig';

type Props = {
  descriptor: NativeStackDescriptor;
  previousDescriptor: NativeStackDescriptor | undefined;
  navigation: NativeStackNavigationHelpers;
  isFocused: boolean;
  isBeforeLast: boolean;
  isPopped: boolean;
  isDetached: boolean;
  onRemovePoppedRoute: (key: string) => void;
  onNativeDismiss: () => void;
  onNativeDismissPrevented: () => void;
};

export function CardScreen({
  descriptor,
  previousDescriptor,
  navigation,
  isFocused,
  isBeforeLast,
  isPopped,
  isDetached,
  onRemovePoppedRoute,
  onNativeDismiss,
  onNativeDismissPrevented,
}: Props) {
  const { colors } = useTheme();
  const { preventedRoutes } = usePreventRemoveContext();

  const { route, options } = descriptor;
  const { inactiveBehavior = 'pause' } = options;

  const emitTransition = (
    type: 'transitionStart' | 'transitionEnd',
    closing: boolean
  ) => {
    navigation.emit({ type, data: { closing }, target: route.key });
  };

  const isRemovePrevented = preventedRoutes[route.key]?.preventRemove;
  const hasNestedState = 'state' in route && route.state != null;

  let activityMode: 'normal' | 'inert' | 'paused' | 'unmounted';

  if (isPopped || isDetached) {
    activityMode = 'inert';
  } else if (isFocused || isBeforeLast) {
    activityMode = 'normal';
  } else if (inactiveBehavior === 'none') {
    activityMode = 'normal';
  } else if (inactiveBehavior === 'unmount' && !hasNestedState) {
    activityMode = 'unmounted';
  } else {
    activityMode = 'paused';
  }

  return (
    <Stack.Screen
      screenKey={route.key}
      activityMode={isPopped || isDetached ? 'detached' : 'attached'}
      preventNativeDismiss={isRemovePrevented}
      onWillAppear={() => emitTransition('transitionStart', false)}
      onDidAppear={() => emitTransition('transitionEnd', false)}
      onWillDisappear={() => emitTransition('transitionStart', true)}
      onDidDisappear={() => emitTransition('transitionEnd', true)}
      onDismiss={onRemovePoppedRoute}
      onNativeDismiss={onNativeDismiss}
      onNativeDismissPrevented={onNativeDismissPrevented}
    >
      <NavigationProvider navigation={descriptor.navigation} route={route}>
        <HeaderConfig
          descriptor={descriptor}
          previousDescriptor={previousDescriptor}
        >
          {(headerBack) => (
            <CardContent
              descriptor={descriptor}
              headerBack={headerBack}
              activityMode={activityMode}
              backgroundColor={colors.background}
            />
          )}
        </HeaderConfig>
      </NavigationProvider>
    </Stack.Screen>
  );
}
