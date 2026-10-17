import * as THREE from 'three';
import type { CountryTexture } from './countryTexture';

export const EARTH_RADIUS = 1;
/** 陸がどれくらい盛り上がるか（地球の半径に対する割合） */
const LAND_HEIGHT = 0.009;

/** 色テクスチャ＋高さ地図を貼った地球本体 */
export function createEarth(tex: CountryTexture): THREE.Mesh {
  // 細かく分割した球。陸の盛り上がり（displacement）をなめらかに見せるため
  const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 384, 192);
  const material = new THREE.MeshStandardMaterial({
    map: tex.colorTexture,
    displacementMap: tex.heightTexture,
    displacementScale: LAND_HEIGHT,
    bumpMap: tex.heightTexture,
    bumpScale: 6,
    roughness: 0.75,
    metalness: 0,
  });
  // シェーダーに手を加える：
  //  1) ズームしたときの「詳しい絵」を、見ている場所にだけ重ねる
  //  2) 海の上に、ゆらゆら動く光のさざなみを足す
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, tex.detailUniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform sampler2D detailMap;
        uniform vec4 detailRect;
        uniform float detailMix;
        uniform float time;`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec4 sampledDiffuseColor = texture2D(map, vMapUv);
        vec2 dUv = vec2(fract(vMapUv.x - detailRect.x) / detailRect.z, (vMapUv.y - detailRect.y) / detailRect.w);
        vec4 detail = texture2D(detailMap, clamp(dUv, 0.0, 1.0));
        float inside = step(dUv.x, 1.0) * step(0.0, dUv.y) * step(dUv.y, 1.0);
        float edge = smoothstep(0.0, 0.08, min(min(dUv.x, 1.0 - dUv.x), min(dUv.y, 1.0 - dUv.y)));
        sampledDiffuseColor = mix(sampledDiffuseColor, detail, inside * edge * detailMix);
        diffuseColor *= sampledDiffuseColor;

        // 海のさざなみ（陸の高さが 0 に近い所だけ）。緯度でつぶれないよう、経度方向を cos(緯度) で補正
        float seaLevel = texture2D(bumpMap, vBumpMapUv).r;
        float sea = 1.0 - smoothstep(0.015, 0.06, seaLevel);
        float latR = (vMapUv.y - 0.5) * PI;
        vec2 q = vec2(vMapUv.x * 360.0 * cos(latR), vMapUv.y * 180.0) * 0.45;
        float wave = sin(q.x + time * 0.35 + 1.6 * sin(q.y * 0.8 + time * 0.2))
                   * sin(q.y * 1.1 - time * 0.3 + 1.4 * sin(q.x * 0.7 - time * 0.15));
        diffuseColor.rgb += sea * smoothstep(0.2, 1.0, wave) * vec3(0.025, 0.04, 0.055);
        `,
      );
  };
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'earth';
  return mesh;
}

/** 地球のふちがふんわり光る「大気」 */
export function createAtmosphere(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.12, 96, 48);
  const material = new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color('#6ec8ff') } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 glowColor;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        // 裏面を描くので、ふち（視線と法線が直角に近い所）ほど明るい
        float rim = dot(vNormal, vViewDir);
        float intensity = pow(clamp(0.72 + rim, 0.0, 1.0), 5.0);
        gl_FragColor = vec4(glowColor, intensity);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(geometry, material);
}
