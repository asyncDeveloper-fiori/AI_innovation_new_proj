import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'

/**
 * HeroScene — Interactive Three.js scene for the landing page.
 * 
 * Features:
 *  • 6 interactive wireframe/holographic geometric objects
 *  • Raycaster-based hover: objects glow, scale, spin faster
 *  • Click: particle burst explosion + spring-back
 *  • Mouse parallax: whole scene subtly tracks cursor
 *  • GSAP-driven entrance animation (stagger float-in)
 *  • Ambient particle cloud
 */
export default function HeroScene() {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    /* ─── Renderer ─────────────────────────────── */
    const W = el.clientWidth
    const H = el.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    /* ─── Scene / Camera ───────────────────────── */
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 500)
    camera.position.set(0, 0, 110)

    /* ─── Colour palette ───────────────────────── */
    const C = {
      blue:   0x3b82f6,
      cyan:   0x06b6d4,
      violet: 0x8b5cf6,
      indigo: 0x6366f1,
      white:  0xe2eeff,
    }

    /* ─── Helper: build an object with solid + wireframe ── */
    const makeObject = (geo, solidColor, wireColor, opacity = 0.08) => {
      const group = new THREE.Group()

      const solidMat = new THREE.MeshBasicMaterial({
        color: solidColor,
        transparent: true,
        opacity,
        side: THREE.FrontSide,
      })
      const solid = new THREE.Mesh(geo, solidMat)

      const wireMat = new THREE.MeshBasicMaterial({
        color: wireColor,
        wireframe: true,
        transparent: true,
        opacity: 0.65,
      })
      const wire = new THREE.Mesh(geo, wireMat)

      group.add(solid, wire)
      group.userData = { solidMat, wireMat, baseWireOpacity: 0.65, hovered: false }
      return group
    }

    /* ─── Geometric objects ────────────────────── */
    const objects = [
      {
        group: makeObject(new THREE.TorusKnotGeometry(10, 3.2, 128, 16), C.blue, C.cyan, 0.06),
        pos: [18, 6, -10], speed: { x: 0.003, y: 0.005, z: 0.002 }, scale: 1.0,
      },
      {
        group: makeObject(new THREE.IcosahedronGeometry(9, 1), C.violet, C.violet, 0.09),
        pos: [-26, 22, 5], speed: { x: 0.006, y: 0.004, z: 0.003 }, scale: 0.9,
      },
      {
        group: makeObject(new THREE.OctahedronGeometry(8, 0), C.cyan, C.cyan, 0.10),
        pos: [32, -20, -5], speed: { x: -0.005, y: 0.007, z: -0.003 }, scale: 0.85,
      },
      {
        group: makeObject(new THREE.DodecahedronGeometry(7, 0), C.indigo, C.indigo, 0.08),
        pos: [-18, -18, 8], speed: { x: 0.007, y: -0.004, z: 0.005 }, scale: 0.8,
      },
      {
        group: makeObject(new THREE.BoxGeometry(11, 11, 11), C.cyan, C.blue, 0.07),
        pos: [8, -30, -15], speed: { x: -0.004, y: 0.006, z: 0.004 }, scale: 0.75,
      },
      {
        group: makeObject(new THREE.TetrahedronGeometry(8, 0), C.violet, C.white, 0.09),
        pos: [-34, 8, -8], speed: { x: 0.005, y: -0.005, z: -0.004 }, scale: 0.7,
      },
    ]

    objects.forEach(({ group, pos, scale }) => {
      group.position.set(...pos)
      group.scale.setScalar(0) // start invisible, GSAP will reveal
      scene.add(group)
    })

    /* ─── Ambient particle cloud ───────────────── */
    const DUST = 600
    const dustGeo = new THREE.BufferGeometry()
    const dustPos = new Float32Array(DUST * 3)
    for (let i = 0; i < DUST; i++) {
      dustPos[i * 3]     = (Math.random() - 0.5) * 220
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 180
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 80
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
    const dustMat = new THREE.PointsMaterial({
      color: 0x3b82f6, size: 0.5,
      transparent: true, opacity: 0, sizeAttenuation: true,
    })
    const dust = new THREE.Points(dustGeo, dustMat)
    scene.add(dust)

    /* ─── GSAP entrance ────────────────────────── */
    const tl = gsap.timeline({ delay: 0.2 })
    tl.to(dustMat, { opacity: 0.4, duration: 2, ease: 'power2.out' }, 0)

    objects.forEach(({ group }, i) => {
      // Each object floats in from below-zero scale
      tl.to(group.scale, {
        x: objects[i].scale, y: objects[i].scale, z: objects[i].scale,
        duration: 1.1, ease: 'back.out(1.4)',
      }, 0.12 * i)
    })

    /* ─── Floating animation (GSAP infinite loops) ─ */
    objects.forEach(({ group }, i) => {
      const delay = i * 0.3
      gsap.to(group.position, {
        y: group.position.y + 4,
        duration: 2.8 + i * 0.4,
        ease: 'sine.inOut',
        yoyo: true, repeat: -1,
        delay,
      })
    })

    /* ─── Raycaster / mouse ─────────────────────── */
    const mouse     = new THREE.Vector2(-9, -9)
    const raycaster = new THREE.Raycaster()
    raycaster.params.Line = { threshold: 1 }

    // Collect all meshes for intersection
    const meshList = []
    objects.forEach(({ group }) => {
      group.traverse(child => {
        if (child.isMesh) {
          child.userData.parentGroup = group
          meshList.push(child)
        }
      })
    })

    // Parallax target
    const parallax = { x: 0, y: 0 }

    const onMouseMove = (e) => {
      const rect = el.getBoundingClientRect()
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1

      // Smooth parallax target
      gsap.to(parallax, {
        x: (e.clientX / window.innerWidth  - 0.5) * 14,
        y: (e.clientY / window.innerHeight - 0.5) * -10,
        duration: 1.8, ease: 'power2.out', overwrite: true,
      })
    }

    /* ─── Click → particle burst ───────────────── */
    const onMouseClick = () => {
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(meshList, false)
      if (!hits.length) return

      const hitGroup = hits[0].object.userData.parentGroup
      const hitColor = hitGroup.userData.wireMat.color.getHex()

      // Burst scale
      gsap.timeline()
        .to(hitGroup.scale, { x: 1.55, y: 1.55, z: 1.55, duration: 0.18, ease: 'power2.out' })
        .to(hitGroup.scale, {
          x: hitGroup.userData.targetScale || 1,
          y: hitGroup.userData.targetScale || 1,
          z: hitGroup.userData.targetScale || 1,
          duration: 0.8, ease: 'elastic.out(1, 0.4)',
        })

      gsap.to(hitGroup.rotation, {
        y: hitGroup.rotation.y + Math.PI * 3,
        duration: 1.0, ease: 'power3.out',
      })

      // Spawn particles
      const origin = hitGroup.position.clone()
      for (let i = 0; i < 14; i++) {
        const pg = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 5, 5),
          new THREE.MeshBasicMaterial({ color: hitColor, transparent: true, opacity: 1 }),
        )
        pg.position.copy(origin)
        scene.add(pg)

        const angle = (i / 14) * Math.PI * 2
        const r = 8 + Math.random() * 10
        gsap.to(pg.position, {
          x: origin.x + Math.cos(angle) * r,
          y: origin.y + Math.sin(angle) * r + (Math.random() - 0.5) * 6,
          z: origin.z + (Math.random() - 0.5) * 8,
          duration: 1.0, ease: 'power2.out',
        })
        gsap.to(pg.material, {
          opacity: 0, duration: 0.85, delay: 0.2,
          onComplete: () => {
            scene.remove(pg)
            pg.geometry.dispose()
            pg.material.dispose()
          },
        })
        gsap.to(pg.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 0.85, delay: 0.2 })
      }

      // Screen flash ring
      const ringGeo = new THREE.RingGeometry(0.5, 1.2, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: hitColor, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.position.copy(origin)
      ring.lookAt(camera.position)
      scene.add(ring)
      gsap.to(ring.scale, { x: 30, y: 30, z: 30, duration: 0.8, ease: 'power2.out' })
      gsap.to(ringMat, {
        opacity: 0, duration: 0.7, delay: 0.1,
        onComplete: () => { scene.remove(ring); ringGeo.dispose(); ringMat.dispose() },
      })
    }

    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('click', onMouseClick)

    /* ─── Resize ────────────────────────────────── */
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    /* ─── Animate loop ──────────────────────────── */
    let raf, t = 0
    let prevHovered = null

    const animate = () => {
      raf = requestAnimationFrame(animate)
      t += 0.01

      // Scene parallax
      scene.rotation.x += (parallax.y * 0.008 - scene.rotation.x) * 0.05
      scene.rotation.y += (parallax.x * 0.008 - scene.rotation.y) * 0.05

      // Raycaster hover
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(meshList, false)
      const hitGroup = hits.length ? hits[0].object.userData.parentGroup : null

      // Un-hover previous
      if (prevHovered && prevHovered !== hitGroup) {
        const g = prevHovered
        g.userData.hovered = false
        gsap.to(g.userData.wireMat, { opacity: 0.65, duration: 0.4 })
        gsap.to(g.scale, {
          x: g.userData.baseScale, y: g.userData.baseScale, z: g.userData.baseScale,
          duration: 0.5, ease: 'power2.out',
        })
        el.style.cursor = 'default'
      }

      // Hover new
      if (hitGroup && !hitGroup.userData.hovered) {
        hitGroup.userData.hovered = true
        hitGroup.userData.baseScale = hitGroup.scale.x
        gsap.to(hitGroup.userData.wireMat, { opacity: 1.0, duration: 0.3 })
        gsap.to(hitGroup.scale, {
          x: hitGroup.scale.x * 1.18,
          y: hitGroup.scale.y * 1.18,
          z: hitGroup.scale.z * 1.18,
          duration: 0.45, ease: 'back.out(2)',
        })
        el.style.cursor = 'pointer'
      }
      prevHovered = hitGroup

      // Rotate each object (hovered spins faster)
      objects.forEach(({ group, speed }) => {
        const multiplier = group.userData.hovered ? 4 : 1
        group.rotation.x += speed.x * multiplier
        group.rotation.y += speed.y * multiplier
        group.rotation.z += speed.z * multiplier
      })

      // Pulse dust
      dustMat.opacity = 0.25 + 0.15 * Math.sin(t * 0.5)
      dust.rotation.y = t * 0.02

      renderer.render(scene, camera)
    }
    animate()

    /* ─── Cleanup ───────────────────────────────── */
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('click', onMouseClick)
      window.removeEventListener('resize', onResize)
      tl.kill()
      gsap.killTweensOf([...objects.map(o => o.group.scale), ...objects.map(o => o.group.position), parallax, dustMat])

      objects.forEach(({ group }) => {
        group.traverse(child => {
          if (child.isMesh) { child.geometry.dispose(); child.material.dispose() }
        })
      })
      dustGeo.dispose(); dustMat.dispose()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, zIndex: 0, cursor: 'default' }}
    />
  )
}
