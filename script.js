(function(){
  "use strict";
 
  /* ---------------- state ---------------- */
  var seq = 1000;
  var listings = [];
  var donors = [];
 
  function nextId(){ seq += 1; return "AS-" + seq; }
 
  function iso(dayOffsetHours){
    var d = new Date(Date.now() + dayOffsetHours*3600000);
    return d.toISOString().slice(0,16);
  }
 
  function seed(){
    [
      {name:"Vegetable rice", cat:"Vegetarian", qty:30, city:"Vijayawada", spot:"Benz Circle", icon:"🍚", status:"Available", note:"Freshly prepared. Kindly collect before 4 PM."},
      {name:"Idly & sambar", cat:"Vegetarian", qty:20, city:"Guntur", spot:"Brodipet", icon:"🍥", status:"Available", note:"Packed in steel containers."},
      {name:"Chapati & curry", cat:"Vegetarian", qty:25, city:"Mangalagiri", spot:"NRI Junction", icon:"🫓", status:"Requested", note:"Claimed by Annadaata Trust."},
      {name:"Bread & fruits", cat:"Bakery / Fruit", qty:15, city:"Vijayawada", spot:"Governorpet", icon:"🥐", status:"Distributed", note:"Served at the night shelter."},
      {name:"Chicken biryani", cat:"Non-vegetarian", qty:40, city:"Visakhapatnam", spot:"MVP Colony", icon:"🍛", status:"Available", note:"From a cancelled function. Collect within 3 hours."},
      {name:"Milk packets", cat:"Packaged", qty:50, city:"Markapur", spot:"Bus stand road", icon:"🥛", status:"Collected", note:"Sealed packets, expiry tomorrow."}
    ].forEach(function(s,i){
      listings.push({
        id: nextId(), name:s.name, cat:s.cat, qty:s.qty, city:s.city, spot:s.spot,
        icon:s.icon, status:s.status, note:s.note, phone:"98765432"+(10+i),
        prep: iso(-2-i), before: iso(4+i), donor:"Seeded donor",
        history: buildHistory(s.status)
      });
    });
  }
 
  var STAGES = ["Donation created","Request received","Food collected","Food distributed"];
 
  function buildHistory(status){
    var reached = {"Available":1,"Requested":2,"Collected":3,"Distributed":4}[status] || 1;
    var out = [];
    for (var i=0;i<STAGES.length;i++){
      out.push({ label: STAGES[i], done: i < reached, at: i < reached ? stamp(-(reached-i)*2) : null });
    }
    return out;
  }
 
  function stamp(hoursAgo){
    var d = new Date(Date.now() + hoursAgo*3600000);
    return d.toLocaleString("en-IN", {day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"});
  }
 
  function icon(cat){
    return {"Vegetarian":"🍚","Non-vegetarian":"🍗","Bakery / Fruit":"🍎","Packaged":"📦"}[cat] || "🍲";
  }
 
  /* ---------------- helpers ---------------- */
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
 
  var toastTimer;
  function toast(msg){
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove("on"); }, 3200);
  }
 
  function mark(el, ok){
    var f = el.closest(".field");
    if (f) f.classList.toggle("bad", !ok);
    return ok;
  }
 
  var phoneRe = /^[6-9]\d{9}$/;
  var mailRe  = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
 
  /* ---------------- routing ---------------- */
  var current = "home";
  function go(view){
    var target = $("v-" + view);
    if (!target) return;
    document.querySelectorAll(".view").forEach(function(v){ v.classList.remove("on"); });
    target.classList.add("on");
    document.querySelectorAll("#nav button").forEach(function(b){
      if (b.dataset.go === view) b.setAttribute("aria-current","page");
      else b.removeAttribute("aria-current");
    });
    current = view;
    window.scrollTo({ top:0, behavior:"smooth" });
    if (view === "dashboard") drawDashboard();
    if (view === "find") render();
  }
 
  document.addEventListener("click", function(e){
    var btn = e.target.closest("[data-go]");
    if (btn){ go(btn.dataset.go); }
  });
 
  /* ---------------- find + filter ---------------- */
  function matches(item){
    var q = $("q").value.trim().toLowerCase();
    var cat = $("f-cat").value, city = $("f-city").value, st = $("f-status").value;
    if (q && item.name.toLowerCase().indexOf(q) === -1 && item.cat.toLowerCase().indexOf(q) === -1) return false;
    if (cat && item.cat !== cat) return false;
    if (city && item.city !== city) return false;
    if (st && item.status !== st) return false;
    return true;
  }
 
  function render(){
    var box = $("results");
    var rows = listings.filter(matches);
    if (!rows.length){
      box.innerHTML = '<div class="empty">No listings match those filters. Clear the search or widen the city to see more food.</div>';
      return;
    }
    box.innerHTML = rows.map(function(it){
      var open = it.status === "Available";
      return '<article class="item' + (open ? "" : " taken") + '">' +
        '<div class="thumb" aria-hidden="true">' + it.icon + '</div>' +
        '<div><h3>' + esc(it.name) + ' <span class="tag veg">' + esc(it.cat) + '</span></h3>' +
        '<div class="meta">' + it.qty + ' meals · ' + esc(it.spot) + ', ' + esc(it.city) + '</div>' +
        '<div class="meta">Ref ' + it.id + ' · collect before ' + fmt(it.before) + '</div></div>' +
        '<div class="right"><span class="tag' + (open ? "" : " req") + '">' + it.status + '</span>' +
        (open
          ? '<button class="btn small" data-req="' + it.id + '">Request</button>'
          : '<button class="btn small ghost" data-track="' + it.id + '">View status</button>') +
        '</div></article>';
    }).join("");
  }
 
  function fmt(v){
    if (!v) return "—";
    var d = new Date(v);
    if (isNaN(d)) return v;
    return d.toLocaleString("en-IN", {day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"});
  }
 
  ["q","f-cat","f-city","f-status"].forEach(function(id){
    $(id).addEventListener("input", render);
    $(id).addEventListener("change", render);
  });
 
  /* ---------------- request modal ---------------- */
  var activeId = null;
 
  document.addEventListener("click", function(e){
    var r = e.target.closest("[data-req]");
    if (r){ openModal(r.dataset.req); return; }
    var t = e.target.closest("[data-track]");
    if (t){ go("track"); $("t-id").value = t.dataset.track; track(); }
  });
 
  function openModal(id){
    var it = listings.find(function(x){ return x.id === id; });
    if (!it) return;
    activeId = id;
    $("m-sub").textContent = it.name + " — " + it.qty + " meals available at " + it.spot + ", " + it.city + ".";
    $("m-qty").max = it.qty;
    $("m-qty-err").textContent = "Enter a quantity between 1 and " + it.qty + ".";
    $("modal").classList.add("on");
    $("m-name").focus();
  }
 
  function closeModal(){
    $("modal").classList.remove("on");
    $("f-request").reset();
    document.querySelectorAll("#f-request .field").forEach(function(f){ f.classList.remove("bad"); });
    activeId = null;
  }
 
  $("m-cancel").addEventListener("click", closeModal);
  $("modal").addEventListener("click", function(e){ if (e.target === $("modal")) closeModal(); });
  document.addEventListener("keydown", function(e){ if (e.key === "Escape" && $("modal").classList.contains("on")) closeModal(); });
 
  $("f-request").addEventListener("submit", function(e){
    e.preventDefault();
    var it = listings.find(function(x){ return x.id === activeId; });
    if (!it) return;
    var qty = parseInt($("m-qty").value, 10);
    var ok = true;
    ok = mark($("m-name"), $("m-name").value.trim().length >= 2) && ok;
    ok = mark($("m-org"), $("m-org").value.trim().length >= 2) && ok;
    ok = mark($("m-phone"), phoneRe.test($("m-phone").value.trim())) && ok;
    ok = mark($("m-qty"), qty >= 1 && qty <= it.qty) && ok;
    ok = mark($("m-when"), !!$("m-when").value) && ok;
    ok = mark($("m-purpose"), $("m-purpose").value.trim().length >= 10) && ok;
    if (!ok){ toast("Check the highlighted fields."); return; }
 
    it.status = "Requested";
    it.requestedBy = $("m-org").value.trim();
    it.history[1].done = true;
    it.history[1].at = stamp(0);
    it.note = "Requested by " + it.requestedBy + " for " + qty + " meals.";
    closeModal();
    render();
    toast("Request sent. Reference " + it.id + " — track it any time.");
  });
 
  /* ---------------- donor registration ---------------- */
  $("f-register").addEventListener("submit", function(e){
    e.preventDefault();
    var ok = true;
    ok = mark($("r-name"), $("r-name").value.trim().length >= 3) && ok;
    ok = mark($("r-type"), !!$("r-type").value) && ok;
    ok = mark($("r-phone"), phoneRe.test($("r-phone").value.trim())) && ok;
    ok = mark($("r-email"), mailRe.test($("r-email").value.trim())) && ok;
    ok = mark($("r-city"), !!$("r-city").value) && ok;
    ok = mark($("r-addr"), $("r-addr").value.trim().length >= 5) && ok;
    var agreed = $("r-agree").checked;
    $("r-agree-err").style.display = agreed ? "none" : "block";
    if (!ok || !agreed){ toast("Check the highlighted fields."); return; }
 
    donors.push({ name:$("r-name").value.trim(), city:$("r-city").value });
    $("donor-count").textContent = donors.length;
    $("f-register").reset();
    toast("Welcome aboard, " + donors[donors.length-1].name + ". You can post food now.");
    go("donate");
  });
 
  /* ---------------- donate ---------------- */
  $("f-donate").addEventListener("submit", function(e){
    e.preventDefault();
    var qty = parseInt($("d-qty").value, 10);
    var prep = $("d-prep").value, before = $("d-before").value;
    var ok = true;
    ok = mark($("d-name"), $("d-name").value.trim().length >= 2) && ok;
    ok = mark($("d-cat"), !!$("d-cat").value) && ok;
    ok = mark($("d-qty"), qty >= 1 && qty <= 2000) && ok;
    ok = mark($("d-city"), !!$("d-city").value) && ok;
    ok = mark($("d-prep"), !!prep) && ok;
    ok = mark($("d-before"), !!before && !!prep && new Date(before) > new Date(prep)) && ok;
    ok = mark($("d-spot"), $("d-spot").value.trim().length >= 3) && ok;
    ok = mark($("d-phone"), phoneRe.test($("d-phone").value.trim())) && ok;
    if (!ok){ toast("Check the highlighted fields."); return; }
 
    var item = {
      id: nextId(),
      name: $("d-name").value.trim(),
      cat: $("d-cat").value,
      qty: qty,
      city: $("d-city").value,
      spot: $("d-spot").value.trim(),
      phone: $("d-phone").value.trim(),
      prep: prep, before: before,
      note: $("d-note").value.trim() || "No extra notes.",
      icon: icon($("d-cat").value),
      status: "Available",
      donor: donors.length ? donors[donors.length-1].name : "Guest donor",
      history: buildHistory("Available")
    };
    listings.unshift(item);
    $("f-donate").reset();
    listMine();
    toast("Posted. Reference " + item.id + " is now visible to NGOs.");
    go("find");
  });
 
  function listMine(){
    var mine = listings.filter(function(x){ return x.donor !== "Seeded donor"; });
    var box = $("my-donations");
    if (!mine.length){ box.innerHTML = "Nothing posted yet in this session."; return; }
    box.innerHTML = mine.map(function(m){
      return '<div style="padding:8px 0; border-bottom:1px solid var(--line)"><b>' + esc(m.name) +
        '</b> · ' + m.qty + ' meals<br><span class="meta">' + m.id + ' · ' + m.status + '</span></div>';
    }).join("");
  }
 
  /* ---------------- tracking ---------------- */
  function track(){
    var id = $("t-id").value.trim().toUpperCase();
    var it = listings.find(function(x){ return x.id === id; });
    $("t-err").style.display = it ? "none" : "block";
    if (!it){ $("track-out").innerHTML = ""; return; }
 
    var stageIdx = it.history.filter(function(h){ return h.done; }).length;
    $("track-out").innerHTML =
      '<div class="cols"><div class="panel"><h3>' + esc(it.name) + ' — ' + it.id + '</h3>' +
      '<ol class="steps" style="margin-top:16px">' +
      it.history.map(function(h, i){
        var cls = h.done ? "done" : (i === stageIdx ? "now" : "");
        return '<li class="' + cls + '"><div class="dot">' + (h.done ? "✓" : (i+1)) + '</div>' +
          '<div><b>' + h.label + '</b><span>' + (h.at ? h.at : "Pending") + '</span></div></li>';
      }).join("") + '</ol>' +
      (stageIdx < 4 ? '<button class="btn small" id="advance" type="button" style="margin-top:18px">Mark next step done</button>' : '<p class="meta" style="margin-top:18px">This donation is complete. Thank you for making a difference.</p>') +
      '</div>' +
      '<div class="panel"><h3>Details</h3>' +
      '<p class="meta">' + it.qty + ' meals · ' + esc(it.cat) + '<br>' + esc(it.spot) + ', ' + esc(it.city) +
      '<br>Collect before ' + fmt(it.before) + '<br>Donor contact: ' + esc(it.phone) + '</p>' +
      '<p class="meta" style="margin:0">' + esc(it.note) + '</p></div></div>';
 
    var adv = $("advance");
    if (adv) adv.addEventListener("click", function(){
      var next = it.history.find(function(h){ return !h.done; });
      if (!next) return;
      next.done = true;
      next.at = stamp(0);
      it.status = ["Available","Requested","Collected","Distributed"][it.history.filter(function(h){return h.done;}).length - 1];
      track();
      render();
      toast(next.label + " recorded.");
    });
  }
 
  $("t-go").addEventListener("click", track);
  $("t-id").addEventListener("keydown", function(e){ if (e.key === "Enter") track(); });
 
  /* ---------------- dashboard ---------------- */
  function drawDashboard(){
    var counts = { Available:0, Requested:0, Collected:0, Distributed:0 };
    var meals  = { Available:0, Requested:0, Collected:0, Distributed:0 };
    listings.forEach(function(it){
      if (counts[it.status] === undefined) return;
      counts[it.status] += 1;
      meals[it.status] += it.qty;
    });
    var totalMeals = listings.reduce(function(a,b){ return a + b.qty; }, 0);
 
    $("k-total").textContent = listings.length;
    $("k-avail").textContent = counts.Available;
    $("k-req").textContent = counts.Requested;
    $("k-dist").textContent = counts.Distributed;
    $("k-meals").textContent = totalMeals.toLocaleString("en-IN");
    $("k-people").textContent = (meals.Collected + meals.Distributed).toLocaleString("en-IN");
    $("s-meals").textContent = (1200 + totalMeals).toLocaleString("en-IN") + "+";
    $("s-donors").textContent = (350 + donors.length) + "+";
 
    var keys = Object.keys(counts);
    var max = Math.max.apply(null, keys.map(function(k){ return meals[k]; }).concat([10]));
    var colors = { Available:"var(--sky)", Requested:"var(--turmeric)", Collected:"var(--leaf)", Distributed:"var(--clay)" };
    var bw = 64, gap = 36, baseY = 190, left = 46;
 
    var parts = ['<line x1="' + left + '" y1="' + baseY + '" x2="420" y2="' + baseY + '" stroke="var(--line)" stroke-width="1"/>'];
    keys.forEach(function(k, i){
      var h = Math.round((meals[k] / max) * 150);
      var x = left + 10 + i * (bw + gap);
      var y = baseY - h;
      parts.push('<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + h + '" rx="5" fill="' + colors[k] + '"/>');
      parts.push('<text x="' + (x + bw/2) + '" y="' + (y - 8) + '" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">' + meals[k] + '</text>');
      parts.push('<text x="' + (x + bw/2) + '" y="' + (baseY + 20) + '" text-anchor="middle" font-size="11.5" fill="var(--ink-soft)">' + k + '</text>');
      parts.push('<text x="' + (x + bw/2) + '" y="' + (baseY + 36) + '" text-anchor="middle" font-size="10.5" fill="var(--ink-soft)">' + counts[k] + ' listings</text>');
    });
    $("chart").innerHTML = parts.join("");
  }
 
  /* ---------------- contact ---------------- */
  $("f-contact").addEventListener("submit", function(e){
    e.preventDefault();
    var ok = true;
    ok = mark($("c-name"), $("c-name").value.trim().length >= 2) && ok;
    ok = mark($("c-email"), mailRe.test($("c-email").value.trim())) && ok;
    ok = mark($("c-msg"), $("c-msg").value.trim().length >= 10) && ok;
    if (!ok){ toast("Check the highlighted fields."); return; }
    var who = $("c-name").value.trim();
    $("f-contact").reset();
    toast("Thanks " + who + " — we'll reply within two working days.");
  });
 
  /* ---------------- boot ---------------- */
  seed();
  render();
  listMine();
  drawDashboard();
  go("home");
})();
 