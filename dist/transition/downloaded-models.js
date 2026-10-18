import * as THREE from '../home/vendor/three.module.js';
import {devicePalette,deviceMaterialRoles} from './device-palette.js';

// Device shells come from downloaded assets; see ASSETS.md.
// Keep only the silhouette and recognisable controls, without camera or lettering.
export async function loadDownloadedModels(){
  // A hung optional device request must reach the existing readable-chapter
  // fallback before the homepage's 30-second loading watchdog expires.
  const signal=AbortSignal.timeout(12000);
  const [mr,br]=await Promise.all([fetch(new URL('./assets/refined-devices.json',import.meta.url),{signal,credentials:'omit',referrerPolicy:'no-referrer'}),fetch(new URL('./assets/refined-devices.bin',import.meta.url),{signal,credentials:'omit',referrerPolicy:'no-referrer'})]);
  if(!mr.ok||!br.ok)throw new Error('Downloaded scene assets unavailable');
  const [meta,buffer]=await Promise.all([mr.json(),br.arrayBuffer()]);
  const geometries=meta.meshes.map(part=>{
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(buffer,part.positionOffset,part.vertices*3),3));
    g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(buffer,part.normalOffset,part.vertices*3),3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer,part.indexOffset,part.indices),1));
    if(part.morphPositionOffset!==undefined){g.morphAttributes.position=[new THREE.BufferAttribute(new Float32Array(buffer,part.morphPositionOffset,part.vertices*3),3)];g.morphAttributes.normal=[new THREE.BufferAttribute(new Float32Array(buffer,part.morphNormalOffset,part.vertices*3),3)];}
    g.computeBoundingSphere();return {part,g};
  });
  const colours=Object.fromEntries(Object.entries(deviceMaterialRoles).map(([name,role])=>[name,devicePalette[role]]));
  const materials=Object.fromEntries(Object.entries(colours).map(([name,color])=>[name,new THREE.MeshBasicMaterial({color})]));
  function surface(part,g){
    const mesh=new THREE.Mesh(g,materials[part.material]);mesh.name=part.name;
    if(part.material==='trackpad'){mesh.material.polygonOffset=true;mesh.material.polygonOffsetFactor=-1;mesh.material.polygonOffsetUnits=-1;}
    if(part.material==='lock-key')mesh.position.set(-2.49,1.21,0);
    return mesh;
  }
  function roundedPlane(width,height,radius){
    const x=-width/2,y=-height/2,w=width,h=height,r=radius,s=new THREE.Shape();
    s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    return new THREE.ShapeGeometry(s,16);
  }
  function aperture(parent,data,color,fitBacking=false){
    const {width,height,center,radius=0}=data;
    const vertexShader='varying vec2 screenUV; void main(){screenUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      mask='varying vec2 screenUV; uniform vec2 size; uniform float radius; void main(){vec2 q=abs((screenUV-0.5)*size)-(size*0.5-vec2(radius)); if(length(max(q,0.0))+min(max(q.x,q.y),0.0)>radius)discard;';
    const backing=new THREE.Mesh(fitBacking?new THREE.PlaneGeometry(1,1):roundedPlane(width,height,radius),fitBacking?new THREE.ShaderMaterial({
      uniforms:{size:{value:new THREE.Vector2(width,height)},radius:{value:radius},fillColor:{value:new THREE.Color(color)}},vertexShader,
      fragmentShader:'uniform vec3 fillColor; '+mask+'gl_FragColor=vec4(fillColor,1.0);\n#include <colorspace_fragment>\n}'
    }):new THREE.MeshBasicMaterial({color}));
    // The display sits less than .001 world units above the black bezel mesh.
    // At the mobile camera distance those depths can quantize to the same value,
    // producing diagonal bands as the lid rotates. Give the backing its own
    // depth bias, with the HTML aperture one layer further forward. Keep depth
    // testing enabled so the keyboard/deck still occlude the closing display.
    backing.material.polygonOffset=true;
    backing.material.polygonOffsetFactor=-2;
    backing.material.polygonOffsetUnits=-2;
    backing.position.fromArray(center);backing.position.z-=.0005;parent.add(backing);
    const hole=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({
      uniforms:{size:{value:new THREE.Vector2(width,height)},radius:{value:radius}},
      vertexShader,fragmentShader:mask+'gl_FragColor=vec4(0.0);}',
      transparent:false,blending:THREE.NoBlending,depthWrite:true,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));
    hole.position.fromArray(center);hole.scale.set(width,height,1);hole.renderOrder=1;parent.add(hole);
    return {parent,hole,backing,fitBacking,width,height,radius,cornerBlend:1,center:new THREE.Vector3(...center),rectWidth:width,rectHeight:height};
  }
  function createDevices(){
    const rig=new THREE.Group(),mac=new THREE.Group(),tablet=new THREE.Group(),lid=new THREE.Group(),tabletFace=new THREE.Group();
    lid.position.fromArray(meta.mac.hinge);mac.add(lid);tabletFace.rotation.x=Math.PI/2;tablet.add(tabletFace);rig.add(mac,tablet);
    for(const {part,g} of geometries){if(part.group==='hand')continue;const mesh=surface(part,g);(part.group==='lid'?lid:part.group==='ipad'?tabletFace:mac).add(mesh);}
    // Seal the source keyboard recess underneath the repaired caps. Its original
    // openings otherwise show white pinholes at shallow viewing angles.
    const tray=new THREE.Mesh(roundedPlane(4.50,1.76,.055),materials['key-edge']);tray.rotation.x=-Math.PI/2;tray.position.set(0,.069,-.66);mac.add(tray);
    // A single hinge joins the repaired, flush lid and the stationary deck.
    const hinge=new THREE.Mesh(new THREE.CylinderGeometry(.043,.043,4.82,24),materials.bezel);hinge.rotation.z=Math.PI/2;hinge.position.set(0,.044,-1.881);mac.add(hinge);
    const macScreen=aperture(lid,meta.mac.screen,devicePalette.paper),ipadScreen=aperture(tabletFace,meta.ipad.screen,devicePalette.ink,true);
    lid.rotation.x=Math.PI/2;mac.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(mac),closedCenter=bounds.getCenter(new THREE.Vector3()).y,closedThickness=bounds.max.y-bounds.min.y;lid.rotation.x=0;tablet.visible=false;
    // An inner copy of the downloaded tablet shell fills the laptop seam while
    // the two layers converge, giving the edge one continuous silhouette.
    const sideBody=new THREE.Group();sideBody.rotation.x=Math.PI/2;sideBody.position.y=closedCenter;
    tabletFace.children.filter(child=>child.name.startsWith('iPad_body_')).forEach(child=>sideBody.add(child.clone()));
    const lockKey=tabletFace.getObjectByName('iPad_lock_key'),edgeColor=new THREE.Color(colours['ipad-edge']);
    const blendingMaterials=['deck','deck-side','lid-shell','lid-edge'].map(key=>({material:materials[key],original:new THREE.Color(colours[key])}));
    function setSideTransition(amount,keyAmount){
      blendingMaterials.forEach(({material,original})=>material.color.copy(original).lerp(edgeColor,amount));
      // The two laptop layers lose their contrast as their thickness converges;
      // the tablet's single key emerges from its edge during the same turn.
      lockKey.position.x=-2.49-.077*keyAmount;
    }
    return {rig,mac,tablet,lid,tabletFace,sideBody,macScreen,ipadScreen,closedCenter,closedThickness,setSideTransition,dimensions:meta};
  }
  return {createDevices,meta};
}
