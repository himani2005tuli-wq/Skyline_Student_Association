import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* Three.js hero scene — wireframe ridgeline under a starfield, with a
   pulsing summit beacon and gentle mouse parallax. Renders a single
   static frame when the user prefers reduced motion. */
export default function HeroScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0e17, 0.026);

    const camera = new THREE.PerspectiveCamera(
      55,
      el.clientWidth / Math.max(el.clientHeight, 1),
      0.1,
      200,
    );
    camera.position.set(0, 5.5, 15);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    /* ridgeline terrain */
    const geo = new THREE.PlaneGeometry(90, 44, 96, 56);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const ridge =
        Math.sin(x * 0.16) * Math.cos(y * 0.2) * 1.8 +
        Math.sin(x * 0.05 + y * 0.09) * 3.1 +
        Math.cos(x * 0.8 + 2) * 0.35;
      const falloff = 1 - Math.min(Math.abs(x) / 46, 1) * 0.55;
      pos.setZ(i, ridge * falloff);
    }
    geo.rotateX(-Math.PI / 2);
    const terrainMat = new THREE.MeshBasicMaterial({
      color: 0x39496e,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const terrain = new THREE.Mesh(geo, terrainMat);
    terrain.position.y = -3.2;
    scene.add(terrain);

    const terrainFar = new THREE.Mesh(
      geo.clone(),
      new THREE.MeshBasicMaterial({
        color: 0x1c2740,
        wireframe: true,
        transparent: true,
        opacity: 0.65,
      }),
    );
    terrainFar.position.set(-14, -1.4, -22);
    terrainFar.scale.set(0.7, 0.9, 0.7);
    scene.add(terrainFar);

    /* starfield */
    const starCount = 900;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 90;
      starPos[i * 3 + 1] = Math.random() * 26 - 2;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 60 - 10;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xf6f2e9,
        size: 0.09,
        transparent: true,
        opacity: 0.75,
        sizeAttenuation: true,
      }),
    );
    scene.add(stars);

    /* summit beacon */
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xff4d1c }),
    );
    beacon.position.set(-7.5, 3.4, -6);
    scene.add(beacon);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xff4d1c, transparent: true, opacity: 0.22 }),
    );
    halo.position.copy(beacon.position);
    scene.add(halo);

    const mouse = { x: 0, y: 0 };
    const onMove = (e) => {
      mouse.x = e.clientX / window.innerWidth - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
    };
    if (!reduced) window.addEventListener('pointermove', onMove, { passive: true });

    const onResize = () => {
      camera.aspect = el.clientWidth / Math.max(el.clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    let raf;
    const clock = new THREE.Clock();
    const tick = () => {
      const t = clock.getElapsedTime();
      beacon.scale.setScalar(1 + Math.sin(t * 2.4) * 0.18);
      halo.scale.setScalar(1 + Math.sin(t * 2.4 + 1.2) * 0.3);
      halo.material.opacity = 0.14 + Math.abs(Math.sin(t * 1.4)) * 0.14;
      stars.rotation.y = t * 0.008;
      camera.position.x += (mouse.x * 2.6 - camera.position.x) * 0.04;
      camera.position.y += (5.5 + mouse.y * 1.4 - camera.position.y) * 0.04;
      camera.lookAt(0, 1.5, -4);
      renderer.render(scene, camera);
      if (!reduced) raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
      geo.dispose();
      starGeo.dispose();
      terrainMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
      data-testid="hero-3d-scene"
    />
  );
}
