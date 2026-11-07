export const BAY_SPACING=1.95;
export const BRAND_CHAPTERS=[
 {slug:'bonkers-corner',name:'Bonkers Corner',line:'Oversized graphics and playful prints.',position:[-.18,1.55,6.5],target:[0,1.32,0],mobile:[0,1.4,6.1],fov:34},
 {slug:'jnorss',name:'JNORSS',line:'Graphic layers and acid washes.',position:[1.78,1.57,6.4],target:[1.95,1.32,0],mobile:[1.95,1.4,6.1],fov:34},
 {slug:'genrage',name:'Genrage',line:'Dark graphics and boxy silhouettes.',position:[4.04,1.51,6.2],target:[3.9,1.32,0],mobile:[3.9,1.4,6.1],fov:35},
 {slug:'wtflex',name:'WTFlex',line:'Bold streetwear, from denim to sherpa.',position:[6.02,1.58,6.6],target:[5.85,1.32,0],mobile:[5.85,1.4,6.1],fov:34},
 {slug:'everdion',name:'Everdion',line:'Vintage washes and relaxed layers.',position:[7.62,1.53,6.4],target:[7.8,1.32,0],mobile:[7.8,1.4,6.1],fov:34},
 {slug:'hauntrex',name:'Hauntrex',line:'Dark prints with a layered edge.',position:[9.94,1.49,6.3],target:[9.75,1.32,0],mobile:[9.75,1.4,6.1],fov:34},
 {slug:'sagacity',name:'Sagacity',line:'Intricate graphics and knitwear.',position:[11.7,1.52,6.5],target:[11.7,1.32,0],mobile:[11.7,1.4,6.1],fov:34},
] as const;
export function exactProgress(scrollY:number,start:number,range:number,count=BRAND_CHAPTERS.length){return Math.max(0,Math.min(count-1,(scrollY-start)/Math.max(1,range)*(count-1)))}
export function damping(current:number,target:number,dt:number,lambda=12){return current+(target-current)*(1-Math.exp(-lambda*Math.min(dt,1/30)))}
