import * as THREE from 'three';

/**
 * 動物用のマテリアル。
 *  - なめらかな陰影（カクカクしない）で、本物っぽく
 *  - シェーダーの中で、足をつけね（pivot）を中心にふって「歩く」動きを作る
 *    右前と左後ろ、左前と右後ろが同時に動く（本物の4本足の歩き方）
 *  - しっぽはゆらゆら左右にゆれる
 *
 * 1匹ずつの「歩きの強さ・タイミング」は、インスタンスごとの属性 aAnim（x: タイミング, y: 歩きの強さ 0〜1）で決める。
 */
export interface AnimalMaterialUniforms {
  uTime: { value: number };
  /** 1 にすると全員が歩く（開発用のギャラリーで動きを確かめるため） */
  uWalkAll: { value: number };
}

export function createAnimalMaterial(uniforms: AnimalMaterialUniforms) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        attribute float aPart;
        attribute vec3 aPivot;
        attribute vec2 aAnim;
        uniform float uTime;
        uniform float uWalkAll;
        mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
        mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
        mat3 partRotation() {
          if (aPart < 0.5) return mat3(1.0);
          float walk = max(aAnim.y, uWalkAll);
          float t = uTime * 6.5 + aAnim.x;
          if (aPart < 4.5) {
            // 1:右前 2:左前 3:右後ろ 4:左後ろ → 1と4、2と3がいっしょに動く
            float off = (aPart < 1.5 || aPart > 3.5) ? 0.0 : 3.14159;
            return rotZ(sin(t + off) * 0.42 * walk);
          }
          if (aPart < 5.5) return rotY(sin(uTime * 2.4 + aAnim.x) * 0.35);
          return mat3(1.0);
        }`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `#include <beginnormal_vertex>
        mat3 partR = partRotation();
        objectNormal = partR * objectNormal;`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        transformed = partR * (transformed - aPivot) + aPivot;`,
      );
  };
  return material;
}
