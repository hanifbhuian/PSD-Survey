(function(){
  "use strict";

  const API_URL = "https://script.google.com/macros/s/AKfycbw_WS2SyYCU2_9pzNBlcWhTDI4dgVZawRk0sNNNFq2WnxCWHjzpMUR04AkeOxuoNd1n/exec";
  const STORAGE_KEY = "psdSurveyDeviceIdV1";
  const COOKIE_KEY = "psd_survey_device";
  const DUPLICATE_MESSAGE = 'দুঃখিত! আপনি ইতিপূর্বে একবার জরিপে অংশগ্রহণ করেছেন এবং আপনার পূর্বের জরিপটি সফলভাবে সম্পন্ন হয়েছে। একই পরিবারের সর্বোচ্চ একজন জরিপে অংশগ্রহণ করতে পারবে এবং একই ডিভাইস থেকে দ্বিতীয়বার অংশগ্রহণ করা যাবে না।';

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
      "• একই মোবাইল, বিকাশ/নগদ নম্বর বা একই ডিভাইস থেকে একবারের বেশি অংশগ্রহণ করা যাবে না।<br>" +
      "• উত্তরদাতাকে পীরগাছা বাজার থেকে ৫ কিলোমিটারের মধ্যে বসবাস করতে হবে।<br>" +
      "• জরিপের সময় ডিভাইসের Location চালু করে browser permission Allow করতে হবে।<br>" +
      "• সঠিক তথ্য দিন; যাচাই শেষে ২৫ টাকা সম্মানী পাঠানো হবে।" +
      "</div>";

    const progress = intro.querySelector(".progress");
    if(progress) intro.insertBefore(box,progress);
    else intro.appendChild(box);
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

  // Add persistent device information to every submission.
  const originalGetFormData = window.getFormData;
  if(typeof originalGetFormData === "function"){
    window.getFormData = function(){
      const data = originalGetFormData();
      data.deviceId = deviceId;
      data.deviceFingerprint = deviceFingerprint;
      return data;
    };
  }

  // Replace the older phone-only duplicate wording with the final message.
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

  addConditions();
  checkDevice();
})();
