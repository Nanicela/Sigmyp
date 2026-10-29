<script setup>
import {computed} from 'vue';
import CommercialRecordDetails from './CommercialRecordDetails.vue';
const props=defineProps({contact:Object,account:Object,creating:Boolean,accounts:Array,contacts:Array,canEdit:Boolean,canSave:Boolean,saveRecord:Function,locations:Array,officeTypes:Array});
const emit=defineEmits(['close']);
const fields=computed(()=>{
 const c=props.contact||{};
 const result=[
  ['Nombre completo',c.name],['Cuenta',props.account?.name||'Sin cuenta vinculada'],
  ['NIT / identificación de la cuenta',props.account?.identification],
  ['Cargo',c.jobTitle],['Teléfono 1',c.phone1??c.phone],['Teléfono 2',c.phone2],
  ['Celular',c.mobile],['Email',c.email],['Comentarios',c.comments]
 ];
 if(typeof c.active==='boolean')result.push(['Estado',c.active?'Activo':'Inactivo']);
 return result;
});
</script>
<template>
<CommercialRecordDetails kind="contacts" :record="contact" :fields="fields" :creating="creating" :accounts="accounts" :contacts="contacts" :can-edit="canEdit" :can-save="canSave" :save-record="saveRecord" :locations="locations" :office-types="officeTypes" @close="emit('close')" />
</template>
