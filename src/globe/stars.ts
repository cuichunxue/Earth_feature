import * as THREE from 'three';

/** キラキラまたたく星空。1つの Points オブジェクトで数千個の星をまとめて描きます */
export function createStars(count = 4000): { points: THREE.Points; update: (t: number) => void } {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const palette = [new THREE.Color('#ffffff'), new THREE.Color('#ffe9a8'), new THREE.Color('#a8d8ff'), new THREE.Color('#ffc2e0')];
  const v = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    v.randomDirection().multiplyScalar(60 + Math.random() * 40);
    v.toArray(positions, i * 3);
    palette[Math.floor(Math.random() * palette.length)].toArray(colors, i * 3);
    sizes[i] = Math.random() < 0.04 ? 4 + Math.random() * 3 : 1 + Math.random() * 2;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, pixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute float phase;
      attribute vec3 color;
      uniform float time;
      uniform float pixelRatio;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vColor = color;
        vTwinkle = 0.55 + 0.45 * sin(time * (1.0 + phase * 0.3) + phase * 10.0);
        gl_PointSize = size * pixelRatio * (0.8 + 0.4 * vTwinkle);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, a * vTwinkle);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return {
    points,
    update: (t: number) => {
      material.uniforms.time.value = t;
      points.rotation.y = t * 0.003;
    },
  };
}
