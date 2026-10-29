<script setup>
import {computed,ref,watch,onBeforeUnmount} from 'vue';
import {productItemQuantity} from '../../../../web/product-composition.js';
import {productionProductFields} from '../../../../web/production-edit.js';
import {validateProductImage,localImagesAvailable} from '../../../../web/local-product-image.js';
const emit=defineEmits(['image-selected']);
const props=defineProps({form:Object,record:Object,editing:Boolean,catalog:Array,suppliers:Array,imageFile:Object,imageVersion:Number});
const labels={description:'Descripción',checklist:'Lista de chequeo',techSpecs:'Especificaciones técnicas',comments:'Comentarios'};
const items=computed(()=>props.form.items||[]),processes=computed(()=>props.form.processes||[]);
const picker=ref(''),quantity=ref('1'),error=ref(''),imageError=ref(false);
const fileInput=ref(null),preview=ref(''),imageMessage=ref('');
const local=localImagesAvailable();
const picture=computed(()=>preview.value||(local&&props.record?.id?'/__product-images/'+props.record.id+'.img?v='+(props.imageVersion||0):''));
watch(()=>props.imageFile,file=>{if(preview.value)URL.revokeObjectURL(preview.value);preview.value=file?URL.createObjectURL(file):'';imageError.value=false;});
watch(picture,()=>imageError.value=false);
onBeforeUnmount(()=>{if(preview.value)URL.revokeObjectURL(preview.value);});
function chooseImage(event){const file=event.target.files?.[0];event.target.value='';if(!file)return;try{validateProductImage(file);imageMessage.value='';emit('image-selected',file);}catch(e){imageMessage.value=e.message;}}
function addItem(){const item=props.catalog.find(i=>i.id===picker.value);if(!item){error.value='Selecciona un ítem por nombre o código.';return;}let count;try{count=productItemQuantity(quantity.value);}catch(e){error.value=e.message;return;}if(items.value.some(i=>i.itemId===item.id)){error.value='El ítem ya está asociado. Puedes actualizar su cantidad en la tabla.';return;}props.form.items.push({itemId:item.id,code:item.code,name:item.name,quantity:count,averageUnitCost:item.averageUnitCost??null});error.value='';picker.value='';quantity.value='1';}

function addProcess(){props.form.processes.push({name:'',type:'INTERNAL',unitCost:0,userName:'',equipment:'',supplierId:'',time:0,comments:''});}

const money=value=>value==null||value===''?'—':new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP'}).format(Number(value));
</script>
<template>
<div class="production-product-layout">
 <section class="production-product-profile" aria-labelledby="product-profile-title">
  <h3 id="product-profile-title">Producto</h3>
  <div class="production-product-fields">
   <label>Código<input v-model="form.code" required maxlength="100"></label>
   <label>Nombre<input v-model="form.name" required maxlength="200"></label>
   <label>Costo<input v-model="form.cost" type="number" min="0" max="1000000000000" step="0.01" placeholder="Sin dato registrado"></label>
   <label>Precio comercial<input v-model="form.price" required type="number" min="0" max="1000000000000" step="0.01"></label>
   <label>Impuesto (%)<input v-model="form.tax" required type="number" min="0" max="100" step="0.01"></label>
   <div class="production-product-picture"><img v-if="picture&&!imageError" :src="picture" alt="Imagen del producto" @error="imageError=true"><template v-else>
    <svg viewBox="0 0 120 100" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m60 12 40 20-40 21-40-21 40-20Z M20 32v39l40 20 40-20V32 M60 53v38 M40 22l40 21"/><path d="m20 32-12 16 39 20 13-15 13 15 39-20-12-16" fill="white"/></svg>
    <span>Sin imagen disponible</span></template>
   </div>
   <div v-if="editing&&local" class="production-product-image-actions">
    <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Seleccionar imagen del producto" hidden @change="chooseImage">
    <button type="button" @click="fileInput.click()">Subir o cambiar imagen</button>
    <p>PNG, JPG o WebP · Máximo 5 MB. Se guarda en este computador al guardar el producto.</p>
    <template v-if="imageFile"><p>{{ imageFile.name }}</p><button type="button" @click="emit('image-selected',null)">Descartar imagen seleccionada</button></template>
    <p v-if="imageMessage" role="alert">{{ imageMessage }}</p>
   </div>
   <label v-for="k in ['description','checklist','techSpecs','comments']" :key="k" class="production-product-text">{{ labels[k] }}<textarea v-model="form[k]" :maxlength="productionProductFields[k]" :rows="k==='comments'?3:5"></textarea></label>
  </div>
 </section>
 <div class="production-product-composition">
  <section aria-labelledby="product-processes-title" class="production-composition-section">
   <h3 id="product-processes-title">Procesos</h3><div class="production-composition-body"><button v-if="editing" type="button" @click="addProcess">+ Agregar proceso</button>
   <template v-if="editing"><div v-for="(p,i) in processes" :key="i" class="product-process-card">
    <div class="production-product-fields">
     <label>Nombre<input v-model="p.name" maxlength="200" required></label>
     <label>Tipo<select v-model="p.type" @change="p.supplierId='';p.userName='';p.equipment=''"><option value="INTERNAL">Interno</option><option value="EXTERNAL">Externo</option></select></label>
     <template v-if="p.type==='INTERNAL'"><label>Responsable<input v-model="p.userName" maxlength="200"></label><label>Equipo<input v-model="p.equipment" maxlength="200"></label></template>
     <label v-else>Proveedor<select v-model="p.supplierId" required><option value="">Selecciona un proveedor</option><option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option></select></label>
     <label>Tiempo (h)<input v-model="p.time" type="number" min="0" max="1000000" step="0.001" required></label>
     <label>Costo unitario<input v-model="p.unitCost" type="number" min="0" max="1000000000000" step="0.01" required></label>
     <label class="production-product-text">Comentarios<textarea v-model="p.comments" maxlength="2000" rows="2"></textarea></label>
    </div>
    <button v-if="editing" type="button" title="Quitar proceso" aria-label="Quitar proceso" @click="processes.splice(i,1)">×</button>
   </div></template>
   <div v-else-if="processes.length" class="sigmyp-account-table-scroll"><table class="production-composition-table"><thead><tr><th>Nombre</th><th>Tipo</th><th>Responsable / Proveedor</th><th>Equipo</th><th>Tiempo (h)</th><th>Costo unitario</th><th>Comentarios</th></tr></thead><tbody><tr v-for="(p,i) in processes" :key="i"><td>{{ p.name }}</td><td>{{ p.type==='INTERNAL'?'Interno':'Externo' }}</td><td>{{ p.type==='EXTERNAL'?(suppliers.find(s=>s.id===p.supplierId)?.name||'—'):(p.userName||'—') }}</td><td>{{ p.equipment||'—' }}</td><td>{{ p.time }}</td><td>{{ money(p.unitCost) }}</td><td>{{ p.comments||'—' }}</td></tr></tbody></table></div>
   <p v-if="!processes.length" class="production-composition-empty">No hay procesos asociados.</p></div>
  </section>
  <section aria-labelledby="product-items-title" class="production-composition-section">
   <h3 id="product-items-title">Ítems</h3><div class="production-composition-body">
   <div v-if="editing" class="production-picker"><label>Ítem<select v-model="picker"><option value="">Selecciona un ítem</option><option v-for="i in catalog" :key="i.id" :value="i.id">{{ i.name }}</option></select></label><label>Código<select v-model="picker"><option value="">Selecciona un código</option><option v-for="i in catalog" :key="i.id" :value="i.id">{{ i.code }}</option></select></label><label>Cantidad<input v-model="quantity" type="text" inputmode="decimal" maxlength="24" aria-label="Cantidad para agregar ítem" @keydown.enter.prevent="addItem"></label><button type="button" @click="addItem">Agregar</button></div><p v-if="error" role="alert">{{ error }}</p>
   <div class="sigmyp-account-table-scroll"><table class="production-composition-table" aria-label="Ítems del producto"><thead><tr><th>Código</th><th>Nombre</th><th>Cantidad</th><th>Costo promedio unitario</th><th v-if="editing">Acciones</th></tr></thead><tbody><tr v-for="(item,i) in items" :key="item.id||i"><td>{{ item.code||'—' }}</td><td>{{ item.name }}</td><td><input v-if="editing" v-model="item.quantity" aria-label="Cantidad del ítem" type="text" inputmode="decimal" maxlength="24" required><span v-else>{{ item.quantity }}</span></td><td>{{ money(item.averageUnitCost) }}</td><td v-if="editing"><button type="button" title="Quitar ítem" aria-label="Quitar ítem" @click="items.splice(i,1)">×</button></td></tr><tr v-if="!items.length"><td colspan="4" class="production-composition-empty">No hay ítems asociados.</td></tr></tbody></table></div></div>
  </section>
 </div>
</div>
</template>
