(function(){
  "use strict";

  const API_URL = "https://script.google.com/macros/s/AKfycbw_WS2SyYCU2_9pzNBlcWhTDI4dgVZawRk0sNNNFq2WnxCWHjzpMUR04AkeOxuoNd1n/exec";
  const STORAGE_KEY = "psdSurveyDeviceIdV1";
  const COOKIE_KEY = "psd_survey_device";
  const HEARTBEAT_MS = 5 * 60 * 1000;
  let submittedSent = false;
  let lastLocationKey = "";

  function readCookie(name){
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const match = document.cookie.match(new RegExp("(?:^|; )"+escaped+"=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : "";
  }

  function writeCookie(name,value){
    document.cookie = name+"="+encodeURIComponent(value)+"; Max-Age=31536000; Path=/; SameSite=Lax; Secure";
  }

  function makeId(){
    if(window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    const bytes = new Uint8Array(24);
    if(window.crypto && window.crypto.getRandomValues){
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
    }
    return "psd-"+Date.now()+"-"+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
  }

  function visitorId(){
    let id="";
    try{id=localStorage.getItem(STORAGE_KEY)||"";}catch(e){}
    if(!id) id=readCookie(COOKIE_KEY);
    if(!id) id=makeId();
    try{localStorage.setItem(STORAGE_KEY,id);}catch(e){}
    writeCookie(COOKIE_KEY,id);
    return id;
  }

  const id = visitorId();
  const ua = String(navigator.userAgent||"");

  function browserName(){
    if(/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook in-app";
    if(/Messenger/i.test(ua)) return "Messenger in-app";
    if(/Instagram/i.test(ua)) return "Instagram in-app";
    if(/Edg\//i.test(ua)) return "Edge";
    if(/OPR\//i.test(ua)) return "Opera";
    if(/CriOS|Chrome\//i.test(ua)) return "Chrome";
    if(/FxiOS|Firefox\//i.test(ua)) return "Firefox";
    if(/Safari\//i.test(ua)) return "Safari";
    return "Other";
  }

  function osName(){
    if(/Android/i.test(ua)) return "Android";
    if(/iPhone|iPad|iPod/i.test(ua)) return "iOS/iPadOS";
    if(/Windows/i.test(ua)) return "Windows";
    if(/Macintosh|Mac OS X/i.test(ua)) return "macOS";
    if(/Linux/i.test(ua)) return "Linux";
    return "Other";
  }

  function deviceType(){
    if(/iPad|Tablet/i.test(ua)) return "Tablet";
    if(/Mobi|Android|iPhone|iPod/i.test(ua)) return "Mobile";
    return "Desktop/Laptop";
  }

  function sourceName(){
    if(/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook app";
    if(/Messenger/i.test(ua)) return "Messenger app";
    if(/Instagram/i.test(ua)) return "Instagram app";
    const ref=String(document.referrer||"").toLowerCase();
    if(ref.includes("facebook.com")||ref.includes("fb.com")) return "Facebook";
    if(ref.includes("messenger.com")) return "Messenger";
    if(ref.includes("instagram.com")) return "Instagram";
    if(ref.includes("google.")) return "Google";
    return ref ? "Other referral" : "Direct/QR/Short link";
  }

  function baseParams(){
    return {
      visitorId:id,
      referrer:String(document.referrer||"").slice(0,500),
      source:sourceName(),
      browser:browserName(),
      os:osName(),
      deviceType:deviceType(),
      inAppBrowser:/(FBAN|FBAV|FB_IAB|Messenger|Instagram)/i.test(ua)?"Yes":"No",
      language:String(navigator.language||""),
      timezone:(Intl.DateTimeFormat().resolvedOptions().timeZone||""),
      screen:(screen.width||0)+"x"+(screen.height||0),
      pageUrl:String(location.href||"").slice(0,500)
    };
  }

  function send(eventName,extra){
    const params=Object.assign(baseParams(),extra||{},{action:"trackVisitor",event:eventName});
    const cb="psdVisitor_"+Date.now()+"_"+Math.floor(Math.random()*100000);
    const script=document.createElement("script");
    let done=false;

    function clean(){
      if(done)return;
      done=true;
      try{delete window[cb];}catch(e){window[cb]=undefined;}
      if(script.parentNode)script.parentNode.removeChild(script);
    }

    const timer=setTimeout(clean,12000);
    window[cb]=function(){clearTimeout(timer);clean();};
    script.onerror=function(){clearTimeout(timer);clean();};
    params.callback=cb;
    params._=Date.now();
    script.src=API_URL+"?"+Object.keys(params).map(k=>encodeURIComponent(k)+"="+encodeURIComponent(params[k]??"")).join("&");
    document.head.appendChild(script);
  }

  function sendLocationIfAvailable(){
    const latEl=document.getElementById("latitude");
    const lngEl=document.getElementById("longitude");
    if(!latEl||!lngEl)return;
    const lat=String(latEl.value||"").trim();
    const lng=String(lngEl.value||"").trim();
    if(!lat||!lng)return;
    const key=lat+","+lng;
    if(key===lastLocationKey)return;
    lastLocationKey=key;
    send("location",{latitude:lat,longitude:lng});
  }

  function watchSubmission(){
    const card=document.getElementById("successCard");
    if(!card)return;
    function check(){
      if(!submittedSent && !card.classList.contains("hidden")){
        submittedSent=true;
        send("submitted",{});
      }
    }
    new MutationObserver(check).observe(card,{attributes:true,attributeFilter:["class"]});
    check();
  }

  send("visit",{});
  watchSubmission();
  setInterval(sendLocationIfAvailable,1500);
  setInterval(function(){if(document.visibilityState==="visible")send("heartbeat",{});},HEARTBEAT_MS);
  document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")send("heartbeat",{});});
})();
