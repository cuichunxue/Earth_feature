import * as THREE from 'three';
import type { CountryTexture } from './countryTexture';

export const EARTH_RADIUS = 1;
/** 陸がどれくらい盛り上がるか（地球の半径に対する割合） */
const LAND_HEIGHT = 0.008;

/** 色テクスチャ＋高さ地図を貼った地球本体 */
export function createEarth(tex: CountryTexture): THREE.Mesh {
  // 細かく分割した球。陸の盛り上がり（displacement）をなめらかに見せるため
  const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 384, 192);
  const material = new THREE.MeshStandardMaterial({
    map: tex.colorTexture,
    displacementMap: tex.heightTexture,
    displacementScale: LAND_HEIGHT,
    bumpMap: tex.heightTexture,
    bumpScale: 3,
    roughness: 0.75,
    metalness: 0,
  });
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
