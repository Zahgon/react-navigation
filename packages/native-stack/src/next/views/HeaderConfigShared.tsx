import { getHeaderTitle, HeaderBackContext } from '@react-navigation/elements';
import { useTheme } from '@react-navigation/native';
import * as React from 'react';
import { Platform } from 'react-native';
import type { StackHeaderConfigProps } from 'react-native-screens';

import type { NativeStackDescriptor } from '../../types';

export type HeaderConfigProps = {
  descriptor: NativeStackDescriptor;
  previousDescriptor?: NativeStackDescriptor | undefined;
  children: (
    headerBack: React.ContextType<typeof HeaderBackContext>
  ) => React.ReactNode;
};

export function useHeaderConfig({
  descriptor,
  previousDescriptor,
}: HeaderConfigProps) {
  const { colors } = useTheme();
  const parentHeaderBack = React.use(HeaderBackContext);
  const {
    header,
    headerLeft,
    headerRight,
    headerTitle,
    headerBackTitle,
    headerTintColor,
  } = descriptor.options;
  const tintColor =
    headerTintColor ?? (Platform.OS === 'ios' ? colors.primary : colors.text);

  const hasCustomHeader = header != null;
  const headerTitleText = getHeaderTitle(
    descriptor.options,
    descriptor.route.name
  );
  const previousHeaderTitle =
    previousDescriptor == null
      ? undefined
      : getHeaderTitle(
          previousDescriptor.options,
          previousDescriptor.route.name
        );
  const canGoBack = previousDescriptor != null || parentHeaderBack != null;
  const previousTitle = previousHeaderTitle ?? parentHeaderBack?.title;
  const headerBack = React.useMemo(
    () => (canGoBack ? { href: undefined, title: previousTitle } : undefined),
    [canGoBack, previousTitle]
  );

  const headerLeftElement = hasCustomHeader
    ? null
    : headerLeft?.({
        tintColor,
        canGoBack,
        label: headerBackTitle ?? headerBack?.title,
        href: undefined,
      });
  const headerTitleElement =
    !hasCustomHeader && typeof headerTitle === 'function'
      ? headerTitle({
          tintColor,
          children: headerTitleText,
        })
      : null;
  const headerRightElement = hasCustomHeader
    ? null
    : headerRight?.({
        tintColor,
        canGoBack,
      });

  return {
    descriptor,
    hasCustomHeader,
    headerBack,
    headerLeftElement,
    headerRightElement,
    headerTitleElement,
    headerTitleText,
    canGoBack,
    tintColor,
  };
}

type HeaderConfig = ReturnType<typeof useHeaderConfig>;

export function getHeaderConfigBase(
  config: HeaderConfig,
  usesHeaderLeftElement: boolean
): Omit<StackHeaderConfigProps, 'android' | 'ios'> {
  const {
    hasCustomHeader,
    headerTitleElement,
    headerTitleText,
    canGoBack,
    descriptor: { options },
  } = config;

  return {
    title: headerTitleElement == null ? headerTitleText : undefined,
    subtitle:
      typeof options.headerSubtitle === 'string'
        ? options.headerSubtitle
        : undefined,
    hidden: hasCustomHeader || options.headerShown === false,
    transparent: options.headerBackground != null || options.headerTransparent,
    backButtonHidden:
      options.headerBackVisible === false ||
      !canGoBack ||
      (usesHeaderLeftElement && options.headerBackVisible !== true),
  };
}
