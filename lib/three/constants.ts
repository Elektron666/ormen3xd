/** Material name given to upholstered parts of the built-in procedural models. */
export const FABRIC_MATERIAL = "kumas";
export const WOOD_MATERIAL = "ahsap";

/**
 * Render layers. Room, lights and shadows live on layer 0; the furniture is on
 * its own layer so compare mode can draw a second, differently dressed copy
 * on the other side of the split.
 */
export const LAYER_PRIMARY = 1;
export const LAYER_COMPARE = 2;
