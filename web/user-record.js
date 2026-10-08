import {doc,getDoc,runTransaction,serverTimestamp} from 'firebase/firestore';
export function normalizeUser(input) {
  const limits={firstName:80,lastName:80,documentType:12,identification:30,phone:30,jobTitle:100};
  const data={};
  for(const [key,max] of Object.entries(limits)) {data[key]=String(input[key]||'').trim();if(!data[key]||data[key].length>max)throw Error('Completa los datos de tu ficha de usuario.');}
  if(!['CC','CE','PASAPORTE'].includes(data.documentType)||!/^[A-Za-z0-9-]{5,30}$/.test(data.identification))throw Error('Revisa el tipo y número de identificación.');
  return data;
}
export const userRecord=(db,user)=>getDoc(doc(db,'registeredUsers',user.uid));
export async function registerUserRecord(db,user,input) {
  const values=normalizeUser(input),ref=doc(db,'registeredUsers',user.uid);
  await runTransaction(db,async tx=>{
    const old=await tx.get(ref);if(old.exists())return;
    tx.set(ref,{...values,email:user.email,uid:user.uid,createdAt:serverTimestamp()});
  });
}
