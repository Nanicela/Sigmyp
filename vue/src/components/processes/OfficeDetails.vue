<script setup>
import {computed} from 'vue';
import CommercialRecordDetails from './CommercialRecordDetails.vue';
const props=defineProps({office:Object,account:Object,creating:Boolean,accounts:Array,contacts:Array,canEdit:Boolean,canSave:Boolean,saveRecord:Function,locations:Array,officeTypes:Array});
const emit=defineEmits(['close']);
const fields=computed(()=>{
 const c=props.office||{};
 const result=[
  ['Nombre de la oficina',c.name],['Cuenta',props.account?.name||'Sin cuenta vinculada'],
  ['NIT / identificación de la cuenta',props.account?.identification],
  ['Contacto',c.contactName],['Tipo de oficina',c.type],
  ['Dirección',c.address],['Ciudad',c.municipality],['Departamento',c.department],
  ['Teléfono 1',c.phone1??c.phone],['Teléfono 2',c.phone2],['Email',c.email],
  ['Nombre del técnico',c.technicianName],['Teléfono del técnico',c.technicianPhone],
  ['Email del técnico',c.technicianEmail],['Comentarios',c.comments]
 ];
 if(typeof c.active==='boolean')result.push(['Estado',c.active?'Activo':'Inactivo']);
 return result;
});
</script>
<template>
<CommercialRecordDetails kind="offices" :record="office" :fields="fields" :creating="creating" :accounts="accounts" :contacts="contacts" :can-edit="canEdit" :can-save="canSave" :save-record="saveRecord" :locations="locations" :office-types="officeTypes" @close="emit('close')" />
</template>
