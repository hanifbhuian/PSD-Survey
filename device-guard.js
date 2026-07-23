(function(){
  "use strict";

  const API_URL = "https://script.google.com/macros/s/AKfycbw_WS2SyYCU2_9pzNBlcWhTDI4dgVZawRk0sNNNFq2WnxCWHjzpMUR04AkeOxuoNd1n/exec";
  const STORAGE_KEY = "psdSurveyDeviceIdV1";
  const COOKIE_KEY = "psd_survey_device";
  const DUPLICATE_MESSAGE = 'দুঃখিত! আপনি ইতিপূর্বে একবার জরিপে অংশগ্রহণ করেছেন এবং আপনার পূর্বের জরিপটি সফলভাবে সম্পন্ন হয়েছে। একই পরিবারের সর্বোচ্চ একজন জরিপে অংশগ্রহণ করতে পারবে এবং একই ডিভাইস থেকে দ্বিতীয়বার অংশগ্রহণ করা যাবে না।';
  const SUCCESS_MESSAGE_HTML = 'ধন্যবাদ। আপনার উত্তর সফলভাবে জমা হয়েছে। তথ্য যাচাই শেষে আগামী ২ দিনের মধ্যে আপনার প্রদত্ত মোবাইল নম্বরে ২৫ টাকা রিচার্জ পাঠানো হবে।<br><br>জরিপসংক্রান্ত কোনো প্রশ্ন থাকলে আমাদের ইমেল করুন: <a href="mailto:geoacademy001@gmail.com" style="color:#0f766e;font-weight:800;text-decoration:underline;">geoacademy001@gmail.com</a>';

  function readCookie(name){
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(new RegExp("(?:^|; )" + escaped + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : "";
  }

  function writeCookie(name,value){
    document.cookie = name + "=" + encodeURIComponent(value) +
      "; Max-Age=31536000; Path=/; SameSite=Lax; Secure";
  }

  function createDeviceId(){
    if(window.crypto && typeof window.crypto.randomUUID === "function"){
      return window.crypto.randomUUID();
    }
    const bytes = new Uint8Array(24);
    if(window.crypto && window.crypto.getRandomValues){
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
    }
    return "psd-" + Date.now() + "-" + Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2);
  }

  function getOrCreateDeviceId(){
    let value = "";
    try{ value = localStorage.getItem(STORAGE_KEY) || ""; }catch(e){}
    if(!value) value = readCookie(COOKIE_KEY);
    if(!value) value = createDeviceId();
    try{ localStorage.setItem(STORAGE_KEY,value); }catch(e){}
    writeCookie(COOKIE_KEY,value);
    return value;
  }

  function buildFingerprint(){
    const uaData = navigator.userAgentData
      ? JSON.stringify({
          brands:navigator.userAgentData.brands || [],
          mobile:!!navigator.userAgentData.mobile,
          platform:navigator.userAgentData.platform || ""
        })
      : "";

    return [
      navigator.userAgent || "",
      navigator.platform || "",
      uaData,
      screen.width + "x" + screen.height,
      screen.colorDepth || "",
      window.devicePixelRatio || "",
      Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      navigator.language || "",
      (navigator.languages || []).join(","),
      navigator.hardwareConcurrency || "",
      navigator.deviceMemory || "",
      navigator.maxTouchPoints || ""
    ].join("|");
  }

  const deviceId = getOrCreateDeviceId();
  const deviceFingerprint = buildFingerprint();

  function isFacebookMessengerBrowser(){
    const ua = String(navigator.userAgent || "");
    return /(FBAN|FBAV|FB_IAB|Messenger|Instagram)/i.test(ua);
  }

  function isAndroid(){
    return /Android/i.test(String(navigator.userAgent || ""));
  }

  function copyText(text){
    if(navigator.clipboard && window.isSecureContext){
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function(resolve,reject){
      try{
        const input = document.createElement("textarea");
        input.value = text;
        input.setAttribute("readonly","");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const ok = document.execCommand("copy");
        input.remove();
        ok ? resolve() : reject(new Error("copy failed"));
      }catch(err){ reject(err); }
    });
  }

  function openInChrome(){
    const current = window.location.href.replace(/^https?:\/\//i,"");
    window.location.href = "intent://" + current + "#Intent;scheme=https;package=com.android.chrome;end";
  }

  function addInAppLocationNotice(){
    if(!isFacebookMessengerBrowser()) return;
    const box = document.querySelector(".location-box");
    if(!box || document.getElementById("inAppLocationNotice")) return;

    const notice = document.createElement("div");
    notice.id = "inAppLocationNotice";
    notice.style.cssText =
      "margin:0 0 12px;padding:12px 14px;border:1px solid #f59e0b;" +
      "background:#fffbeb;color:#78350f;border-radius:14px;font-size:14px;line-height:1.65";
    notice.innerHTML =
      "<strong>Facebook/Messenger browser শনাক্ত হয়েছে</strong><br>" +
      "এই browser-এ ডিভাইসের Location কাজ নাও করতে পারে। উপরের <strong>⋯</strong> মেনু থেকে " +
      "<strong>Open in browser / Open in Chrome / Open in Safari</strong> নির্বাচন করে জরিপটি খুলুন।";

    const actionRow = document.createElement("div");
    actionRow.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px";

    if(isAndroid()){
      const chromeBtn = document.createElement("button");
      chromeBtn.type = "button";
      chromeBtn.textContent = "Chrome-এ খুলুন";
      chromeBtn.className = "btn secondary";
      chromeBtn.style.cssText = "padding:9px 12px;font-size:14px";
      chromeBtn.addEventListener("click",openInChrome);
      actionRow.appendChild(chromeBtn);
    }

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.textContent = "জরিপের লিংক কপি করুন";
    copyBtn.className = "btn secondary";
    copyBtn.style.cssText = "padding:9px 12px;font-size:14px";
    copyBtn.addEventListener("click",function(){
      copyText(window.location.href).then(function(){
        copyBtn.textContent = "✓ লিংক কপি হয়েছে";
        setTimeout(function(){ copyBtn.textContent = "জরিপের লিংক কপি করুন"; },2500);
      }).catch(function(){
        copyBtn.textContent = "লিংক কপি করা যায়নি";
      });
    });
    actionRow.appendChild(copyBtn);
    notice.appendChild(actionRow);

    const firstChild = box.firstElementChild;
    if(firstChild) box.insertBefore(notice,firstChild);
    else box.appendChild(notice);

    const status = document.getElementById("locationStatus");
    if(status){
      status.textContent = "Facebook/Messenger browser থেকে Location নেওয়া যাবে না। Chrome/Safari-তে খুলুন।";
    }
  }

  function blockInAppLocationAttempt(event){
    if(!isFacebookMessengerBrowser()) return;
    const target = event.target && event.target.closest ? event.target.closest("#locationBtn") : null;
    if(!target) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    addInAppLocationNotice();
    const notice = document.getElementById("inAppLocationNotice");
    if(notice) notice.scrollIntoView({behavior:"smooth",block:"center"});

    const status = document.getElementById("locationStatus");
    if(status){
      status.textContent = "Location সংগ্রহের জন্য জরিপটি Chrome অথবা Safari-তে খুলুন।";
    }
  }

  function addConditions(){
    const intro = document.querySelector(".intro-card");
    if(!intro) return;

    const oldSingleCondition = intro.querySelector(".notice.success");
    if(
      oldSingleCondition &&
      oldSingleCondition.textContent.includes("পীরগাছা বাজার থেকে ৫ কিলোমিটারের মধ্যে")
    ){
      oldSingleCondition.remove();
    }

    if(document.getElementById("surveyCommonConditions")) return;

    const box = document.createElement("div");
    box.id = "surveyCommonConditions";
    box.style.cssText =
      "margin-top:12px;padding:12px 14px;border:1px solid #c7e8dd;" +
      "background:#f0fdfa;border-radius:14px;font-size:14px;line-height:1.7;color:#174c43";
    box.innerHTML =
      "<strong>অংশগ্রহণের সংক্ষিপ্ত শর্ত:</strong>" +
      "<div style='margin-top:5px'>" +
      "• একই পরিবারের সর্বোচ্চ একজন অংশগ্রহণ করতে পারবেন।<br>" +
      "• একই মোবাইল বা রিচার্জ নম্বর অথবা একই ডিভাইস থেকে একবারের বেশি অংশগ্রহণ করা যাবে না।<br>" +
      "• উত্তরদাতাকে পীরগাছা বাজার থেকে ৫ কিলোমিটারের মধ্যে বসবাস করতে হবে।<br>" +
      "• জরিপের সময় ডিভাইসের Location চালু করে browser permission Allow করতে হবে।<br>" +
      "• সঠিক তথ্য দিন; যাচাই শেষে ২৫ টাকা মোবাইল রিচার্জ পাঠানো হবে।" +
      "</div>";

    const progress = intro.querySelector(".progress");
    if(progress) intro.insertBefore(box,progress);
    else intro.appendChild(box);
  }

  function applySuccessMessage(){
    const card = document.getElementById("successCard");
    const message = document.getElementById("successMessage");
    if(!card || !message) return;

    function update(){
      if(!card.classList.contains("hidden")){
        message.innerHTML = SUCCESS_MESSAGE_HTML;
      }
    }

    const observer = new MutationObserver(update);
    observer.observe(card,{attributes:true,attributeFilter:["class"]});
    update();
  }

  function showDuplicateBlock(){
    const form = document.getElementById("surveyForm");
    if(form) form.classList.add("hidden");

    let card = document.getElementById("deviceDuplicateCard");
    if(!card){
      card = document.createElement("section");
      card.id = "deviceDuplicateCard";
      card.className = "success-card section";
      card.style.cssText =
        "border:1px solid #fecaca;background:#fff7f7;color:#7f1d1d;" +
        "margin-top:18px";
      card.innerHTML =
        "<h2 style='margin-top:0'>দুঃখিত!</h2>" +
        "<p style='margin-bottom:0'>" + DUPLICATE_MESSAGE.replace(/^দুঃখিত!\s*/,"") + "</p>";

      const intro = document.querySelector(".intro-card");
      if(intro && intro.parentNode){
        intro.parentNode.insertBefore(card,intro.nextSibling);
      } else {
        document.body.appendChild(card);
      }
    } else {
      card.classList.remove("hidden");
    }
    card.scrollIntoView({behavior:"smooth",block:"center"});
  }

  const originalGetFormData = window.getFormData;
  if(typeof originalGetFormData === "function"){
    window.getFormData = function(){
      const data = originalGetFormData();
      data.deviceId = deviceId;
      data.deviceFingerprint = deviceFingerprint;
      return data;
    };
  }

  const originalShowMessage = window.showMessage;
  if(typeof originalShowMessage === "function"){
    window.showMessage = function(text,type){
      const value = String(text || "");
      if(
        value.includes("আগে জরিপে অংশ নেওয়া হয়েছে") ||
        value.includes("ইতিপূর্বে একবার জরিপে অংশগ্রহণ")
      ){
        originalShowMessage(DUPLICATE_MESSAGE,type);
        return;
      }
      originalShowMessage(text,type);
    };
  }

  function checkDevice(){
    const callback = "psdDeviceCheck_" + Date.now() + "_" + Math.floor(Math.random()*100000);
    const script = document.createElement("script");
    let finished = false;

    function cleanup(){
      if(finished) return;
      finished = true;
      try{ delete window[callback]; }catch(e){ window[callback] = undefined; }
      if(script.parentNode) script.parentNode.removeChild(script);
    }

    const timer = setTimeout(cleanup,12000);

    window[callback] = function(payload){
      clearTimeout(timer);
      cleanup();
      if(payload && payload.exists) showDuplicateBlock();
    };

    script.onerror = function(){
      clearTimeout(timer);
      cleanup();
    };

    script.src = API_URL +
      "?action=checkDevice&deviceId=" + encodeURIComponent(deviceId) +
      "&callback=" + encodeURIComponent(callback) +
      "&_=" + Date.now();

    document.head.appendChild(script);
  }

  document.addEventListener("click",blockInAppLocationAttempt,true);
  addConditions();
  addInAppLocationNotice();
  applySuccessMessage();
  checkDevice();
})();
