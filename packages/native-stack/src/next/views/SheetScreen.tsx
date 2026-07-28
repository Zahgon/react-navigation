import { usePreventRemoveContext, useTheme } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import { FormSheet } from 'react-native-screens';

import type {
  NativeStackDescriptor,
  NativeStackNavigationHelpers,
} from '../../types';

type Props = {
  descriptor: NativeStackDescriptor;
  navigation: NativeStackNavigationHelpers;
  isOpen: boolean;
  isPopped: boolean;
  onRemovePoppedRoute: (key: string) => void;
  onNativeDismiss: (markNativelyDismissed: boolean) => void;
  onNativeDismissPrevented: () => void;
};

export function SheetScreen({
  descriptor,
  navigation,
  isOpen,
  isPopped,
  onRemovePoppedRoute,
  onNativeDismiss,
  onNativeDismissPrevented,
}: Props) {
  const { preventedRoutes } = usePreventRemoveContext();
  const { colors } = useTheme();

  const { options, route: sheetRoute } = descriptor;

  const emitSheetTransition = (
    type: 'transitionStart' | 'transitionEnd',
    closing: boolean
  ) => {
    navigation.emit({ type, data: { closing }, target: sheetRoute.key });
  };

  const isRemovePrevented =
    preventedRoutes[sheetRoute.key]?.preventRemove === true;

  return (
    <FormSheet
      isOpen={isOpen}
      detents={options.sheetAllowedDetents}
      initialDetentIndex={options.sheetInitialDetentIndex}
      largestUndimmedDetentIndex={options.sheetLargestUndimmedDetentIndex}
      preferredCornerRadius={options.sheetCornerRadius}
      prefersGrabberVisible={options.sheetGrabberVisible}
      prefersScrollingExpandsWhenScrolledToEdge={
        options.sheetExpandsWhenScrolledToEdge
      }
      // This prop only represents a removal blocked by usePreventRemove.
      // FormSheet has no gestureEnabled prop, so gestureEnabled is unsupported
      // and must not be approximated by preventing native dismissal.
      preventNativeDismiss={isRemovePrevented}
      onWillAppear={() => emitSheetTransition('transitionStart', false)}
      onDidAppear={() => emitSheetTransition('transitionEnd', false)}
      onWillDisappear={() => emitSheetTransition('transitionStart', true)}
      onDidDisappear={() => {
        emitSheetTransition('transitionEnd', true);

        if (isPopped) {
          onRemovePoppedRoute(sheetRoute.key);
        }
      }}
      onDetentChanged={(event) => {
        navigation.emit({
          type: 'sheetDetentChange',
          // FormSheet emits this callback only after the sheet settles at the
          // new detent, so the event is always stable.
          data: { index: event.nativeEvent.index, stable: true },
          target: sheetRoute.key,
        });
      }}
      onNativeDismiss={() => {
        // Android can still dismiss because its preventNativeDismiss setter
        // is empty. Do not record a native removal while usePreventRemove is
        // active, because the router can reject the matching pop action and
        // keep this route in state.
        onNativeDismiss(!isRemovePrevented);
      }}
      onNativeDismissPrevented={onNativeDismissPrevented}
    >
      <View
        style={[
          options.sheetAllowedDetents === 'fitToContents'
            ? styles.fit
            : styles.fill,
          { backgroundColor: colors.background },
          options.contentStyle,
        ]}
      >
        {descriptor.render()}
      </View>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  fit: {
    width: '100%',
  },
  fill: {
    flex: 1,
  },
});
