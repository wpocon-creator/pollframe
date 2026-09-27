import {renderMaterialScene} from './studio-material-engine.js';
self.onmessage=async event=>{
  try {self.postMessage({result:await renderMaterialScene(...event.data)});}
  catch(error) {self.postMessage({error:error.message});}
};
