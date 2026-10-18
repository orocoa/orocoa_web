import { phone } from '../assets/device-mode.js';
import * as THREE from '../home/vendor/three.module.js';
import {loadDownloadedModels} from './downloaded-models.js';
import {devicePalette} from './device-palette.js';
import {clamp,range,phase,mix,sample,smooth} from './timeline.js';
import {resetFieldPreviews} from '../fields/fields.js';
import {pageScroll} from '../assets/page-scroll.js';

export async function createScreenTransition({story,fields,profile,integrated=false}){
  const root=document.documentElement,stage=story.querySelector('.story-stage');
  const layers=[story.querySelector('.screen-layer--opening'),story.querySelector('.screen-layer--destination')];
  const opening=story.querySelector('#opening-page'),arrival=story.querySelector('.arrival-seed');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),originalParent=fields.parentElement,originalNext=fields.nextSibling;
  let mounted=!integrated,cleanup,disposed=false;
  function restore(){if(integrated&&mounted){originalParent.insertBefore(fields,originalNext);mounted=false;}if(!integrated)fields.inert=false;}
  function fallback(){cleanup?.();cleanup=null;restore();root.classList.remove('is-3d');root.removeAttribute('data-device-interlude');root.removeAttribute('data-device-terminal');profile.removeAttribute('data-active');profile.inert=false;layers.forEach(layer=>{layer.removeAttribute('style');layer.inert=false;layer.removeAttribute('aria-hidden');});if(integrated)story.hidden=true;dispatchEvent(new Event('journey:layout'));}
  if(reduced.matches)return {destroy:fallback};
  let factory;
  try{factory=await loadDownloadedModels();}catch(error){console.warn('Device models unavailable; normal chapters retained.',error);fallback();return {destroy:fallback};}
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas:story.querySelector('canvas'),alpha:true,antialias:true,powerPreference:'high-performance'});}catch(error){console.warn('WebGL unavailable; normal chapters retained.',error);fallback();return {destroy:fallback};}
  story.hidden=false;root.classList.add('is-3d');profile.classList.add('transition-profile');
  renderer.setClearColor(devicePalette.paper,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.05,150),device=factory.createDevices();scene.add(device.rig);
  const payload=new THREE.Group();payload.position.y=-device.closedCenter;device.rig.remove(device.mac,device.tablet);payload.add(device.mac,device.tablet,device.sideBody);device.rig.add(payload);
  device.tablet.rotation.x=0;device.tablet.position.y=0;device.tabletFace.position.y=device.closedCenter;

  const up=new THREE.Vector3(0,1,0),normalY=new THREE.Vector3(0,1,0),axisX=new THREE.Vector3(1,0,0),axisZ=new THREE.Vector3(0,0,1);

  let width=innerWidth,height=innerHeight,top=0,distance=1,target=0,current=0,raf=0,lastTime=0,frames=0,frameTotal=0,slowFrames=0,quality='full';
  const params=new URLSearchParams(location.search),debug=params.has('debug');
  if(debug){const control=document.createElement('input');control.type='number';control.id='transition-progress';control.min='0';control.max='1000';control.step='1';control.setAttribute('aria-label','Transition progress');control.style.cssText='position:fixed;z-index:10000;bottom:12px;left:12px;width:68px;background:var(--vi-surface);border:1px solid var(--vi-line);padding:5px;accent-color:var(--vi-focus)';control.addEventListener('input',()=>{story.removeAttribute('data-settled');pageScroll.to(top+distance*Number(control.value)/1000,{immediate:true});});document.body.append(control);}
  function lookQ(position,target){return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position,target,up));}
  function rectFor(screen,aspect){
    const r=screen.width/screen.height>aspect?{w:screen.height*aspect,h:screen.height}:{w:screen.width,h:screen.width/aspect};
    screen.rectWidth=r.w;screen.rectHeight=r.h;screen.currentRadius=screen.radius*screen.cornerBlend;
    screen.hole.scale.set(Math.max(.001,r.w-.008),Math.max(.001,r.h-.008),1);
    screen.hole.material.uniforms.size.value.set(r.w-.008,r.h-.008);
    screen.hole.material.uniforms.radius.value=screen.currentRadius;
    // The iPad backing and live HTML opening must share one moving outline.
    // A fixed backing leaves a second, stepped corner as the viewport zooms in.
    if(screen.fitBacking){
      screen.backing.scale.set(r.w,r.h,1);
      screen.backing.material.uniforms.size.value.set(r.w,r.h);
      screen.backing.material.uniforms.radius.value=screen.currentRadius;
    }
    return r;
  }
  function screenPose(screen){const orientation=screen.parent.getWorldQuaternion(new THREE.Quaternion());return {center:screen.parent.localToWorld(screen.center.clone()),orientation,normal:new THREE.Vector3(0,0,1).applyQuaternion(orientation)};}
  function projectScreen(screen,layer,aspect,visible){
    screen.hole.visible=visible;layer.style.visibility=visible?'visible':'hidden';if(!visible)return null;
    const w=width,h=width/aspect;layer.style.width=`${w}px`;layer.style.height=`${h}px`;
    layer.style.borderRadius=`${screen.currentRadius/screen.rectWidth*w}px`;layer.style.overflow='hidden';
    const sw=screen.rectWidth/2,sh=screen.rectHeight/2,c=screen.center;
    const corners=[[-sw,sh],[sw,sh],[sw,-sh],[-sw,-sh]].map(([x,y])=>{const p=screen.parent.localToWorld(new THREE.Vector3(c.x+x,c.y+y,c.z)).project(camera);return {x:(p.x+1)*width/2,y:(1-p.y)*height/2};});
    const [a,b,c2,d]=corners,dx1=b.x-c2.x,dx2=d.x-c2.x,dx3=a.x-b.x+c2.x-d.x,dy1=b.y-c2.y,dy2=d.y-c2.y,dy3=a.y-b.y+c2.y-d.y,det=dx1*dy2-dx2*dy1;
    if(Math.abs(det)<.0001){layer.style.visibility='hidden';screen.hole.visible=false;return corners;}
    const g=(dx3*dy2-dx2*dy3)/det,k=(dx1*dy3-dx3*dy1)/det;
    const m=[(b.x-a.x+g*b.x)/w,(b.y-a.y+g*b.y)/w,0,g/w,(d.x-a.x+k*d.x)/h,(d.y-a.y+k*d.y)/h,0,k/h,0,0,1,0,a.x,a.y,0,1];
    layer.style.transform=`matrix3d(${m.map(n=>Math.abs(n)<1e-10?0:n).join(',')})`;return corners;
  }
  function render(now){
    raf=0;if(disposed)return;const began=performance.now(),dt=lastTime?Math.min(64,now-lastTime):16;lastTime=now;
    // All three chapters follow the actual position already eased by Lenis.
    // Another progress filter here lets the DOM handoff outrun the camera.
    current=target;
    const t=sample(current),p=t.p,aspect=width/height,mobile=phone.matches;
    device.macScreen.cornerBlend=t.pull;device.ipadScreen.cornerBlend=1;
    // Shift the composition vertically without tilting the image plane. This
    // gives the keyboard room while keeping the open display perfectly upright.
    camera.setViewOffset(width,height,0,height*.13*t.pull*(1-phase(p,.46,.60)),width,height);
    if(integrated){if(p>0&&!mounted){resetFieldPreviews();opening.append(fields);mounted=true;}else if(p===0&&mounted)restore();}
    const liftY=mix(device.closedCenter,2.7,t.lift),roll=0;
    const baseQ=new THREE.Quaternion().setFromAxisAngle(axisZ,roll).multiply(new THREE.Quaternion().setFromAxisAngle(axisX,Math.PI/2*t.lift));
    const axis=new THREE.Vector3(1,0,0);
    const spinQ=new THREE.Quaternion().setFromAxisAngle(axis,t.spinAngle);
    device.rig.position.set(0,liftY,0);device.rig.quaternion.copy(baseQ).multiply(spinQ);device.lid.rotation.x=t.lidAngle;
    // Start with normal dimensions; refine the narrow swap window after measuring
    // its true edge angle from the current camera pose.
    device.mac.scale.set(1,1,1);device.mac.position.y=0;device.tablet.scale.set(1,1,1);device.rig.updateMatrixWorld(true);
    // A rigid tablet keeps its aperture and bezel proportions during the push-in.
    // Crop the enlarged screen at the viewport, rather than morphing it to fit.
    const oa=aspect,ia=device.ipadScreen.width/device.ipadScreen.height;
    rectFor(device.macScreen,oa);rectFor(device.ipadScreen,ia);
    // Screen and image planes remain parallel throughout the reveal. The camera
    // sits above the keyboard but looks horizontally, preserving a true rectangle.
    const saved=device.lid.rotation.x;device.lid.rotation.x=0;device.lid.updateMatrixWorld(true);
    const first=screenPose(device.macScreen),firstRect=rectFor(device.macScreen,aspect),firstD=firstRect.h/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
    const initialP=first.center.clone().addScaledVector(first.normal,firstD);
    device.lid.rotation.x=saved;rectFor(device.macScreen,oa);device.lid.updateMatrixWorld(true);
    const framing=mobile?1.75:1,overview=new THREE.Vector3(0,2.55,12.0*framing),overviewQ=new THREE.Quaternion();
    // At p >= .21 the initial pose is irrelevant; using the current rig here
    // cannot accumulate transforms, because its interpolation weight is zero.
    camera.position.copy(initialP).lerp(overview,t.pull);camera.quaternion.copy(first.orientation).slerp(overviewQ,t.pull);
    const spinCamera=new THREE.Vector3(0,2.7,12.8*framing),spinCameraQ=lookQ(spinCamera,new THREE.Vector3(0,2.7,0));
    camera.position.lerp(spinCamera,phase(p,.46,.60));camera.quaternion.slerp(spinCameraQ,phase(p,.46,.60));
    const viewDir=camera.position.clone().sub(device.rig.position).normalize(),n0=normalY.clone().applyQuaternion(baseQ),axisWorld=axis.clone().applyQuaternion(baseQ);
    const a=n0.dot(viewDir),b=new THREE.Vector3().crossVectors(axisWorld,n0).dot(viewDir);
    let swapAngle=Math.atan2(b,a)+Math.PI/2;if(swapAngle<0)swapAngle+=Math.PI;
    const thin=t.spinAngle>0?smooth(range(t.spinAngle,swapAngle-.24,swapAngle)):0,resize=t.spinAngle>0?smooth(range(t.spinAngle,swapAngle-.24,swapAngle+.24)):0;
    const dw=mix(device.dimensions.mac.width,device.dimensions.ipad.width,resize),dd=mix(device.dimensions.mac.depth,device.dimensions.ipad.height,resize),sy=mix(1,.095/device.closedThickness,thin);
    const keyReveal=smooth(range(t.spinAngle,swapAngle-.10,swapAngle+.42));device.setSideTransition(thin,keyReveal);
    device.mac.scale.set(dw/device.dimensions.mac.width,sy,dd/device.dimensions.mac.depth);device.mac.position.y=device.closedCenter*(1-sy);device.tablet.scale.set(dw/device.dimensions.ipad.width,1,dd/device.dimensions.ipad.height);
    const isTablet=t.spinAngle>=swapAngle;device.mac.visible=!isTablet;device.tablet.visible=isTablet;
    device.sideBody.visible=!isTablet&&thin>.001;device.sideBody.scale.set(dw/device.dimensions.ipad.width,dd/device.dimensions.ipad.height,Math.max(.001,thin));device.rig.updateMatrixWorld(true);
    const ipad=screenPose(device.ipadScreen),tanHalfFov=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    // End inside the rounded opening, so even a viewport matching the device
    // aspect cannot expose a corner or a sliver of bezel at the HTML handoff.
    const safeWidth=device.ipadScreen.width-2*device.ipadScreen.radius;
    const safeHeight=device.ipadScreen.height-2*device.ipadScreen.radius;
    const endD=Math.min(safeHeight,safeWidth/aspect)/(2*tanHalfFov);
    const endP=ipad.center.clone().addScaledVector(ipad.normal,endD);
    camera.position.lerp(endP,t.zoom);camera.quaternion.slerp(ipad.orientation,t.zoom);camera.updateMatrixWorld(true);
    if(debug&&params.get('inspect')==='keyboard'){camera.clearViewOffset();camera.position.set(0,4.8,4.8);camera.quaternion.copy(lookQ(camera.position,new THREE.Vector3(0,.07,.25)));camera.updateMatrixWorld(true);}
    scene.updateMatrixWorld(true);
    const mac=screenPose(device.macScreen),macFront=mac.normal.dot(camera.position.clone().sub(mac.center).normalize()),ipadFront=ipad.normal.dot(camera.position.clone().sub(ipad.center).normalize());
    const oq=projectScreen(device.macScreen,layers[0],oa,(!integrated||mounted)&&!isTablet&&macFront>.02&&p<.44);
    const iq=projectScreen(device.ipadScreen,layers[1],ia,isTablet&&ipadFront>.015);
    const seedY=parseFloat(profile.style.getPropertyValue('--profile-seed-y'));
    if(Number.isFinite(seedY)){
      // The screen is now cropped rather than resized to the viewport. Place
      // its seed in screen coordinates so the real profile takes over exactly.
      const endScale=height/(2*endD*tanHalfFov)*device.ipadScreen.width/width;
      const seedSize=7/endScale;
      arrival.style.top=`${width/ia/2+(seedY-height/2)/endScale}px`;
      arrival.style.left=`calc(50% - ${seedSize/2}px)`;
      arrival.style.width=arrival.style.height=`${seedSize}px`;
    }
    layers[0].inert=p>.001;layers[1].inert=true;
    if(integrated&&p>0)fields.inert=true;
    profile.toggleAttribute('data-active',p===1);
    profile.inert=p<1;
    const interlude=p>.02&&p<1;root.toggleAttribute('data-device-interlude',interlude);root.toggleAttribute('data-device-terminal',p===1);story.toggleAttribute('data-start',p===0);
    renderer.render(scene,camera);frames++;frameTotal+=performance.now()-began;
    if(frames>30&&p>.2&&p<.8&&dt>35)slowFrames++;if(quality==='full'&&slowFrames>45){quality='lite';renderer.setPixelRatio(1);renderer.shadowMap.enabled=false;}
    if(debug){story.toggleAttribute('data-settled',current===target);story.dataset.progress=p.toFixed(5);story.dataset.device=isTablet?'ipad':'macbook';}if(debug)window.__transition={progress:p,target,stage:t.stage,device:isTablet?'ipad':'macbook',spinAngle:t.spinAngle,swapAngle,normalFacing:n0.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axisWorld,t.spinAngle)).dot(viewDir),lidAngle:t.lidAngle,sideBlend:thin,keyReveal,deviceWidth:dw,deviceDepth:dd,deviceThickness:isTablet?.095:device.closedThickness*sy,top,distance,viewport:[width,height],openingQuad:oq,destinationQuad:iq,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,averageFrameMs:frameTotal/frames,frames,quality,source:'Downloaded MacBook / iPad geometry with blank keys, trackpad and lock key; no hands or ground shadows'};if(debug)story.dataset.debug=JSON.stringify(window.__transition);
    if(current!==target)requestFrame();else lastTime=0;
  }
  function requestFrame(){if(!raf)raf=requestAnimationFrame(render);}
  function onScroll(){target=clamp((scrollY-top)/distance);if(target===current)return;cancelAnimationFrame(raf);render(performance.now());}
  function measure(){const bounds=story.getBoundingClientRect();width=stage.clientWidth;height=stage.clientHeight;top=bounds.top+scrollY;distance=Math.max(1,bounds.height-height);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);target=clamp((scrollY-top)/distance);requestFrame();}
  const observer=new ResizeObserver(measure);observer.observe(stage);addEventListener('journey:scroll',onScroll);addEventListener('resize',measure,{passive:true});addEventListener('journey:layout',measure);
  const loss=e=>{e.preventDefault();fallback();};renderer.domElement.addEventListener('webglcontextlost',loss);
  const preference=()=>{if(reduced.matches)fallback();};reduced.addEventListener('change',preference);
  cleanup=()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();removeEventListener('journey:scroll',onScroll);removeEventListener('resize',measure);removeEventListener('journey:layout',measure);reduced.removeEventListener('change',preference);renderer.domElement.removeEventListener('webglcontextlost',loss);renderer.dispose();};
  measure();dispatchEvent(new Event('journey:layout'));if(debug&&params.has('at')){const p=clamp(Number(params.get('at')));pageScroll.to(top+distance*p,{immediate:true});target=current=p;}else current=target;
  // Compile and draw once during preload, before input can reveal the device.
  cancelAnimationFrame(raf);render(performance.now());
  return {destroy:fallback,refresh:measure};
}
