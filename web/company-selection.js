export function chooseCompany(ids, {platform, selected='', previous=''}) {
  if(!platform)return ids.length===1?ids[0]:'';
  return [selected,previous].find(id=>id&&ids.includes(id))||'';
}
