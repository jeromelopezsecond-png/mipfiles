/* Supabase Storage layer. Bucket: "reviewers" (private).
   File naming rule: upload each reviewer as  <id>.<ext>  e.g. 1.pdf, 3.docx, 4.pptx
   (the id is the first number in the R list in app.js, ext = the type in lowercase). */
const BUCKET='reviewers';
const filePath=r=>r.id+'.'+r.type.toLowerCase();
if(typeof sb!=='undefined'&&sb){
  window.dl=async function(id){
    if(!me){toast('Sign in to download');return}
    const r=R.find(x=>x.id==id);
    const {data,error}=await sb.storage.from(BUCKET).createSignedUrl(filePath(r),120,{download:r.title+'.'+r.type.toLowerCase()});
    if(error||!data){toast('File not uploaded yet.');return}
    r.dl++;sb.rpc('bump_download',{rid:+id}).then(()=>{},()=>{});
    location.href=data.signedUrl;
  };
  const _r=V.r;
  V.r=function(id){
    _r(id);
    const r=R.find(x=>x.id==id),box=app.querySelector('.prev');
    if(!r||!box||!me)return;
    sb.storage.from(BUCKET).createSignedUrl(filePath(r),600).then(({data})=>{
      if(!data||!app.contains(box))return;
      if(r.type==='PDF'){
        box.style.cssText='height:70vh;padding:0;display:block;overflow:hidden;border-style:solid';
        box.innerHTML='<iframe src="'+data.signedUrl+'" title="Preview" style="width:100%;height:100%;border:0"></iframe>';
        box.insertAdjacentHTML('afterend','<p class="sm mt"><a style="text-decoration:underline" target="_blank" rel="noopener" href="'+data.signedUrl+'">Open PDF in a new tab</a> (better on phones)</p>');
      }else{
        box.innerHTML='Preview is available for PDF files only.<br>Use the Download button to open this '+r.type+'.';
      }
    });
  };
}
