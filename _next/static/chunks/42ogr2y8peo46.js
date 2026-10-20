(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,[95719,e=>{var t=e.i(95068),r=e.i(9094);let a=(0,t.m)(async(e,a)=>{let{bin:i}=await a.params;if(!(0,r.v)(i))throw new t.k(400,"Invalid NHC bin number (e.g. AT1, EP5).");return(0,r.r)(i)},{cacheSeconds:600});e.s(["GET",0,a])},80172,49570,e=>{var t=e.i(47167),r=e.i(3716);let a=function(){};var i=e.i(41790);let n=[{id:1,name:"initial",sql:`
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,            -- sha256 of the cookie token; raw token never stored
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  user_agent TEXT
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  unit_system TEXT NOT NULL DEFAULT 'metric' CHECK (unit_system IN ('metric','imperial')),
  risk_profile TEXT NOT NULL DEFAULT 'general',
  updated_at TEXT NOT NULL
);
CREATE TABLE geo_areas (
  id TEXT PRIMARY KEY,                 -- e.g. gn:184745, pt:-1.28,36.82
  kind TEXT NOT NULL,                  -- point | admin | country | port | airport | marine-region
  name TEXT NOT NULL,
  country_code TEXT,
  admin1 TEXT,
  admin2 TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  elevation REAL,
  timezone TEXT,
  geometry TEXT,                       -- GeoJSON (Point/LineString/Polygon/Multi*)
  min_lat REAL, min_lon REAL, max_lat REAL, max_lon REAL,
  source TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX geo_areas_latlon ON geo_areas(latitude, longitude);
CREATE TABLE saved_locations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_id TEXT NOT NULL REFERENCES geo_areas(id),
  label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, area_id)
);
CREATE TABLE data_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  license TEXT,
  auth TEXT,
  notes TEXT
);
CREATE TABLE datasets (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES data_providers(id),
  name TEXT NOT NULL,
  variables TEXT,                      -- JSON array
  units TEXT,                          -- JSON object variable -> unit
  spatial_coverage TEXT,
  spatial_resolution TEXT,
  temporal_coverage TEXT,
  update_frequency TEXT,
  processing TEXT,
  license TEXT,
  limitations TEXT,                    -- JSON array
  last_ingested_at TEXT,
  last_issued_at TEXT,
  quality_status TEXT
);
CREATE TABLE weather_observations (
  provider TEXT NOT NULL,
  station_id TEXT NOT NULL,
  variable TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  value REAL,
  unit TEXT NOT NULL,
  latitude REAL, longitude REAL, elevation REAL,
  qc TEXT,
  raw TEXT,
  ingested_at TEXT NOT NULL,
  PRIMARY KEY (provider, station_id, variable, observed_at)
);
CREATE INDEX obs_latlon ON weather_observations(latitude, longitude);
CREATE TABLE forecast_runs (
  id TEXT PRIMARY KEY,                 -- provider|model|location|issued_at
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  location_key TEXT NOT NULL,          -- coordKey or grid cell id
  latitude REAL NOT NULL, longitude REAL NOT NULL,
  issued_at TEXT NOT NULL,             -- model initialisation time
  ingested_at TEXT NOT NULL,
  UNIQUE(provider, model, location_key, issued_at)
);
CREATE INDEX runs_loc ON forecast_runs(location_key, issued_at);
CREATE TABLE forecast_values (
  run_id TEXT NOT NULL REFERENCES forecast_runs(id) ON DELETE CASCADE,
  variable TEXT NOT NULL,
  valid_at TEXT NOT NULL,
  lead_hours REAL NOT NULL,
  value REAL,
  unit TEXT NOT NULL,
  PRIMARY KEY (run_id, variable, valid_at)
);
CREATE INDEX fv_valid ON forecast_values(variable, valid_at);
CREATE TABLE climate_indices (
  index_name TEXT NOT NULL,            -- ONI, DMI, RMM, NINO34_WEEKLY, CO2_MLO ...
  period TEXT NOT NULL,                -- e.g. 2026-JAS, 2026-10-11, 2026-09
  value REAL,
  value2 REAL,                         -- e.g. RMM2
  phase TEXT,
  source TEXT NOT NULL,
  issued_at TEXT,
  ingested_at TEXT NOT NULL,
  PRIMARY KEY (index_name, period, source)
);
CREATE TABLE environmental_events (
  id TEXT PRIMARY KEY,                 -- source:source_id
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  nature TEXT NOT NULL,                -- observed-event | official-warning | forecast-risk | model-indicated
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  official_level TEXT,
  country TEXT,
  latitude REAL, longitude REAL,
  geometry TEXT,
  published_at TEXT,
  updated_at TEXT,
  starts_at TEXT, ends_at TEXT,
  version TEXT NOT NULL,               -- content hash; changes => update
  is_current INTEGER NOT NULL DEFAULT 1,
  payload TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  UNIQUE(source, source_id)
);
CREATE INDEX events_latlon ON environmental_events(latitude, longitude);
CREATE INDEX events_current ON environmental_events(is_current, type);
CREATE TABLE official_warnings (
  id TEXT PRIMARY KEY,                 -- issuer:identifier
  issuer TEXT NOT NULL,
  event TEXT NOT NULL,
  severity TEXT,
  urgency TEXT,
  certainty TEXT,
  headline TEXT,
  area_desc TEXT,
  geometry TEXT,
  sent_at TEXT, effective_at TEXT, onset_at TEXT, expires_at TEXT, ends_at TEXT,
  references_ids TEXT,                 -- JSON array of superseded ids (CAP references)
  link TEXT,
  version TEXT NOT NULL,
  payload TEXT NOT NULL,
  ingested_at TEXT NOT NULL
);
CREATE TABLE tide_predictions (
  station_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  t TEXT NOT NULL,
  height_m REAL NOT NULL,
  kind TEXT,                           -- H | L | null for interval
  datum TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  PRIMARY KEY (provider, station_id, t, datum)
);
CREATE TABLE historical_indicators (
  location_key TEXT NOT NULL,
  dataset TEXT NOT NULL,
  indicator TEXT NOT NULL,
  period TEXT NOT NULL,
  value REAL,
  unit TEXT,
  computed_at TEXT NOT NULL,
  PRIMARY KEY (location_key, dataset, indicator, period)
);
CREATE TABLE drought_assessments (
  location_key TEXT NOT NULL,
  index_name TEXT NOT NULL,            -- SPI | SPEI
  scale_months INTEGER NOT NULL,
  period TEXT NOT NULL,                -- YYYY-MM
  value REAL,
  category TEXT,
  computed_at TEXT NOT NULL,
  PRIMARY KEY (location_key, index_name, scale_months, period)
);
CREATE TABLE alert_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  saved_location_id TEXT NOT NULL REFERENCES saved_locations(id) ON DELETE CASCADE,
  types TEXT NOT NULL,                 -- JSON array of alert types
  min_severity TEXT NOT NULL DEFAULT 'moderate',
  include_derived INTEGER NOT NULL DEFAULT 1,
  channels TEXT NOT NULL,              -- JSON array: in-app | email | webhook | push | sms
  webhook_url TEXT,
  email TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES alert_subscriptions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,           -- stable identity of the underlying event
  version TEXT NOT NULL,               -- changes when the event materially changes
  is_official INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issued_at TEXT,
  effective_from TEXT,
  effective_to TEXT,
  impact_window TEXT,
  source_link TEXT,
  action TEXT,
  location_label TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active | updated | expired
  acknowledged_version TEXT,
  dismissed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(subscription_id, fingerprint)
);
CREATE INDEX alerts_user ON alerts(user_id, status);
CREATE TABLE notification_deliveries (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  alert_version TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,                -- pending | sent | failed | skipped
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(alert_id, alert_version, channel)
);
CREATE TABLE ingestion_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,                -- running | ok | partial | failed | skipped
  records_seen INTEGER DEFAULT 0,
  records_written INTEGER DEFAULT 0,
  message TEXT
);
CREATE INDEX jobs_job ON ingestion_jobs(job, started_at);
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  ip_hash TEXT
);
CREATE TABLE cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  stored_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
`},{id:2,name:"era5_daily_store",sql:`
-- Daily ERA5 reanalysis per location, stored so each location's multi-decade
-- history is downloaded once and then refreshed incrementally (Open-Meteo
-- weights long archive requests heavily — see docs/DATA_SOURCES.md).
CREATE TABLE era5_daily (
  location_key TEXT NOT NULL,
  date TEXT NOT NULL,                  -- local calendar date YYYY-MM-DD
  tmean REAL, tmax REAL, tmin REAL, precip REAL, et0 REAL,
  PRIMARY KEY (location_key, date)
);
CREATE TABLE era5_locations (
  location_key TEXT PRIMARY KEY,
  latitude REAL NOT NULL, longitude REAL NOT NULL,
  grid_latitude REAL, grid_longitude REAL, elevation REAL, timezone TEXT,
  first_date TEXT NOT NULL,
  last_complete_date TEXT NOT NULL,    -- last date with non-null precipitation
  refreshed_at TEXT NOT NULL
);
`}];var o=e.i(87750);let s=globalThis;function l(){if(!s.__atmoDb){var e;let t;":memory:"!=(e="browser.db")&&a(i.default.dirname(e)),(t=new r.G(e)).exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;"),function(e){e.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)");let t=new Set(e.prepare("SELECT id FROM schema_migrations").all().map(e=>e.id));for(let r of n)if(!t.has(r.id)){e.exec("BEGIN");try{e.exec(r.sql),e.prepare("INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)").run(r.id,r.name,new Date().toISOString()),e.exec("COMMIT"),o.d.info("db.migrated",{id:r.id,name:r.name})}catch(t){throw e.exec("ROLLBACK"),t}}}(t),s.__atmoDb=t}return s.__atmoDb}e.s(["r",0,l,"w",0,()=>new Date().toISOString(),"O",0,function(e,t){e.exec("BEGIN");try{let r=t();return e.exec("COMMIT"),r}catch(t){throw e.exec("ROLLBACK"),t}}],49570);let T=globalThis,c=T.__atmoMem??=new Map,d=T.__atmoInflight??=new Map;function u(){return"0"!==t.default.env.CACHE_PERSIST}async function E(e,t,r){let a=Date.now(),i=c.get(e);if(!i&&(i=function(e){if(u())try{let t=l().prepare("SELECT value, stored_at, expires_at FROM cache WHERE key = ?").get(e);if(!t)return;return{value:JSON.parse(t.value),storedAt:t.stored_at,expiresAt:t.expires_at}}catch(t){o.d.warn("cache.read_failed",{key:e,error:(0,o.W)(t)})}}(e))&&c.set(e,i),i&&i.expiresAt>a)return{value:i.value,stale:!1,storedAt:i.storedAt};let n=d.get(e),s=n??(async()=>{try{let i=await r();var a={value:i,storedAt:Date.now(),expiresAt:Date.now()+1e3*t};if(c.size>=2e3){let e=c.keys().next().value;void 0!==e&&c.delete(e)}if(c.set(e,a),u())try{l().prepare("INSERT INTO cache (key, value, stored_at, expires_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, stored_at=excluded.stored_at, expires_at=excluded.expires_at").run(e,JSON.stringify(a.value),a.storedAt,a.expiresAt)}catch(t){o.d.warn("cache.write_failed",{key:e,error:(0,o.W)(t)})}return i}finally{d.delete(e)}})();n||d.set(e,s);try{return{value:await s,stale:!1,storedAt:Date.now()}}catch(t){if(i&&a-i.expiresAt<864e5)return o.d.warn("cache.serving_stale",{key:e,error:(0,o.W)(t)}),{value:i.value,stale:!0,storedAt:i.storedAt};throw t}}e.s(["Y",0,E,"G",0,function(e=864e5){try{l().prepare("DELETE FROM cache WHERE expires_at < ?").run(Date.now()-e)}catch{}}],80172)},49500,87750,44817,e=>{var t=e.i(47167);let r={debug:10,info:20,warn:30,error:40},a=r[t.default.env.LOG_LEVEL||"info"]??20;function i(e,t,i){if(r[e]<a)return;let n=JSON.stringify({t:new Date().toISOString(),level:e,msg:t,...i});"error"===e?console.error(n):"warn"===e?console.warn(n):console.log(n)}let n={debug:(e,t)=>i("debug",e,t),info:(e,t)=>i("info",e,t),warn:(e,t)=>i("warn",e,t),error:(e,t)=>i("error",e,t)};function o(e){return e instanceof Error?e.message:String(e)}e.s(["W",0,o,"d",0,n],87750);let s=[{url:"https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt",file:"cpc/oni.ascii.txt"},{url:"https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for",file:"cpc/wksst9120.for"},{url:"https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml",file:"cpc/ensodisc.shtml"},{url:"https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data",file:"psl/dmi.had.long.data"},{url:"https://psl.noaa.gov/mjo/mjoindex/romi.cpcolr.1x.txt",file:"psl/romi.cpcolr.1x.txt"},{url:"https://www.nhc.noaa.gov/CurrentStorms.json",file:"nhc/CurrentStorms.json"}],l=/^https:\/\/ozonewatch\.gsfc\.nasa\.gov\/meteorology\/figures\/ozone\/(to3areas|to3mins|omds)_(\d{4})_toms\+omi\+omps\.txt$/;function T(e){let t,r,a=s.find(t=>t.url===e);if(a)return a.file;let i=l.exec(e);return i?(t=i[1],r=Number(i[2]),`ozonewatch/${t}_${r}.txt`):null}e.s(["N",0,"awc/metars.json","m",0,T],44817);class c extends Error{provider;status;retryable;constructor(e,t,r,a=!1){super(`${e}: ${t}`),this.provider=e,this.status=r,this.retryable=a}}let d=globalThis,u=d.__atmoBreakers??=new Map;async function E(e,t){let r,a=new AbortController,i=setTimeout(()=>a.abort(),t.timeoutMs??15e3),n=(r=T(e))?`/sahrae-weather-app/relay/${r}`:e;try{let e=await (t.fetchImpl??fetch)(n,{signal:a.signal,headers:{Accept:"application/json, text/plain, */*",...t.headers},cache:"no-store"});if(!e.ok){let r=429===e.status||e.status>=500,a="";try{a=(await e.text()).slice(0,200)}catch{}throw new c(t.provider,`HTTP ${e.status} ${a}`.trim(),e.status,r)}return e}catch(r){if(r instanceof c)throw r;let e=r?.name==="AbortError";if(!e&&r instanceof TypeError)throw new c(t.provider,"this source could not be reached from your browser. You may be offline, or the source does not allow direct browser access (it works in the server version).",void 0,!1);throw new c(t.provider,e?"timeout":o(r),void 0,!0)}finally{clearTimeout(i)}}async function N(e,t){var r;let a,i,s=(r=t.provider,(i=u.get(r))||(i={failures:0,openedUntil:0,calls:0},u.set(r,i)),i);if(s.calls++,s.openedUntil>Date.now())throw new c(t.provider,"circuit open after repeated failures; retry shortly",void 0,!1);let l=t.retries??1;for(let r=0;r<=l;r++)try{let r=await E(e,t);return s.failures=0,s.lastSuccessAt=new Date().toISOString(),r}catch(e){if(a=e,!(e instanceof c&&e.retryable)||r===l)break;await new Promise(e=>setTimeout(e,400*2**r))}throw s.failures++,s.lastError=o(a),s.lastErrorAt=new Date().toISOString(),s.failures>=4&&(s.openedUntil=Date.now()+6e4,n.warn("circuit.open",{provider:t.provider,error:s.lastError})),a}async function p(e,t){let r=await N(e,t),a=await r.text();try{return JSON.parse(a)}catch{throw new c(t.provider,`invalid JSON (${a.slice(0,80)})`)}}async function L(e,t){return(await N(e,t)).text()}t.default.env.HTTP_USER_AGENT,e.s(["UpstreamError",0,c,"fetchJson",0,p,"fetchText",0,L,"providerHealth",0,function(){let e=Date.now();return[...u.entries()].map(([t,r])=>({provider:t,state:r.openedUntil>e?"open":r.failures>0?"degraded":"closed",consecutiveFailures:r.failures,calls:r.calls,lastError:r.lastError??null,lastErrorAt:r.lastErrorAt??null,lastSuccessAt:r.lastSuccessAt??null}))}],49500)},9094,e=>{var t=e.i(49500),r=e.i(80172),a=e.i(46229);let i={TD:"Tropical Depression",TS:"Tropical Storm",HU:"Hurricane",STD:"Subtropical Depression",STS:"Subtropical Storm",PTC:"Post-tropical Cyclone",PC:"Potential Tropical Cyclone",TY:"Typhoon"};function n(e){return e>=137?"Category 5":e>=113?"Category 4":e>=96?"Category 3":e>=83?"Category 2":e>=64?"Category 1":e>=34?"Tropical storm strength":"Tropical depression strength"}async function o(){let e=await (0,r.Y)("nhc:current",600,()=>(0,t.fetchJson)("https://www.nhc.noaa.gov/CurrentStorms.json",{provider:"nhc"}));return{events:(e.value.activeStorms??[]).map(e=>{let t=Number(e.intensity),r=e.latitudeNumeric??(0,a.t)(e.latitude),o=e.longitudeNumeric??(0,a.t)(e.longitude),s=i[e.classification]??e.classification;return{id:`nhc:${e.id}`,source:"nhc",sourceId:e.id,nature:"forecast-risk",type:"tropical-cyclone",title:`${s} ${e.name}`,description:`${s} ${e.name}: max sustained wind ${t} kt (${Math.round(1.852*t)} km/h), central pressure ${e.pressure} mb. ${Number.isFinite(t)?n(t):""}.`,severity:Number.isFinite(t)?t>=96?"extreme":t>=64?"severe":t>=34?"moderate":"minor":"unknown",officialLevel:Number.isFinite(t)?n(t):null,status:`Advisory ${e.publicAdvisory?.advNum??"?"}`,latitude:r,longitude:o,publishedAt:e.publicAdvisory?.issuance??e.lastUpdate??null,updatedAt:e.lastUpdate??null,movement:{directionDeg:e.movementDir??null,speedKmh:"number"==typeof e.movementSpeed?Math.round(1.609344*e.movementSpeed):null},intensity:`${t} kt sustained \xb7 ${e.pressure} mb`,link:e.publicAdvisory?.url??"https://www.nhc.noaa.gov/",instructions:"Follow the instructions of the National Hurricane Center and local emergency officials.",issuer:"NOAA National Hurricane Center",hazardWindow:null,phenomenonWindow:null,warningWindow:null,geometryUrl:`/api/v1/hazards/nhc/${encodeURIComponent(e.binNumber)}`,confidence:"Forecast track uncertainty is represented by the official cone (2/3 of historical official forecast errors)."}}),stale:e.stale,fetchedAt:new Date(e.storedAt).toISOString()}}function s(e){let t=/^(AT|EP|CP)([1-5])$/.exec(e);if(!t)return null;let r={AT:4,EP:134,CP:264}[t[1]]+(Number(t[2])-1)*26;return{points:r+2,track:r+3,cone:r+4,warnings:r+5,pastTrack:r+8}}async function l(e){let a=s(e);if(!a)throw Error("invalid NHC bin number");let i=a=>(0,r.Y)(`nhc:geo:${e}:${a}`,900,()=>(0,t.fetchJson)(`https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer/${a}/query?where=1%3D1&outFields=*&f=geojson`,{provider:"nhc-gis",timeoutMs:2e4})).then(e=>e.value),[n,o,l,T,c]=await Promise.all([i(a.cone),i(a.track),i(a.points),i(a.warnings).catch(()=>null),i(a.pastTrack).catch(()=>null)]);return{cone:n,track:o,points:l,warnings:T,pastTrack:c}}let T={TC:"tropical-cyclone",FL:"flood",DR:"drought",WF:"wildfire",VO:"volcano",EQ:"earthquake"},c={Red:"severe",Orange:"moderate",Green:"minor"},d=e=>e?new Date(e.endsWith("Z")?e:e+"Z").toISOString():null;async function u(){let e=new Date,a=new Date(e.getTime()-10368e6),i=e=>e.toISOString().slice(0,10),n=["TC","FL","DR","WF","VO"],o=await Promise.allSettled(n.map(n=>(0,r.Y)(`gdacs:${n}`,900,()=>(0,t.fetchJson)(`https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=${n}&fromdate=${i(a)}&todate=${i(e)}&alertlevel=Green;Orange;Red&pagesize=100&pagenumber=1`,{provider:"gdacs",timeoutMs:25e3}).catch(e=>{if(String(e).includes("invalid JSON"))return{features:[]};throw e})))),s=[],l=[],u=!1;return o.forEach((e,t)=>{"fulfilled"===e.status?(u||=e.value.stale,s.push(...(function(e){let t=[];for(let r of e.features??[]){let e=r.properties,a=T[e.eventtype];if(!a||"earthquake"===a)continue;let[i,n]=r.geometry?.type==="Point"?r.geometry.coordinates:[0/0,0/0],o="TC"===e.eventtype,s=e.affectedcountries?.map(e=>e.countryname)??[],l=e.name.length>70&&s.length>2?`${e.name.split(" in ")[0]} in ${s.slice(0,2).join(", ")} +${s.length-2} more`:e.name;t.push({id:`gdacs:${e.eventtype}${e.eventid}`,source:"gdacs",sourceId:`${e.eventtype}${e.eventid}`,nature:o?"forecast-risk":"observed-event",type:a,title:l,description:(e.htmldescription||"").replace(/<[^>]+>/g,"").trim(),severity:c[e.alertlevel]??"unknown",officialLevel:`GDACS ${e.alertlevel} (humanitarian impact estimate)`,status:"true"===e.iscurrent?"current":"past",country:e.country??null,latitude:Number.isFinite(n)?n:null,longitude:Number.isFinite(i)?i:null,publishedAt:d(e.fromdate),updatedAt:d(e.datemodified),phenomenonWindow:{from:d(e.fromdate),to:"true"===e.iscurrent?null:d(e.todate)},hazardWindow:null,warningWindow:null,intensity:e.severitydata?.severitytext??null,areas:e.affectedcountries?.map(e=>e.countryname)??(e.country?[e.country]:[]),link:e.url?.report??"https://www.gdacs.org/",geometryUrl:e.url?.geometry??null,issuer:"GDACS (EC JRC / UN OCHA)",instructions:"GDACS is a coordination system, not a national warning service. Follow your national meteorological / disaster-management authority."})}return t})(e.value.value).filter(e=>"current"===e.status))):l.push(`${n[t]}: ${String(e.reason)}`)}),{events:s,errors:l,stale:u,fetchedAt:new Date().toISOString()}}async function E(e){if(!e.startsWith("https://www.gdacs.org/gdacsapi/api/polygons/getgeometry?"))throw Error("bad geometry url");return(await (0,r.Y)(`gdacs:geo:${e}`,1800,()=>(0,t.fetchJson)(e,{provider:"gdacs",timeoutMs:25e3}))).value}let N={Extreme:"extreme",Severe:"severe",Moderate:"moderate",Minor:"minor",Unknown:"unknown"};function p(e){let t=e.toLowerCase();return/hurricane|typhoon|tropical/.test(t)?"tropical-cyclone":/storm surge|coastal flood|high surf|rip current|marine|gale|small craft|hazardous seas|storm warning/.test(t)?"marine-coastal":/flash flood/.test(t)?"flash-flood":/flood/.test(t)?"flood":/thunder|tornado|lightning|convective/.test(t)?"thunderstorm":/heat|high-temperature|high temperature/.test(t)?"heat":/freez|frost|cold|low-temperature|low temperature|wind chill/.test(t)?"cold":/blizzard|snow|ice|winter|avalanche/.test(t)?"snow-ice":/dust|sand/.test(t)?"dust":/fire|red flag|forest-fire/.test(t)?"wildfire":/rain/.test(t)?"heavy-rain":/wind/.test(t)?"wind":/fog/.test(t)?"fog":/drought/.test(t)?"drought":"other"}async function L(e,a){let i=`https://api.weather.gov/alerts/active?point=${e.toFixed(4)},${a.toFixed(4)}`,n=await (0,r.Y)(`nws:${e.toFixed(2)},${a.toFixed(2)}`,300,()=>(0,t.fetchJson)(i,{provider:"nws",headers:{Accept:"application/geo+json"}}));return{events:(n.value.features??[]).map(e=>e.properties).filter(e=>"Actual"===e.status).map(e=>({id:`nws:${e.id}`,source:"nws",sourceId:e.id,nature:"official-warning",type:p(e.event),title:e.event,description:e.headline??e.description?.slice(0,400),severity:N[e.severity]??"unknown",officialLevel:`${e.event} \xb7 ${e.severity}/${e.urgency}/${e.certainty}`,status:e.messageType??null,publishedAt:e.sent??null,updatedAt:e.sent??null,warningWindow:{from:e.effective??null,to:e.expires??null},hazardWindow:{from:e.onset??null,to:e.ends??null},phenomenonWindow:null,areas:e.areaDesc?e.areaDesc.split(";").map(e=>e.trim()):[],impacts:e.description??null,instructions:e.instruction??null,link:e["@id"]??`https://api.weather.gov/alerts/${encodeURIComponent(e.id)}`,issuer:e.senderName??"US National Weather Service",confidence:`CAP certainty: ${e.certainty}`,supersedes:(e.references??[]).map(e=>`nws:${e.identifier}`)})),stale:n.stale,fetchedAt:new Date(n.storedAt).toISOString()}}let f={AT:"austria",BE:"belgium",BA:"bosnia-herzegovina",BG:"bulgaria",HR:"croatia",CY:"cyprus",CZ:"czechia",DK:"denmark",EE:"estonia",FI:"finland",FR:"france",DE:"germany",GR:"greece",HU:"hungary",IS:"iceland",IE:"ireland",IL:"israel",IT:"italy",LV:"latvia",LT:"lithuania",LU:"luxembourg",MT:"malta",MD:"moldova",ME:"montenegro",NL:"netherlands",MK:"republic-of-north-macedonia",NO:"norway",PL:"poland",PT:"portugal",RO:"romania",RS:"serbia",SK:"slovakia",SI:"slovenia",ES:"spain",SE:"sweden",CH:"switzerland",UA:"ukraine",GB:"united-kingdom"};function h(e){return e.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase()}async function m(e,a){let i=f[e.toUpperCase()];if(!i)return null;let n=await (0,r.Y)(`meteoalarm:${i}`,900,()=>(0,t.fetchJson)(`https://feeds.meteoalarm.org/api/v1/warnings/feeds-${i}`,{provider:"meteoalarm",timeoutMs:25e3}));return{events:function(e,t,r=new Date){let a=[t.admin2,t.admin1,t.name].filter(Boolean).map(e=>h(e)),i=[];for(let t of e.warnings??[]){let e=t.alert;if(e.status&&"Actual"!==e.status)continue;let n=e.info.find(e=>e.language?.startsWith("en"))??e.info[0];if(!n||n.expires&&new Date(n.expires)<r)continue;let o=(n.area??[]).map(e=>e.areaDesc);if(!o.find(e=>a.some(t=>t.length>2&&h(e).includes(t))))continue;let s=n.parameter?.find(e=>"awareness_level"===e.valueName)?.value??null,l=n.parameter?.find(e=>"awareness_type"===e.valueName)?.value??n.event??"";i.push({id:`meteoalarm:${e.identifier}`,source:"meteoalarm",sourceId:e.identifier,nature:"official-warning",type:p(`${l} ${n.event??""}`),title:n.event??n.headline??"Weather warning",description:n.headline??n.description?.slice(0,400),severity:N[(s?.split(";")[2]??"").trim()]??N[n.severity??""]??"unknown",officialLevel:s,status:e.msgType??null,publishedAt:e.sent??null,updatedAt:e.sent??null,warningWindow:{from:n.effective??null,to:n.expires??null},hazardWindow:{from:n.onset??null,to:n.expires??null},phenomenonWindow:null,areas:o,impacts:n.description??null,instructions:n.instruction??null,link:n.web??"https://meteoalarm.org/",issuer:n.senderName??"National meteorological service via MeteoAlarm",confidence:n.certainty?`CAP certainty: ${n.certainty}`:null})}return i}(n.value,a),stale:n.stale,fetchedAt:new Date(n.storedAt).toISOString()}}e.s(["o",0,f,"T",0,function(e,t){let r=new Set(e.map(e=>e.title.split(" ").pop().toUpperCase()));return t.filter(e=>{if("tropical-cyclone"!==e.type)return!0;let t=/Tropical Cyclone ([A-Z]+)-\d+/i.exec(e.title);return!(t&&r.has(t[1].toUpperCase()))})},"u",0,u,"U",0,E,"S",0,m,"P",0,o,"r",0,l,"$",0,L,"V",0,function(e,t){return[[24,-125,50,-66],[51,-180,72,-129],[18.5,-161,22.5,-154],[17.5,-68,18.8,-64.5],[13,144,21,146.5],[-15,-171.5,-11,-168]].some(([r,a,i,n])=>e>=r&&e<=i&&t>=a&&t<=n)},"v",0,s,"W",0,function(e,t,r){return null==e.latitude||null==e.longitude?e:{...e,distanceKm:Math.round((0,a._)(t,r,e.latitude,e.longitude))}}])}],41790,(e,t,r)=>{!function(){"use strict";var e={431:function(e){function t(e){if("string"!=typeof e)throw TypeError("Path must be a string. Received "+JSON.stringify(e))}function r(e,t){for(var r,a="",i=0,n=-1,o=0,s=0;s<=e.length;++s){if(s<e.length)r=e.charCodeAt(s);else if(47===r)break;else r=47;if(47===r){if(n===s-1||1===o);else if(n!==s-1&&2===o){if(a.length<2||2!==i||46!==a.charCodeAt(a.length-1)||46!==a.charCodeAt(a.length-2)){if(a.length>2){var l=a.lastIndexOf("/");if(l!==a.length-1){-1===l?(a="",i=0):i=(a=a.slice(0,l)).length-1-a.lastIndexOf("/"),n=s,o=0;continue}}else if(2===a.length||1===a.length){a="",i=0,n=s,o=0;continue}}t&&(a.length>0?a+="/..":a="..",i=2)}else a.length>0?a+="/"+e.slice(n+1,s):a=e.slice(n+1,s),i=s-n-1;n=s,o=0}else 46===r&&-1!==o?++o:o=-1}return a}var a={resolve:function(){for(var e,a,i="",n=!1,o=arguments.length-1;o>=-1&&!n;o--)o>=0?a=arguments[o]:(void 0===e&&(e=""),a=e),t(a),0!==a.length&&(i=a+"/"+i,n=47===a.charCodeAt(0));if(i=r(i,!n),n)if(i.length>0)return"/"+i;else return"/";return i.length>0?i:"."},normalize:function(e){if(t(e),0===e.length)return".";var a=47===e.charCodeAt(0),i=47===e.charCodeAt(e.length-1);return(0!==(e=r(e,!a)).length||a||(e="."),e.length>0&&i&&(e+="/"),a)?"/"+e:e},isAbsolute:function(e){return t(e),e.length>0&&47===e.charCodeAt(0)},join:function(){if(0==arguments.length)return".";for(var e,r=0;r<arguments.length;++r){var i=arguments[r];t(i),i.length>0&&(void 0===e?e=i:e+="/"+i)}return void 0===e?".":a.normalize(e)},relative:function(e,r){if(t(e),t(r),e===r||(e=a.resolve(e))===(r=a.resolve(r)))return"";for(var i=1;i<e.length&&47===e.charCodeAt(i);++i);for(var n=e.length,o=n-i,s=1;s<r.length&&47===r.charCodeAt(s);++s);for(var l=r.length-s,T=o<l?o:l,c=-1,d=0;d<=T;++d){if(d===T){if(l>T){if(47===r.charCodeAt(s+d))return r.slice(s+d+1);else if(0===d)return r.slice(s+d)}else o>T&&(47===e.charCodeAt(i+d)?c=d:0===d&&(c=0));break}var u=e.charCodeAt(i+d);if(u!==r.charCodeAt(s+d))break;47===u&&(c=d)}var E="";for(d=i+c+1;d<=n;++d)(d===n||47===e.charCodeAt(d))&&(0===E.length?E+="..":E+="/..");return E.length>0?E+r.slice(s+c):(s+=c,47===r.charCodeAt(s)&&++s,r.slice(s))},_makeLong:function(e){return e},dirname:function(e){if(t(e),0===e.length)return".";for(var r=e.charCodeAt(0),a=47===r,i=-1,n=!0,o=e.length-1;o>=1;--o)if(47===(r=e.charCodeAt(o))){if(!n){i=o;break}}else n=!1;return -1===i?a?"/":".":a&&1===i?"//":e.slice(0,i)},basename:function(e,r){if(void 0!==r&&"string"!=typeof r)throw TypeError('"ext" argument must be a string');t(e);var a,i=0,n=-1,o=!0;if(void 0!==r&&r.length>0&&r.length<=e.length){if(r.length===e.length&&r===e)return"";var s=r.length-1,l=-1;for(a=e.length-1;a>=0;--a){var T=e.charCodeAt(a);if(47===T){if(!o){i=a+1;break}}else -1===l&&(o=!1,l=a+1),s>=0&&(T===r.charCodeAt(s)?-1==--s&&(n=a):(s=-1,n=l))}return i===n?n=l:-1===n&&(n=e.length),e.slice(i,n)}for(a=e.length-1;a>=0;--a)if(47===e.charCodeAt(a)){if(!o){i=a+1;break}}else -1===n&&(o=!1,n=a+1);return -1===n?"":e.slice(i,n)},extname:function(e){t(e);for(var r=-1,a=0,i=-1,n=!0,o=0,s=e.length-1;s>=0;--s){var l=e.charCodeAt(s);if(47===l){if(!n){a=s+1;break}continue}-1===i&&(n=!1,i=s+1),46===l?-1===r?r=s:1!==o&&(o=1):-1!==r&&(o=-1)}return -1===r||-1===i||0===o||1===o&&r===i-1&&r===a+1?"":e.slice(r,i)},format:function(e){var t,r;if(null===e||"object"!=typeof e)throw TypeError('The "pathObject" argument must be of type Object. Received type '+typeof e);return t=e.dir||e.root,r=e.base||(e.name||"")+(e.ext||""),t?t===e.root?t+r:t+"/"+r:r},parse:function(e){t(e);var r,a={root:"",dir:"",base:"",ext:"",name:""};if(0===e.length)return a;var i=e.charCodeAt(0),n=47===i;n?(a.root="/",r=1):r=0;for(var o=-1,s=0,l=-1,T=!0,c=e.length-1,d=0;c>=r;--c){if(47===(i=e.charCodeAt(c))){if(!T){s=c+1;break}continue}-1===l&&(T=!1,l=c+1),46===i?-1===o?o=c:1!==d&&(d=1):-1!==o&&(d=-1)}return -1===o||-1===l||0===d||1===d&&o===l-1&&o===s+1?-1!==l&&(0===s&&n?a.base=a.name=e.slice(1,l):a.base=a.name=e.slice(s,l)):(0===s&&n?(a.name=e.slice(1,o),a.base=e.slice(1,l)):(a.name=e.slice(s,o),a.base=e.slice(s,l)),a.ext=e.slice(o,l)),s>0?a.dir=e.slice(0,s-1):n&&(a.dir="/"),a},sep:"/",delimiter:":",win32:null,posix:null};a.posix=a,e.exports=a}},r={};function a(t){var i=r[t];if(void 0!==i)return i.exports;var n=r[t]={exports:{}},o=!0;try{e[t](n,n.exports,a),o=!1}finally{o&&delete r[t]}return n.exports}a.ab="/ROOT/node_modules/next/dist/compiled/path-browserify/",t.exports=a(431)}()}]);