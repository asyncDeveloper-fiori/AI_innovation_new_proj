import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'

/**
 * NeuralBackground
 * ─────────────────
 * Boosted version:
 *  • 260 nodes (was 180)
 *  • Node opacity 0.75–1.0  (was 0.65–1.0 but starting from 0)
 *  • Edge MAX 500 (was 300), LINK_DIST 36 (was 28) — far more connections
 *  • Dust: 600 particles, size 0.45, opacity 0.75
 *  • Node sphere radius 0.65 (was 0.55)
 *  • z-index: 0 so it shows through semi-transparent glass panels
 */
export default function NeuralBackground() {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    /* ─── Renderer ──────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    /* ─── Scene / Camera ────────────────────────────── */
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 1000)
    camera.position.set(0, 0, 110)

    /* ─── Config ────────────────────────────────────── */
    const NODE_COUNT  = 260
    const SPREAD      = 115
    const LINK_DIST   = 36     // bigger = more visible connections
    const MAX_EDGES   = 500

    /* ─── Colour palette ─────────────────────────────── */
    const COLORS = [
      new THREE.Color(0x3b82f6),  // blue
      new THREE.Color(0x06b6d4),  // cyan
      new THREE.Color(0x8b5cf6),  // violet
      new THREE.Color(0x60a5fa),  // light blue
      new THREE.Color(0x22d3ee),  // bright cyan
    ]

    /* ─── Nodes ──────────────────────────────────────── */
    const nodeGeo = new THREE.SphereGeometry(0.65, 8, 8)
    const nodes   = []

    for (let i = 0; i < NODE_COUNT; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: COLORS[Math.floor(Math.random() * COLORS.length)].clone(),
        transparent: true,
        opacity: 0,
      })

      const mesh = new THREE.Mesh(nodeGeo, mat)
      const x = (Math.random() - 0.5) * SPREAD
      const y = (Math.random() - 0.5) * SPREAD
      const z = (Math.random() - 0.5) * SPREAD * 0.5

      mesh.position.set(x, y, z)
      mesh.userData.vx    = (Math.random() - 0.5) * 0.014
      mesh.userData.vy    = (Math.random() - 0.5) * 0.014
      mesh.userData.vz    = (Math.random() - 0.5) * 0.007
      mesh.userData.phase = Math.random() * Math.PI * 2

      scene.add(mesh)
      nodes.push(mesh)
    }

    /* ─── Edge pool ──────────────────────────────────── */
    const edgePool = []
    for (let i = 0; i < MAX_EDGES; i++) {
      const geo = new THREE.BufferGeometry()
      const pts = new Float32Array(6)
      geo.setAttribute('position', new THREE.BufferAttribute(pts, 3))
      const mat = new THREE.LineBasicMaterial({
        color: COLORS[Math.floor(Math.random() * COLORS.length)].clone(),
        transparent: true,
        opacity: 0,
      })
      const line = new THREE.Line(geo, mat)
      scene.add(line)
      edgePool.push({ line, geo, mat, active: false })
    }

    /* ─── Dust particles ─────────────────────────────── */
    const dustCount = 600
    const dustGeo   = new THREE.BufferGeometry()
    const dustPos   = new Float32Array(dustCount * 3)
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3]     = (Math.random() - 0.5) * 220
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 220
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 90
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
    const dustMat = new THREE.PointsMaterial({
      color: 0x3b82f6,
      size: 0.45,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
    })
    const dust = new THREE.Points(dustGeo, dustMat)
    scene.add(dust)

    /* ─── GSAP fade-in ───────────────────────────────── */
    const tl = gsap.timeline({ delay: 0.2 })

    // Dust fades in brightly
    tl.to(dustMat, { opacity: 0.75, duration: 2.0, ease: 'power2.out' }, 0)

    // Nodes: stagger in to high opacity
    nodes.forEach((node, i) => {
      tl.to(node.material, {
        opacity: 0.75 + Math.random() * 0.25, // 0.75 – 1.0
        duration: 0.55,
        ease: 'power2.out',
      }, 0.04 + i * 0.007)
    })

    /* ─── Mouse parallax ─────────────────────────────── */
    const mouse     = { x: 0, y: 0 }
    const targetRot = { x: 0, y: 0 }

    const onMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2
      gsap.to(targetRot, {
        x: -mouse.y * 5,
        y:  mouse.x * 5,
        duration: 2,
        ease: 'power2.out',
        overwrite: true,
      })
    }
    window.addEventListener('mousemove', onMouseMove)

    /* ─── Resize ─────────────────────────────────────── */
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    }
    window.addEventListener('resize', onResize)

    /* ─── Animate loop ───────────────────────────────── */
    let frameId
    const distVec = new THREE.Vector3()
    let t = 0

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      t += 0.012

      /* Drift nodes */
      nodes.forEach((node, i) => {
        const p = node.userData.phase
        node.position.x += node.userData.vx + Math.sin(t * 0.4 + p) * 0.004
        node.position.y += node.userData.vy + Math.cos(t * 0.35 + p) * 0.004
        node.position.z += node.userData.vz

        // Wrap at boundary
        const B = SPREAD * 0.55
        if (node.position.x >  B) node.position.x = -B
        if (node.position.x < -B) node.position.x =  B
        if (node.position.y >  B) node.position.y = -B
        if (node.position.y < -B) node.position.y =  B
        if (node.position.z >  40) node.position.z = -40
        if (node.position.z < -40) node.position.z =  40

        // Pulse opacity
        const base = 0.75 + Math.random() * 0.25
        node.material.opacity = base * (0.82 + 0.18 * Math.sin(t * 1.2 + p))
      })

      /* Update edges */
      let edgeIdx = 0
      const used  = new Set()

      for (let a = 0; a < nodes.length && edgeIdx < MAX_EDGES; a++) {
        for (let b = a + 1; b < nodes.length && edgeIdx < MAX_EDGES; b++) {
          distVec.subVectors(nodes[a].position, nodes[b].position)
          const dist = distVec.length()

          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.6  // up to 0.6 opacity
            const e = edgePool[edgeIdx++]
            const positions = e.geo.attributes.position.array

            positions[0] = nodes[a].position.x
            positions[1] = nodes[a].position.y
            positions[2] = nodes[a].position.z
            positions[3] = nodes[b].position.x
            positions[4] = nodes[b].position.y
            positions[5] = nodes[b].position.z

            e.geo.attributes.position.needsUpdate = true
            e.mat.opacity  = alpha
            e.mat.color.set(COLORS[Math.floor(Math.random() * 10) % COLORS.length])
            e.line.visible = true
            used.add(edgeIdx - 1)
          }
        }
      }

      // Hide unused edges
      for (let i = edgeIdx; i < MAX_EDGES; i++) {
        edgePool[i].line.visible = false
      }

      /* Slow camera drift */
      camera.rotation.x += (targetRot.x * 0.017 - camera.rotation.x) * 0.025
      camera.rotation.y += (targetRot.y * 0.017 - camera.rotation.y) * 0.025
      camera.position.x  = Math.sin(t * 0.08) * 6
      camera.position.y  = Math.cos(t * 0.06) * 4

      /* Rotate dust slowly */
      dust.rotation.y = t * 0.04
      dust.rotation.x = t * 0.02

      renderer.render(scene, camera)
    }

    animate()

    /* ─── Cleanup ────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(frameId)
      tl.kill()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      gsap.killTweensOf([dustMat, targetRot, ...nodes.map(n => n.material)])

      nodes.forEach(n => { scene.remove(n); n.geometry.dispose(); n.material.dispose() })
      edgePool.forEach(e => { scene.remove(e.line); e.geo.dispose(); e.mat.dispose() })
      scene.remove(dust); dustGeo.dispose(); dustMat.dispose()
      nodeGeo.dispose()

      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,          // sits above bg-void but below glass panels (z:10)
        pointerEvents: 'none',
        width: '100vw',
        height: '100vh',
      }}
    />
  )
}
