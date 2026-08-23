document.addEventListener("DOMContentLoaded",()=>{
  const nav=document.getElementById("adminNav");
  const toggle=document.getElementById("menuToggle");
  if(!nav||!toggle)return;
  toggle.addEventListener("click",()=>{
    const open=nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded",String(open));
    toggle.textContent=open?"✕ Close Menu":"☰ Menu";
  });
  const page=location.pathname.split("/").pop()||"admin.html";
  nav.querySelectorAll(".nav-links a").forEach(a=>{
    if(a.getAttribute("href")===page)a.setAttribute("aria-current","page");
    a.addEventListener("click",()=>{
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded","false");
      toggle.textContent="☰ Menu";
    });
  });
});
