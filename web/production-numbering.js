// Enable only after the shared counter is reconciled and its rules are published.
export const productionNumberingEnabled=true;
export function nextProductionNumber(counter,year){
 if(!counter||!Number.isSafeInteger(counter.last)||counter.last<0||counter.last>=Number.MAX_SAFE_INTEGER)throw Error('El consecutivo de producción no está configurado.');
 if(counter.prefix!=='OP-'||!/^\d{4}$/.test(String(year)))throw Error('La configuración de numeración no es válida.');
 const sequence=counter.last+1;
 return {sequence,number:counter.prefix+year+'-'+String(sequence).padStart(3,'0')};
}
// Some Firestore clients report a stale counter as permission-denied rather than
// aborted. Retry only if another successful creation advanced the counter.
export async function withProductionCounterRetry(operation,readCounter){
 for(let attempt=0;attempt<4;attempt++){const before=await readCounter();try{return await operation();}catch(error){if(attempt===3||error.code!=='permission-denied'||await readCounter()===before)throw error;}}
}
