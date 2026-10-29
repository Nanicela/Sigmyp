// Scoped to the current authenticated company. Errors remain cached until reset/retry.
export function createDemandCache(){
 let entries=new Map();
 return {run(key,load){if(!entries.has(key))entries.set(key,Promise.resolve().then(load));return entries.get(key);},reset(){entries=new Map();},retry(key){entries.delete(key);}};
}
