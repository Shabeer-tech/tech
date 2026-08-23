import {
  requireStaff, signOut, auth, db, collection, getDocs, firebaseErrorMessage,
  createAdminAccount, doc, setDoc, deleteAdminAccount, isRootAdmin, query, where
} from './firebase.js';

const teacher = document.getElementById('teacher');
const total = document.getElementById('total');
const regular = document.getElementById('regular');
const lateral = document.getElementById('lateral');
const today = document.getElementById('today');

async function load(){
  try{
    const me = await requireStaff();
    teacher.textContent = (me.name || me.email) + ' • ' + (me.role === 'admin' ? 'ADMIN' : 'TEACHER');

    const loadStatsBtn=document.getElementById('loadStatsBtn');
    const statsMsg=document.getElementById('statsMsg');
    if(loadStatsBtn){
      loadStatsBtn.onclick=loadDashboardStats;
    }

    if(me.role === 'admin'){
      const repair=document.getElementById('repairBox');
      if(repair) repair.style.display='block';
      const repairBtn=document.getElementById('repairBtn');
      if(repairBtn) repairBtn.onclick=repairAttendanceLinks;
    }

    // ONLY ddu@gmail.com gets Admin creation/deletion controls.
    // Admin list is still loaded only for the primary admin, because it is a management feature.
    if(isRootAdmin(me)){
      const box=document.getElementById('adminCreateBox');
      if(box) box.style.display='block';
      const manage=document.getElementById('adminManageBox');
      if(manage) manage.style.display='block';
      const form=document.getElementById('adminForm');
      if(form) form.addEventListener('submit', createAdmin);
      await loadAdmins();
    }
  }catch(e){ console.error(e); }
}

async function loadDashboardStats(){
  const btn=document.getElementById('loadStatsBtn');
  const msg=document.getElementById('statsMsg');
  try{
    if(btn) btn.disabled=true;
    if(msg) msg.textContent='Loading...';
    const s = await getDocs(collection(db,'students'));
    let reg=0, lat=0;
    s.forEach(d => { if(d.data().type === 'Lateral') lat++; else reg++; });
    total.textContent=s.size; regular.textContent=reg; lateral.textContent=lat;

    const d=new Date().toISOString().slice(0,10);
    const a=await getDocs(query(collection(db,'attendance'),where('date','==',d)));
    today.textContent=a.size;
    if(msg) msg.textContent='Updated.';
  }catch(e){
    console.error(e);
    if(msg) msg.textContent=firebaseErrorMessage(e);
  }finally{
    if(btn) btn.disabled=false;
  }
}

async function createAdmin(e){
  e.preventDefault();
  const msg=document.getElementById('adminMsg');
  const meEmail=(auth.currentUser?.email||'').toLowerCase();
  if(meEmail !== 'ddu@gmail.com'){
    msg.textContent='Only the primary admin (ddu@gmail.com) can create an Admin.';
    return;
  }
  const email=document.getElementById('adminEmail').value.trim().toLowerCase();
  const password=document.getElementById('adminPassword').value;
  const confirm=document.getElementById('adminConfirm').value;
  if(password!==confirm){msg.textContent='Passwords do not match.';return;}
  if(email==='ddu@gmail.com'){msg.textContent='This is the fixed primary Admin account.';return;}
  msg.textContent='Creating Admin account...';
  try{
    await createAdminAccount(email,password);
    msg.textContent='New Admin account created successfully.';
    document.getElementById('adminForm').reset();
    await loadAdmins();
  }catch(err){msg.textContent=firebaseErrorMessage(err);}
}

async function loadAdmins(){
  const list=document.getElementById('adminList');
  if(!list) return;
  list.textContent='Loading...';
  try{
    const snap=await getDocs(collection(db,'users'));
    const admins=[];
    snap.forEach(d=>{
      const u=d.data();
      if(u.role==='admin') admins.push({uid:d.id,...u});
    });
    admins.sort((a,b)=>(a.email||'').localeCompare(b.email||''));
    list.innerHTML='';
    admins.forEach(u=>{
      const row=document.createElement('div');
      row.className='admin-row';
      const info=document.createElement('div');
      const email=document.createElement('strong');
      email.textContent=u.email || u.authEmail || u.uid;
      const tag=document.createElement('span');
      tag.className='root-tag';
      if((u.email||'').toLowerCase()==='ddu@gmail.com') tag.textContent=' PRIMARY ADMIN';
      info.append(email,tag);
      const btn=document.createElement('button');
      btn.className='danger';
      btn.textContent='Delete Admin';
      btn.disabled=(String(u.email||'').toLowerCase()==='ddu@gmail.com');
      if(!btn.disabled) btn.onclick=()=>removeAdmin(u.uid,u.email||'');
      row.append(info,btn);
      list.appendChild(row);
    });
    if(!admins.length) list.textContent='No admin profiles found.';
  }catch(e){list.textContent=firebaseErrorMessage(e);}
}

async function removeAdmin(uid,email){
  if((auth.currentUser?.email||'').toLowerCase()!=='ddu@gmail.com'){
    alert('Only ddu@gmail.com can delete an Admin.');
    return;
  }
  if(!confirm(`Delete Admin account ${email}? This permanently removes its Firebase Authentication account and profile.`)) return;
  const msg=document.getElementById('adminManageMsg');
  msg.textContent='Deleting...';
  try{
    await deleteAdminAccount(uid,email);
    msg.textContent='Admin deleted successfully.';
    await loadAdmins();
  }catch(e){msg.textContent=firebaseErrorMessage(e);}
}

window.logout=async()=>{await signOut(auth);location.href='login.html'};

async function repairAttendanceLinks(){
  const msg=document.getElementById('repairMsg');
  try{
    msg.textContent='Repairing...';
    const [usersSnap,attSnap]=await Promise.all([getDocs(collection(db,'users')),getDocs(collection(db,'attendance'))]);
    const byRoll={};
    usersSnap.forEach(d=>{const u=d.data();if(u.role==='student'&&u.rollNo)byRoll[String(u.rollNo).trim()]={uid:d.id,email:String(u.email||'').toLowerCase()};});
    let n=0;
    for(const d of attSnap.docs){
      const a=d.data(), u=byRoll[String(a.rollNo||'').trim()];
      if(u && (a.studentEmail!==u.email || a.studentUid!==u.uid)){
        await import('./firebase.js').then(m=>m.updateDoc(doc(db,'attendance',d.id),{studentEmail:u.email,studentUid:u.uid}));
        n++;
      }
    }
    msg.textContent=`Repair complete. ${n} attendance record(s) updated.`;
  }catch(e){msg.textContent=firebaseErrorMessage(e);}
}

load();
