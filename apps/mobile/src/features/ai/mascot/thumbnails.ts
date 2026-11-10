/**
 * Each mascot's "idle" image, for the picker in Settings. A separate file from aura-face.tsx's full
 * mascot+mood map because Metro needs a static `require(...)` at every call site that uses one.
 */

import type { MascotId } from './characters';

export const MASCOT_THUMBNAILS: Record<MascotId, number> = {
  robot: require('../../../../assets/images/mascot/characters/robot/idle.png'),
  Luffy: require('../../../../assets/images/mascot/characters/Luffy/idle.png'),
  Zoro: require('../../../../assets/images/mascot/characters/Zoro/idle.png'),
  Sanji: require('../../../../assets/images/mascot/characters/Sanji/idle.png'),
  Chopper: require('../../../../assets/images/mascot/characters/Chopper/idle.png'),
};
