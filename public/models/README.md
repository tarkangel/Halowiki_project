# 3D Models

This directory is where you drop real Halo GLTF/GLB models to replace the placeholder geometry.

## Current status
The app uses Three.js primitive placeholder shapes:
- `warthog` slot → BoxGeometry (replace with warthog.glb)
- `helmet` slot → SphereGeometry (replace with helmet.glb)
- `sword` slot → CylinderGeometry (replace with sword.glb)

## How to add a real model

1. Obtain a `.glb` or `.gltf` file under a Creative Commons (CC BY, CC BY-SA, or CC0) license.
   Recommended sources:
   - Sketchfab (filter: "Downloadable" + "CC" license)
   - SketchfabForGood / fan community packs
   - Official Halo asset packs if licensed for your use case

2. Place the file here: `public/models/<name>.glb`

3. In `src/components/ModelViewer/ModelViewer.tsx`:
   - Import `useGLTF` from `@react-three/drei`
   - Replace the relevant `*Placeholder` component with:
     ```tsx
     function WarthogModel() {
       const { scene } = useGLTF('/models/warthog.glb');
       return <primitive object={scene} />;
     }
     ```
   - Remove the unused placeholder component.

## License requirements
Only use models with a confirmed Creative Commons license allowing redistribution.
Always credit the original author in the app or this README.

## Confirmed CC-licensed Halo models (community sourced)
_None confirmed at time of writing — check Sketchfab for community uploads._
