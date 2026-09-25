/* How the pose editor DRAWS a skeleton on screen (design-pass screen-13 §S4)
   — colours and sizes only, pure.

   DISPLAY, NEVER EXPORT. The PNG a save writes is drawn server side by
   `pose_render.py` from the keypoints alone, with the OpenPose colours
   ControlNet expects; nothing here reaches it. That is why these hues can be
   quiet: they only have to separate limbs for the eye, next to the dash
   patterns that already separate them without colour (`limbDash`,
   `handEdgeDash`, design-pass screen-6 §A6). */
import { handEdgeFinger, HAND_JOINT_GROUPS } from './poseTopology'

const ARM_R = 'var(--pose-arm-r)'
const ARM_L = 'var(--pose-arm-l)'
const LEG_R = 'var(--pose-leg-r)'
const LEG_L = 'var(--pose-leg-l)'
const HEAD = 'var(--pose-head)'
const NECK = 'var(--dim)'

/* By position in BODY_LIMBS: [1,2] [1,5] [2,3] [3,4] [5,6] [6,7] [1,8] [8,9]
   [9,10] [1,11] [11,12] [12,13] [1,0] [0,14] [14,16] [0,15] [15,17]. */
const LIMB_COLORS = [
  ARM_R, ARM_L, ARM_R, ARM_R, ARM_L, ARM_L, LEG_R, LEG_R,
  LEG_R, LEG_L, LEG_L, LEG_L, NECK, HEAD, HEAD, HEAD, HEAD,
]

export function limbColor(limbIndex: number): string {
  return LIMB_COLORS[limbIndex] ?? NECK
}

/* One hue per finger, the same five as the body so the two views read alike. */
const FINGER_COLORS = [ARM_R, ARM_L, LEG_R, LEG_L, HEAD]

export function fingerEdgeColor(edgeIndex: number): string {
  const finger = HAND_JOINT_GROUPS.indexOf(handEdgeFinger(edgeIndex)) - 1 // wrist excluded
  return FINGER_COLORS[finger] ?? NECK
}

/** Bones stay this wide ON SCREEN whatever the zoom (`non-scaling-stroke`):
    at 8x a canvas-unit stroke would bury the joints it links. */
export const BONE_WIDTH = 3
export const HAND_BONE_WIDTH = 2
export const BONE_OPACITY = 0.85

/** The paint of one joint circle. Selected: filled with the text colour,
    ringed with the accent. Unplaced: no fill, a dotted ring. Otherwise a
    panel-coloured disc with a text-coloured outline. */
export function jointPaint(isSelected: boolean, placed: boolean): {
  fill: string
  stroke: string
  strokeWidth: number
  strokeDasharray?: string
} {
  if (isSelected) return { fill: 'var(--txt)', stroke: 'var(--acc)', strokeWidth: 2 }
  if (!placed) return { fill: 'none', stroke: 'var(--dim2)', strokeWidth: 1.4, strokeDasharray: '2 2' }
  return { fill: 'var(--panel)', stroke: 'var(--txt)', strokeWidth: 1.4 }
}
