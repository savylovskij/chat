import { MessagePosition } from '../models/message-position.type';

interface BorderRadiusStyle {
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomRightRadius: number;
  borderBottomLeftRadius: number;
}

const RADIUS_LARGE = 20;
const RADIUS_SMALL = 6;

export function getPositionBorderRadius(
  position: MessagePosition,
  isOwn: boolean,
): BorderRadiusStyle {
  if (isOwn) {
    switch (position) {
      case 'single':
        return {
          borderTopLeftRadius: RADIUS_LARGE,
          borderTopRightRadius: RADIUS_LARGE,
          borderBottomRightRadius: RADIUS_SMALL,
          borderBottomLeftRadius: RADIUS_LARGE,
        };
      case 'first':
        return {
          borderTopLeftRadius: RADIUS_LARGE,
          borderTopRightRadius: RADIUS_LARGE,
          borderBottomRightRadius: RADIUS_SMALL,
          borderBottomLeftRadius: RADIUS_LARGE,
        };
      case 'middle':
        return {
          borderTopLeftRadius: RADIUS_LARGE,
          borderTopRightRadius: RADIUS_SMALL,
          borderBottomRightRadius: RADIUS_SMALL,
          borderBottomLeftRadius: RADIUS_LARGE,
        };
      case 'last':
        return {
          borderTopLeftRadius: RADIUS_LARGE,
          borderTopRightRadius: RADIUS_SMALL,
          borderBottomRightRadius: RADIUS_LARGE,
          borderBottomLeftRadius: RADIUS_LARGE,
        };
    }
  } else {
    switch (position) {
      case 'single':
        return {
          borderTopLeftRadius: RADIUS_LARGE,
          borderTopRightRadius: RADIUS_LARGE,
          borderBottomRightRadius: RADIUS_LARGE,
          borderBottomLeftRadius: RADIUS_SMALL,
        };
      case 'first':
        return {
          borderTopLeftRadius: RADIUS_LARGE,
          borderTopRightRadius: RADIUS_LARGE,
          borderBottomRightRadius: RADIUS_LARGE,
          borderBottomLeftRadius: RADIUS_SMALL,
        };
      case 'middle':
        return {
          borderTopLeftRadius: RADIUS_SMALL,
          borderTopRightRadius: RADIUS_LARGE,
          borderBottomRightRadius: RADIUS_LARGE,
          borderBottomLeftRadius: RADIUS_SMALL,
        };
      case 'last':
        return {
          borderTopLeftRadius: RADIUS_SMALL,
          borderTopRightRadius: RADIUS_LARGE,
          borderBottomRightRadius: RADIUS_LARGE,
          borderBottomLeftRadius: RADIUS_LARGE,
        };
    }
  }
}
