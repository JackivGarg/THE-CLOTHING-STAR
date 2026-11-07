import React,{useEffect,useId,useRef,useState} from 'react';
import {BAY_SPACING,BRAND_CHAPTERS,damping,exactProgress} from './brand-world/scene';
import {garmentFits,garmentLayout} from './brand-world/garment-fits';
import './brand-world/world.css';

export type WorldAsset={brand_slug:string;brand?:string;image_url:string;title:string;source_url?:string;product_id?:string};
type Props={brands?:{slug:string;name:string;product_count?:number}[];onBrandExplore:(slug:string)=>void;onBrandInsights?:(slug:string)=>void;onSearch?:()=>void};
type WorldControls={wake:()=>void;focus:(focused:boolean)=>void};

function GarmentPoster({asset}: {asset: WorldAsset}) {
  const id = useId();
  const fit = garmentFits[asset.brand_slug];
  if (!fit) return null;
  const {left, top, right, bottom} = garmentLayout(fit);
  const pad = (right - left) * .13;
  return <svg className="world-poster-garment" role="img" aria-label={asset.title}
    viewBox={`${left - pad} ${top - pad} ${right - left + pad * 2} ${bottom - top + pad * 2}`}>
    <defs><clipPath id={id}><polygon points={fit.outline.map(point => point.join(',')).join(' ')}/></clipPath></defs>
    <g transform={fit.angle ? `rotate(${-fit.angle * 180 / Math.PI} ${fit.collar.join(' ')})` : undefined}>
      <image href={asset.image_url} width={fit.size[0]} height={fit.size[1]} clipPath={`url(#${id})`}/>
    </g>
  </svg>;
}

export function BrandWorld({brands=[],onBrandExplore,onBrandInsights,onSearch}:Props){
 const scrollArea=useRef<HTMLDivElement>(null),host=useRef<HTMLDivElement>(null),controller=useRef<WorldControls|null>(null),activeRef=useRef(0),exploreRef=useRef(onBrandExplore);
 const [active,setActive]=useState(0),[assets,setAssets]=useState<WorldAsset[]>([]),[state,setState]=useState<'loading'|'ready'|'fallback'>('loading'),[assetFailed,setAssetFailed]=useState(false);
 exploreRef.current=onBrandExplore;
 useEffect(()=>{const abort=new AbortController();fetch('/brand-world/manifest.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('No scene manifest');return r.json()}).then(data=>{const list=Array.isArray(data)?data:data.products||data.assets||[];setAssets(list.filter((item:WorldAsset)=>item&&typeof item.brand_slug==='string'&&typeof item.image_url==='string'&&item.image_url.startsWith('/brand-world/')));}).catch(e=>{if(e.name!=='AbortError'){setAssetFailed(true);setState('fallback')}});return()=>abort.abort()},[]);
 useEffect(()=>{
  if (!scrollArea.current || !host.current) return;
  const panel = scrollArea.current, mount = host.current;
  let gone = false, cleanup = () => {}, exact = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const update = () => {
    exact = exactProgress(panel.scrollTop, 0, panel.scrollHeight - panel.clientHeight);
    const next = Math.round(exact);
    if (next !== activeRef.current) {
      activeRef.current = next;
      setActive(next);
    }
    panel.style.setProperty('--rail-progress', String(exact / (BRAND_CHAPTERS.length - 1)));
    controller.current?.wake();
  };
  const observer = new ResizeObserver(update);
  observer.observe(panel);
  panel.addEventListener('scroll', update, {passive:true});
  update();
  async function initialize(){
   try{
    const THREE=await import('three');if(gone)return;
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.setClearColor('#f1f0e9');renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<750?1.25:1.5));renderer.domElement.setAttribute('aria-hidden','true');mount.append(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#f1f0e9');scene.fog=new THREE.Fog('#f1f0e9',9,28);
    const camera=new THREE.PerspectiveCamera(36,1,.05,65);const world=new THREE.Group();world.name='continuous-showroom';scene.add(world);
    scene.add(new THREE.HemisphereLight('#fffef6','#b7b6a2',2.2));const key=new THREE.DirectionalLight('#fff9e6',3.5);key.position.set(3,7,5);scene.add(key);
    const metal=new THREE.MeshStandardMaterial({color:'#aaa89c',metalness:.55,roughness:.32});const maple=new THREE.MeshStandardMaterial({color:'#946a49',roughness:.72});const floorMat=new THREE.MeshStandardMaterial({color:'#eeeee5',roughness:1});
    const cylinder=new THREE.CylinderGeometry(.018,.018,BAY_SPACING*(BRAND_CHAPTERS.length+1),16);const rail=new THREE.Mesh(cylinder,metal);rail.rotation.z=Math.PI/2;rail.position.set(BAY_SPACING*3,2.94,-.11);rail.name='continuous-chrome-rail';world.add(rail);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(45,14),floorMat);floor.rotation.x=-Math.PI/2;floor.position.set(BAY_SPACING*3,-.45,0);world.add(floor);
    const groups:InstanceType<typeof THREE.Group>[]=[],planes:InstanceType<typeof THREE.Mesh>[]=[],materials:InstanceType<typeof THREE.MeshBasicMaterial>[]=[],textures:InstanceType<typeof THREE.Texture>[]=[],loaded=new Set<number>();
    const hooksGeo=new THREE.TorusGeometry(.07,.008,8,24,Math.PI*1.6);const hangerShape=new THREE.Shape();hangerShape.moveTo(-.45,0);hangerShape.lineTo(0,.24);hangerShape.lineTo(.45,0);hangerShape.quadraticCurveTo(.48,-.06,.39,-.07);hangerShape.lineTo(-.39,-.07);hangerShape.quadraticCurveTo(-.48,-.06,-.45,0);const inner=new THREE.Path();inner.moveTo(-.28,-.01);inner.lineTo(.28,-.01);inner.lineTo(0,.14);inner.closePath();hangerShape.holes.push(inner);const hangerGeo=new THREE.ExtrudeGeometry(hangerShape,{depth:.025,bevelEnabled:true,bevelThickness:.007,bevelSize:.007,bevelSegments:2,steps:1});const imageGeo=new THREE.PlaneGeometry(1,1);
    BRAND_CHAPTERS.forEach((chapter,index)=>{const group=new THREE.Group();group.position.x=index*BAY_SPACING;group.name=chapter.slug;world.add(group);groups.push(group);const hanger=new THREE.Mesh(hangerGeo,maple);hanger.position.set(0,2.6,-.02);group.add(hanger);const hook=new THREE.Mesh(hooksGeo,metal);hook.rotation.z=-.8;hook.position.set(0,2.89,-.02);group.add(hook);const stem=new THREE.Mesh(new THREE.CylinderGeometry(.007,.007,.14,8),metal);stem.position.set(0,2.74,-.02);group.add(stem);const material=new THREE.MeshBasicMaterial({transparent:true,opacity:0,side:THREE.DoubleSide,toneMapped:false});const plane=new THREE.Mesh(imageGeo,material);plane.name='garment-'+chapter.slug;plane.position.set(0,1.45,.015);plane.scale.set(1.75,2.2,1);plane.userData.chapter=index;group.add(plane);planes.push(plane);materials.push(material)});
    let current=exact,frame=0,last=performance.now(),visible=true,focused=false,hovered=false,pointer=new THREE.Vector2(20,20),pointerDirty=false,qualityMisses=0,downgraded=false,disposed=false;const raycaster=new THREE.Raycaster();let lastIndex=-1;
    const loader=new THREE.TextureLoader();
    const load = (index: number) => {
      const chapter = BRAND_CHAPTERS[index];
      if (!chapter || loaded.has(index)) return;
      const asset = assets.find(item => item.brand_slug === chapter.slug);
      const fit = garmentFits[chapter.slug];
      if (!asset || !fit) return;
      loaded.add(index);
      loader.load(asset.image_url, texture => {
        if (disposed) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 2;
        textures.push(texture);
        const {scale} = garmentLayout(fit);
        const shape = new THREE.Shape(fit.outline.map(([x, y]) =>
          new THREE.Vector2((x - fit.collar[0]) * scale, (fit.collar[1] - y) * scale)
        ));
        const mesh = planes[index];
        const geometry = new THREE.ShapeGeometry(shape);
        const {position, uv} = geometry.attributes;
        for (let vertex = 0; vertex < position.count; vertex++) {
          uv.setXY(vertex,
            (position.getX(vertex) / scale + fit.collar[0]) / fit.size[0],
            1 - (fit.collar[1] - position.getY(vertex) / scale) / fit.size[1]
          );
        }
        mesh.geometry = geometry;
        mesh.position.set(0, 2.62, .026);
        mesh.scale.setScalar(1);
        mesh.rotation.z = fit.angle ?? 0;
        materials[index].map = texture;
        materials[index].needsUpdate = true;
        if (index === Math.round(exact)) setState('ready');
        wake();
      }, undefined, () => {
        if (disposed) return;
        planes[index].visible = false;
        if (index === Math.round(exact)) setState('fallback');
        mount.dataset.failedAssets = String(Number(mount.dataset.failedAssets || 0) + 1);
        wake();
      });
    };
    function resize(){if(disposed)return;const box=mount.getBoundingClientRect();renderer.setSize(box.width,box.height);camera.aspect=box.width/Math.max(1,box.height);camera.updateProjectionMatrix();wake()}
    function wake(){if(!frame&&!disposed&&visible&&!document.hidden)frame=requestAnimationFrame(render)}
    function render(now:number){frame=0;if(disposed||!visible||document.hidden)return;const dt=Math.min((now-last)/1000,1/30);last=now;current=reduced.matches?Math.round(exact):damping(current,exact,dt);if(Math.abs(current-exact)<.0001&&!reduced.matches)current=exact;const a=Math.min(BRAND_CHAPTERS.length-1,Math.floor(current)),b=Math.min(a+1,BRAND_CHAPTERS.length-1),t=current-a,ca=BRAND_CHAPTERS[a],cb=BRAND_CHAPTERS[b],mobile=mount.clientWidth<750,pa=mobile?ca.mobile:ca.position,pb=mobile?cb.mobile:cb.position;
     const rackWidth = THREE.MathUtils.clamp(mount.clientWidth / 580, .72, 1);
     camera.position.set(THREE.MathUtils.lerp(pa[0],pb[0],t) * rackWidth,THREE.MathUtils.lerp(pa[1],pb[1],t),THREE.MathUtils.lerp(pa[2],pb[2],t));camera.fov=mobile?39:THREE.MathUtils.lerp(ca.fov,cb.fov,t);camera.updateProjectionMatrix();camera.lookAt(THREE.MathUtils.lerp(ca.target[0],cb.target[0],t) * rackWidth,THREE.MathUtils.lerp(ca.target[1],cb.target[1],t),0);
     const nearest = Math.round(exact);
     if (nearest !== lastIndex) {
       lastIndex = nearest;
       hovered = false;
       pointerDirty = true;
       if (materials[nearest].map) setState('ready');
       for (let offset = -2; offset <= 2; offset++) load(nearest + offset);
     }
     groups.forEach((group, index) => {
       const offset = index - current;
       const distance = Math.abs(offset);
       const emphasis = 1 - THREE.MathUtils.smoothstep(distance, 0, 1.5);
       group.visible = distance < 3.2 && !!materials[index].map;
       group.position.x = index * BAY_SPACING * rackWidth;
       group.rotation.y = THREE.MathUtils.clamp(-offset * .27, -.64, .64);
       group.position.z = -.06;
       // Keep the hanger hook attached as the cloth moves forward.
       planes[index].scale.setScalar(THREE.MathUtils.lerp(.89, index === nearest && (focused || hovered) ? 1.04 : 1, emphasis));
       planes[index].rotation.z = (garmentFits[BRAND_CHAPTERS[index].slug]?.angle ?? 0)
         + (reduced.matches ? 0 : THREE.MathUtils.clamp((exact - current) * .09, -.085, .085));
       materials[index].opacity = THREE.MathUtils.lerp(.44, 1, emphasis);
     });
     if(pointerDirty&&!reduced.matches){const previousHover=hovered;raycaster.setFromCamera(pointer,camera);hovered=!!raycaster.intersectObject(planes[nearest],false).length;renderer.domElement.style.cursor=hovered?'pointer':'default';pointerDirty=false;if(previousHover!==hovered)wake()}
     renderer.render(scene,camera);mount.dataset.drawCalls=String(renderer.info.render.calls);mount.dataset.triangles=String(renderer.info.render.triangles);mount.dataset.textures=String(renderer.info.memory.textures);mount.dataset.exact=exact.toFixed(3);mount.dataset.smooth=current.toFixed(3);mount.dataset.active=String(nearest);
     const elapsed=performance.now()-now;mount.dataset.frameMs=elapsed.toFixed(1);if(elapsed>30)qualityMisses++;else qualityMisses=Math.max(0,qualityMisses-1);if(qualityMisses>90&&!downgraded){downgraded=true;renderer.setPixelRatio(1);resize()}
     if(Math.abs(current-(reduced.matches?Math.round(exact):exact))>.0001||pointerDirty)wake();
    }
    const onVisibility=()=>{last=performance.now();if(!document.hidden)wake()};const onPointer=(event:PointerEvent)=>{const box=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1);pointerDirty=true;wake()};const onLeave=()=>{hovered=false;pointer.set(20,20);pointerDirty=true;wake()};const click=()=>{if(hovered)exploreRef.current(BRAND_CHAPTERS[Math.round(exact)].slug)};const lost=(event:Event)=>{event.preventDefault();setState('fallback');disposed=true;cancelAnimationFrame(frame)};
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(mount);const visibility=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=performance.now();if(visible)wake()});visibility.observe(mount);document.addEventListener('visibilitychange',onVisibility);renderer.domElement.addEventListener('pointermove',onPointer);renderer.domElement.addEventListener('pointerleave',onLeave);renderer.domElement.addEventListener('click',click);renderer.domElement.addEventListener('webglcontextlost',lost);reduced.addEventListener('change',wake);controller.current={wake,focus:(value)=>{focused=value;wake()}};resize();load(Math.round(exact));load(Math.round(exact)+1);
    cleanup=()=>{disposed=true;cancelAnimationFrame(frame);controller.current=null;resizeObserver.disconnect();visibility.disconnect();document.removeEventListener('visibilitychange',onVisibility);renderer.domElement.removeEventListener('pointermove',onPointer);renderer.domElement.removeEventListener('pointerleave',onLeave);renderer.domElement.removeEventListener('click',click);renderer.domElement.removeEventListener('webglcontextlost',lost);reduced.removeEventListener('change',wake);const geos=new Set<InstanceType<typeof THREE.BufferGeometry>>(),mats=new Set<InstanceType<typeof THREE.Material>>();scene.traverse(object=>{if(object instanceof THREE.Mesh){geos.add(object.geometry);const ms=Array.isArray(object.material)?object.material:[object.material];ms.forEach(m=>mats.add(m))}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove()};if(gone)cleanup();
   }catch{if(!gone)setState('fallback')}
  }
  if(assets.length)void initialize();
  return () => {
    gone = true;
    cleanup();
    observer.disconnect();
    panel.removeEventListener('scroll', update);
  };
 },[assets]);
 function go(index: number) {
   const panel = scrollArea.current;
   if (!panel) return;
   const chapter = Math.max(0, Math.min(BRAND_CHAPTERS.length - 1, index));
   panel.scrollTo({
     top: (panel.scrollHeight - panel.clientHeight) * chapter / (BRAND_CHAPTERS.length - 1),
     behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
   });
 }
 const chapter=BRAND_CHAPTERS[active],asset=assets.find(item=>item.brand_slug===chapter.slug),brand=brands.find(item=>item.slug===chapter.slug);
 return (
   <section className="brand-world" aria-label="Explore independent brands">
     <div className="rack-heading">
       <div><p>THE INDEPENDENT COLLECTION</p><h1>The brand rail</h1></div>
       {onSearch && <button className="rack-search-link" onClick={onSearch}>Find an item ↓</button>}
     </div>
     <div className="rack-instructions" id="rack-instructions">
       <span aria-hidden="true">↕</span> Scroll inside the rail or use the arrows to browse brands.
     </div>
     <div className="rack-frame">
       <div ref={scrollArea} className="rack-scroll" role="region" tabIndex={0}
         aria-label="Scrollable brand rail" aria-describedby="rack-instructions"
         onKeyDown={event => {
           if (event.target !== event.currentTarget) return;
           if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
             event.preventDefault();
             go(active + (event.key === 'ArrowRight' ? 1 : -1));
           }
         }}>
         <div className="rack-track" style={{'--brand-transitions':BRAND_CHAPTERS.length-1} as React.CSSProperties}>
           <div className="brand-world-sticky">
             <div className="brand-world-canvas" ref={host}/>
             {state !== 'ready' && <div className="brand-world-poster">
               {asset ? <GarmentPoster asset={asset}/> : <div className="world-poster-label">{chapter.name}
                 <small>{assetFailed ? 'Photography unavailable' : 'Loading the collection'}</small>
               </div>}
             </div>}
           </div>
         </div>
       </div>
       <div className="rack-arrows">
         <button aria-label="Previous brand" disabled={active === 0} onClick={() => go(active - 1)}>←</button>
         <button aria-label="Next brand" disabled={active === BRAND_CHAPTERS.length - 1} onClick={() => go(active + 1)}>→</button>
       </div>
     </div>
     <div className="rack-caption">
       <div aria-live="polite">
         <p className="rack-count">{String(active+1).padStart(2,'0')} / {String(BRAND_CHAPTERS.length).padStart(2,'0')}{brand?.product_count != null && ` · ${brand.product_count.toLocaleString('en-IN')} collected pieces`}</p>
         <h2>{chapter.name}</h2>
         <p>{asset?.title ?? chapter.line}</p>
       </div>
       <div className="world-actions">
         <button onFocus={() => controller.current?.focus(true)} onBlur={() => controller.current?.focus(false)} onClick={() => onBrandExplore(chapter.slug)}>Explore catalogue ↗</button>
         {onBrandInsights && <button onClick={() => onBrandInsights(chapter.slug)}>Brand radar</button>}
       </div>
     </div>
     <nav className="rack-brands" aria-label="Jump to brand">
       {BRAND_CHAPTERS.map((item,index) => <button key={item.slug} aria-current={active === index ? 'true' : undefined} onClick={() => go(index)}>{item.name}</button>)}
     </nav>
   </section>
 );
}
