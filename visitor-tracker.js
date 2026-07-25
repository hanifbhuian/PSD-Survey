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

  function fieldForName(name){
    const el=document.querySelector('[name="'+name+'"]');
    return el&&el.closest?el.closest(".field"):null;
  }

  function setQuestionLabel(name,text){
    const field=fieldForName(name);
    if(!field)return;
    const label=field.querySelector("label.question");
    if(label)label.textContent=text;
  }

  function applyFormRevisions(){
    const meta=document.querySelector(".hero .meta");
    if(meta&&meta.textContent.includes("১৫টি আবশ্যিক"))meta.remove();

    const minis=document.querySelectorAll(".intro-grid .mini");
    if(minis.length>=3){
      minis[1].innerHTML="<strong>যোগ্যতা</strong>পীরগাছা বাজার থেকে ৫ কিমির মধ্যে<br>একই পরিবারের সর্বোচ্চ ১ জন অংশ নিতে পারবেন";
      minis[2].innerHTML="<strong>সম্মানী</strong>২৫ টাকা মোবাইল রিচার্জ";
    }

    const firstSection=document.querySelector("#surveyForm .section");
    if(firstSection){
      const sectionHint=firstSection.querySelector(".section-head .hint");
      if(sectionHint)sectionHint.textContent="রিচার্জ গ্রহণের জন্য একটি মোবাইল নম্বর বাধ্যতামূলক; Email এবং লিঙ্গ ঐচ্ছিক।";
    }

    const phone=document.getElementById("phone");
    const recharge=document.getElementById("bkash");
    if(phone){
      const phoneField=phone.closest(".field");
      const label=phoneField&&phoneField.querySelector("label.question");
      if(label)label.textContent="২. মোবাইল নম্বর (রিচার্জের জন্য)";
      if(phoneField&&!phoneField.querySelector(".recharge-purpose-hint")){
        const hint=document.createElement("p");
        hint.className="hint recharge-purpose-hint";
        hint.textContent="বৈধ উত্তর জমা হলে ২৫ টাকা মোবাইল রিচার্জ এই নম্বরে পাঠানো হবে।";
        if(label&&label.nextSibling)phoneField.insertBefore(hint,label.nextSibling);
        else phoneField.appendChild(hint);
      }
    }

    if(recharge){
      recharge.removeAttribute("required");
      const rechargeField=recharge.closest(".field");
      if(rechargeField)rechargeField.style.display="none";
      const syncRecharge=function(){recharge.value=phone?phone.value:"";};
      if(phone)phone.addEventListener("input",syncRecharge);
      syncRecharge();
    }

    const distance=document.querySelector('[name="distance"]');
    if(distance){
      distance.removeAttribute("required");
      distance.value="";
      const distanceField=distance.closest(".field");
      if(distanceField)distanceField.style.display="none";
    }

    setQuestionLabel("age","৩. বয়সের গ্রুপ");
    setQuestionLabel("locationLink","৪. বর্তমান লোকেশন শেয়ার করুন");
    setQuestionLabel("buyFrom","৫. সাধারণত কোথা থেকে নিত্যপ্রয়োজনীয় পণ্য কেনেন?");
    setQuestionLabel("marketTime","৬. বাজার করতে সাধারণত কত সময় লাগে?");
    setQuestionLabel("marketProblems","৭. বাজার থেকে পণ্য সংগ্রহের প্রধান সমস্যাগুলো কী?");
    setQuestionLabel("homeConvenience","৮. ঘরে পণ্য পৌঁছে দেওয়ার সেবা আপনার জন্য কতটা উপকারী হবে?");
    setQuestionLabel("usefulServices","৯. কোন ধরনের পণ্য/সেবা সবচেয়ে বেশি প্রয়োজন হবে?");
    setQuestionLabel("communicationMethods","১০. অর্ডার দেওয়ার সবচেয়ে সহজ মাধ্যম");
    setQuestionLabel("paymentMethod","১১. পছন্দের পেমেন্ট পদ্ধতি");
    setQuestionLabel("costOneThree","১২. ১–৩ কিমির মধ্যে যুক্তিসংগত ডেলিভারি চার্জ");
    setQuestionLabel("trustFactors","১৩. কোন বিষয়গুলো নিশ্চিত হলে আপনি এই সেবা ব্যবহার করবেন?");
    setQuestionLabel("email","১৪. Email ID (ঐচ্ছিক)");
    setQuestionLabel("gender","১৫. লিঙ্গ (ঐচ্ছিক)");
    setQuestionLabel("suggestions","১৬. অতিরিক্ত পরামর্শ (ঐচ্ছিক)");

    const email=document.querySelector('input[name="email"]');
    if(email)email.removeAttribute("required");

    const originalGetFormData=window.getFormData;
    if(typeof originalGetFormData==="function"&&!originalGetFormData.__psdV25Wrapped){
      const wrapped=function(){
        const data=originalGetFormData();
        data.bkash=data.phone||"";
        data.distance="";
        data.submittedFrom="GitHub Pages revised survey v25";
        return data;
      };
      wrapped.__psdV25Wrapped=true;
      window.getFormData=wrapped;
    }

    if(typeof window.updateProgress==="function")window.updateProgress();
  }

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
      if(!submittedSent&&!card.classList.contains("hidden")){
        submittedSent=true;
        send("submitted",{});
      }
    }
    new MutationObserver(check).observe(card,{attributes:true,attributeFilter:["class"]});
    check();
  }

  applyFormRevisions();
  send("visit",{});
  watchSubmission();
  setInterval(sendLocationIfAvailable,1500);
  setInterval(function(){if(document.visibilityState==="visible")send("heartbeat",{});},HEARTBEAT_MS);
  document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")send("heartbeat",{});});
})();