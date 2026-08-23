export function safeText(value=''){
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function attendanceKey(date, subject, studentId){
  return `${date}__${subject}__${studentId}`.replace(/[^a-zA-Z0-9_-]/g,'_');
}
export async function loadSubjects(db, collection, doc, getDoc){
  const snap = await getDoc(doc(db,'settings','config'));
  if(snap.exists() && Array.isArray(snap.data().subjects) && snap.data().subjects.length) return snap.data().subjects;
  return ['DBMS','JAVA','DAA','CNN','AI'];
}
