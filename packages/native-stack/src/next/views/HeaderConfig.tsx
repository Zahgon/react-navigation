import { Stack } from 'react-native-screens';

import {
  getHeaderConfigBase,
  type HeaderConfigProps,
  useHeaderConfig,
} from './HeaderConfigShared';

export function HeaderConfig(props: HeaderConfigProps) {
  const config = useHeaderConfig(props);

  return (
    <>
      {props.children(config.headerBack)}
      <Stack.HeaderConfig
        {...getHeaderConfigBase(config, config.headerLeftElement != null)}
      />
    </>
  );
}
