(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,[90698,e=>{var t=e.i(95068),a=e.i(49570),r=e.i(46229),i=e.i(63194);let n=e=>Math.round(100*e)/100,o=e=>Math.round(1e3*e)/1e3,s=(0,t.m)(async e=>{let{lat:s,lon:l}=(0,t.M)(e);return function(e,t){let s=(0,r.g)(e,t),l=(0,i.v)(e,t),d=(0,a.r)(),u=d.prepare("SELECT COUNT(*) AS n, MIN(issued_at) AS first, MAX(issued_at) AS last FROM forecast_runs WHERE location_key = ?").get(s),c=d.prepare(`SELECT fv.variable, fv.lead_hours, fv.value, substr(fv.valid_at, 1, 10) AS day, e.tmax, e.tmin, e.precip
       FROM forecast_values fv JOIN forecast_runs fr ON fr.id = fv.run_id
       JOIN era5_daily e ON e.location_key = ? AND e.date = substr(fv.valid_at, 1, 10)
       WHERE fr.location_key = ? AND fv.variable LIKE 'daily:%'`).all(l,s),T=new Map,E=[];for(let e of c){let t=Math.max(0,Math.round(e.lead_hours/24));if("daily:temperature_2m_max"===e.variable&&null!==e.tmax){let a=T.get(t)??[];a.push({f:e.value,o:e.tmax}),T.set(t,a)}"daily:prob_precip_ge1mm"===e.variable&&null!==e.precip&&E.push({p:e.value,o:+(e.precip>=1)})}return{runsArchived:u.n,firstRun:u.first,lastRun:u.last,tmaxByLeadDay:[...T.entries()].sort((e,t)=>e[0]-t[0]).map(([e,t])=>({leadDay:e,...function(e){if(!e.length)return null;let t=e.map(e=>e.f-e.o),a=t.reduce((e,t)=>e+Math.abs(t),0)/t.length,r=Math.sqrt(t.reduce((e,t)=>e+t*t,0)/t.length),i=t.reduce((e,t)=>e+t,0)/t.length;return{n:e.length,mae:n(a),rmse:n(r),bias:n(i)}}(t)})),precipProbability:function(e){if(!e.length)return null;let t=e.reduce((e,t)=>e+(t.p-t.o)**2,0)/e.length,a=e.reduce((e,t)=>e+t.o,0)/e.length,r=a*(1-a),i=[0,.2,.4,.6,.8,1.0001].slice(0,-1).map((t,a,r)=>{let i=a===r.length-1?1.0001:[.2,.4,.6,.8,1.0001][a],o=e.filter(e=>e.p>=t&&e.p<i);return{range:`${t.toFixed(1)}–${Math.min(1,i).toFixed(1)}`,n:o.length,meanForecast:o.length?n(o.reduce((e,t)=>e+t.p,0)/o.length):null,observedFrequency:o.length?n(o.reduce((e,t)=>e+t.o,0)/o.length):null}});return{n:e.length,brier:o(t),climatologyBrier:o(r),skillScore:r>0?o(1-t/r):null,reliability:i}}(E),truth:"ERA5 daily reanalysis (Open-Meteo archive), a model-based reference; differences include representativeness error between grid cells.",note:0===u.n?"No archived runs yet. Save this location while signed in; the forecast-archive job stores each new ECMWF run.":0===c.length?"Runs archived, but ERA5 verification data lags ~5 days behind; scores appear once valid dates are covered and the ERA5 history for this cell is downloaded.":null}}(s,l)});e.s(["GET",0,s],90698)},80172,49570,e=>{var t=e.i(47167),a=e.i(3716);let r=function(){};var i=e.i(41790);let n=[{id:1,name:"initial",sql:`
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
`}];var o=e.i(87750);let s=globalThis;function l(){if(!s.__atmoDb){var e;let t;":memory:"!=(e="browser.db")&&r(i.default.dirname(e)),(t=new a.G(e)).exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;"),function(e){e.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)");let t=new Set(e.prepare("SELECT id FROM schema_migrations").all().map(e=>e.id));for(let a of n)if(!t.has(a.id)){e.exec("BEGIN");try{e.exec(a.sql),e.prepare("INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)").run(a.id,a.name,new Date().toISOString()),e.exec("COMMIT"),o.d.info("db.migrated",{id:a.id,name:a.name})}catch(t){throw e.exec("ROLLBACK"),t}}}(t),s.__atmoDb=t}return s.__atmoDb}e.s(["r",0,l,"w",0,()=>new Date().toISOString(),"O",0,function(e,t){e.exec("BEGIN");try{let a=t();return e.exec("COMMIT"),a}catch(t){throw e.exec("ROLLBACK"),t}}],49570);let d=globalThis,u=d.__atmoMem??=new Map,c=d.__atmoInflight??=new Map;function T(){return"0"!==t.default.env.CACHE_PERSIST}async function E(e,t,a){let r=Date.now(),i=u.get(e);if(!i&&(i=function(e){if(T())try{let t=l().prepare("SELECT value, stored_at, expires_at FROM cache WHERE key = ?").get(e);if(!t)return;return{value:JSON.parse(t.value),storedAt:t.stored_at,expiresAt:t.expires_at}}catch(t){o.d.warn("cache.read_failed",{key:e,error:(0,o.W)(t)})}}(e))&&u.set(e,i),i&&i.expiresAt>r)return{value:i.value,stale:!1,storedAt:i.storedAt};let n=c.get(e),s=n??(async()=>{try{let i=await a();var r={value:i,storedAt:Date.now(),expiresAt:Date.now()+1e3*t};if(u.size>=2e3){let e=u.keys().next().value;void 0!==e&&u.delete(e)}if(u.set(e,r),T())try{l().prepare("INSERT INTO cache (key, value, stored_at, expires_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, stored_at=excluded.stored_at, expires_at=excluded.expires_at").run(e,JSON.stringify(r.value),r.storedAt,r.expiresAt)}catch(t){o.d.warn("cache.write_failed",{key:e,error:(0,o.W)(t)})}return i}finally{c.delete(e)}})();n||c.set(e,s);try{return{value:await s,stale:!1,storedAt:Date.now()}}catch(t){if(i&&r-i.expiresAt<864e5)return o.d.warn("cache.serving_stale",{key:e,error:(0,o.W)(t)}),{value:i.value,stale:!0,storedAt:i.storedAt};throw t}}e.s(["Y",0,E,"G",0,function(e=864e5){try{l().prepare("DELETE FROM cache WHERE expires_at < ?").run(Date.now()-e)}catch{}}],80172)},49500,87750,44817,e=>{var t=e.i(47167);let a={debug:10,info:20,warn:30,error:40},r=a[t.default.env.LOG_LEVEL||"info"]??20;function i(e,t,i){if(a[e]<r)return;let n=JSON.stringify({t:new Date().toISOString(),level:e,msg:t,...i});"error"===e?console.error(n):"warn"===e?console.warn(n):console.log(n)}let n={debug:(e,t)=>i("debug",e,t),info:(e,t)=>i("info",e,t),warn:(e,t)=>i("warn",e,t),error:(e,t)=>i("error",e,t)};function o(e){return e instanceof Error?e.message:String(e)}e.s(["W",0,o,"d",0,n],87750);let s=[{url:"https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt",file:"cpc/oni.ascii.txt"},{url:"https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for",file:"cpc/wksst9120.for"},{url:"https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml",file:"cpc/ensodisc.shtml"},{url:"https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data",file:"psl/dmi.had.long.data"},{url:"https://psl.noaa.gov/mjo/mjoindex/romi.cpcolr.1x.txt",file:"psl/romi.cpcolr.1x.txt"},{url:"https://www.nhc.noaa.gov/CurrentStorms.json",file:"nhc/CurrentStorms.json"}],l=/^https:\/\/ozonewatch\.gsfc\.nasa\.gov\/meteorology\/figures\/ozone\/(to3areas|to3mins|omds)_(\d{4})_toms\+omi\+omps\.txt$/;function d(e){let t,a,r=s.find(t=>t.url===e);if(r)return r.file;let i=l.exec(e);return i?(t=i[1],a=Number(i[2]),`ozonewatch/${t}_${a}.txt`):null}e.s(["N",0,"awc/metars.json","m",0,d],44817);class u extends Error{provider;status;retryable;constructor(e,t,a,r=!1){super(`${e}: ${t}`),this.provider=e,this.status=a,this.retryable=r}}let c=globalThis,T=c.__atmoBreakers??=new Map;async function E(e,t){let a,r=new AbortController,i=setTimeout(()=>r.abort(),t.timeoutMs??15e3),n=(a=d(e))?`/sahrae-weather-app/relay/${a}`:e;try{let e=await (t.fetchImpl??fetch)(n,{signal:r.signal,headers:{Accept:"application/json, text/plain, */*",...t.headers},cache:"no-store"});if(!e.ok){let a=429===e.status||e.status>=500,r="";try{r=(await e.text()).slice(0,200)}catch{}throw new u(t.provider,`HTTP ${e.status} ${r}`.trim(),e.status,a)}return e}catch(a){if(a instanceof u)throw a;let e=a?.name==="AbortError";if(!e&&a instanceof TypeError)throw new u(t.provider,"this source could not be reached from your browser. You may be offline, or the source does not allow direct browser access (it works in the server version).",void 0,!1);throw new u(t.provider,e?"timeout":o(a),void 0,!0)}finally{clearTimeout(i)}}async function _(e,t){var a;let r,i,s=(a=t.provider,(i=T.get(a))||(i={failures:0,openedUntil:0,calls:0},T.set(a,i)),i);if(s.calls++,s.openedUntil>Date.now())throw new u(t.provider,"circuit open after repeated failures; retry shortly",void 0,!1);let l=t.retries??1;for(let a=0;a<=l;a++)try{let a=await E(e,t);return s.failures=0,s.lastSuccessAt=new Date().toISOString(),a}catch(e){if(r=e,!(e instanceof u&&e.retryable)||a===l)break;await new Promise(e=>setTimeout(e,400*2**a))}throw s.failures++,s.lastError=o(r),s.lastErrorAt=new Date().toISOString(),s.failures>=4&&(s.openedUntil=Date.now()+6e4,n.warn("circuit.open",{provider:t.provider,error:s.lastError})),r}async function m(e,t){let a=await _(e,t),r=await a.text();try{return JSON.parse(r)}catch{throw new u(t.provider,`invalid JSON (${r.slice(0,80)})`)}}async function p(e,t){return(await _(e,t)).text()}t.default.env.HTTP_USER_AGENT,e.s(["UpstreamError",0,u,"fetchJson",0,m,"fetchText",0,p,"providerHealth",0,function(){let e=Date.now();return[...T.entries()].map(([t,a])=>({provider:t,state:a.openedUntil>e?"open":a.failures>0?"degraded":"closed",consecutiveFailures:a.failures,calls:a.calls,lastError:a.lastError??null,lastErrorAt:a.lastErrorAt??null,lastSuccessAt:a.lastSuccessAt??null}))}],49500)},51162,e=>{var t=e.i(47167),a=e.i(49500),r=e.i(80172),i=e.i(84496),n=e.i(46229);let o=t.default.env.OPEN_METEO_API_KEY;function s(e){return o?`https://customer-${e}.open-meteo.com`:`https://${e}.open-meteo.com`}function l(e){return o?`${e}&apikey=${encodeURIComponent(o)}`:e}let d="open-meteo";function u(e,t){if(e.error)throw new a.UpstreamError(d,`${t}: ${e.reason}`);if("number"!=typeof e.latitude)throw new a.UpstreamError(d,`${t}: malformed response`);return e}function c(e){if(!e||!Array.isArray(e.time))return null;let t=e.time.length,a={time:e.time.map(e=>"number"==typeof e?(0,i.r)(e):new Date(e+"T00:00:00Z").toISOString())};for(let[r,n]of Object.entries(e))"time"!==r&&Array.isArray(n)&&n.length===t&&("sunrise"===r||"sunset"===r?a[r]=n.map(e=>"number"==typeof e?(0,i.r)(e):""):a[r]=n.map(e=>"number"==typeof e&&Number.isFinite(e)?e:null));return a}function T(e){return{gridLatitude:e.latitude,gridLongitude:e.longitude,elevation:e.elevation??null,timezone:e.timezone||"UTC"}}let E=(e,t)=>`latitude=${e.toFixed(4)}&longitude=${t.toFixed(4)}`;async function _(e,t=10,i="en"){let n=e.trim().slice(0,100);if(n.length<2)return[];let o=l(`${s("geocoding-api")}/v1/search?name=${encodeURIComponent(n)}&count=${t}&language=${i}&format=json`);return((await (0,r.Y)(`om:geo:${i}:${t}:${n.toLowerCase()}`,604800,()=>(0,a.fetchJson)(o,{provider:d}))).value.results??[]).filter(e=>Number.isFinite(e.latitude)&&Number.isFinite(e.longitude))}async function m(e){let t=l(`${s("geocoding-api")}/v1/get?id=${e}`),i=await (0,r.Y)(`om:geoid:${e}`,2592e3,()=>(0,a.fetchJson)(t,{provider:d}));return i.value&&"number"==typeof i.value.latitude?i.value:null}let p=["temperature_2m","apparent_temperature","relative_humidity_2m","dew_point_2m","pressure_msl","surface_pressure","wind_speed_10m","wind_direction_10m","wind_gusts_10m","cloud_cover","precipitation","rain","showers","snowfall","weather_code","visibility","shortwave_radiation","uv_index","is_day"],f=["temperature_2m","apparent_temperature","relative_humidity_2m","dew_point_2m","precipitation_probability","precipitation","snowfall","weather_code","pressure_msl","cloud_cover","visibility","wind_speed_10m","wind_direction_10m","wind_gusts_10m","cape","uv_index","shortwave_radiation","soil_moisture_0_to_1cm","soil_moisture_3_to_9cm","soil_moisture_27_to_81cm","et0_fao_evapotranspiration"],h=["weather_code","temperature_2m_max","temperature_2m_min","apparent_temperature_max","apparent_temperature_min","precipitation_sum","precipitation_probability_max","precipitation_hours","snowfall_sum","wind_speed_10m_max","wind_gusts_10m_max","wind_direction_10m_dominant","sunrise","sunset","daylight_duration","uv_index_max","shortwave_radiation_sum","et0_fao_evapotranspiration"],N={best_match:"Open-Meteo best match (seamless blend of regional & global models)",ecmwf_ifs025:"ECMWF IFS 0.25°",gfs_seamless:"NOAA GFS (seamless)",icon_seamless:"DWD ICON (seamless)"};async function L(e,t,o="best_match",_=0){if(!N[o])throw new a.UpstreamError(d,`unsupported model ${o}`);let m=l(`${s("api")}/v1/forecast?${E(e,t)}&current=${p.join(",")}&hourly=${f.join(",")}&daily=${h.join(",")}&timezone=auto&timeformat=unixtime&forecast_days=16&past_days=${_}`+("best_match"!==o?`&models=${o}`:"")),v=`om:fc:${o}:${_}:${(0,n.g)(e,t)}`,g=await (0,r.Y)(v,900,async()=>u(await (0,a.fetchJson)(m,{provider:d}),"forecast")),y=g.value,A=null;if(y.current&&"number"==typeof y.current.time){let e={};for(let t of p)e[t]=Number.isFinite(y.current[t])?y.current[t]:null;A={time:(0,i.r)(y.current.time),intervalSec:y.current.interval??900,values:e}}return{meta:T(y),model:o,current:A,hourly:c(y.hourly),daily:c(y.daily),stale:g.stale,fetchedAt:new Date(g.storedAt).toISOString()}}async function v(e,t){let i=l(`${s("api")}/v1/forecast?${E(e,t)}&daily=precipitation_sum&timezone=auto&timeformat=unixtime&past_days=92&forecast_days=1`),o=await (0,r.Y)(`om:recentp:${(0,n.g)(e,t)}`,21600,async()=>u(await (0,a.fetchJson)(i,{provider:d}),"recent precipitation"));return{meta:T(o.value),daily:c(o.value.daily),stale:o.stale,fetchedAt:new Date(o.storedAt).toISOString()}}async function g(e,t){let i=["ecmwf_ifs025","gfs_seamless","icon_seamless"],o=l(`${s("api")}/v1/forecast?${E(e,t)}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&models=${i.join(",")}&timezone=auto&timeformat=unixtime&forecast_days=10`),T=await (0,r.Y)(`om:mm:${(0,n.g)(e,t)}`,1800,async()=>u(await (0,a.fetchJson)(o,{provider:d}),"multi-model"));return{models:i,daily:c(T.value.daily),stale:T.stale,fetchedAt:new Date(T.storedAt).toISOString()}}let y=[850,700,500,250];async function A(e,t){let i=y.flatMap(e=>[`wind_speed_${e}hPa`,`wind_direction_${e}hPa`,`geopotential_height_${e}hPa`]),o=l(`${s("api")}/v1/forecast?${E(e,t)}&hourly=${i.join(",")},pressure_msl,wind_speed_10m,wind_direction_10m&timezone=auto&timeformat=unixtime&forecast_days=7&models=ecmwf_ifs025`),_=await (0,r.Y)(`om:ua:${(0,n.g)(e,t)}`,3600,async()=>u(await (0,a.fetchJson)(o,{provider:d}),"upper-air"));return{meta:T(_.value),hourly:c(_.value.hourly),stale:_.stale,fetchedAt:new Date(_.storedAt).toISOString()}}async function O(e){let t=`https://api.open-meteo.com/data/${e}/static/meta.json`,n=(await (0,r.Y)(`om:meta:${e}`,1800,()=>(0,a.fetchJson)(t,{provider:d,retries:0,timeoutMs:8e3}))).value;return{initialisedAt:n.last_run_initialisation_time?(0,i.r)(n.last_run_initialisation_time):null,availableAt:n.last_run_availability_time?(0,i.r)(n.last_run_availability_time):null,updateIntervalSec:n.update_interval_seconds??null}}async function w(e,t){let i=l(`https://ensemble-api.open-meteo.com/v1/ensemble?${E(e,t)}&hourly=temperature_2m,precipitation&models=ecmwf_ifs025&timezone=auto&timeformat=unixtime&forecast_days=15`),o=await (0,r.Y)(`om:ens:${(0,n.g)(e,t,.05)}`,7200,async()=>u(await (0,a.fetchJson)(i,{provider:d,timeoutMs:25e3}),"ensemble"));return{meta:T(o.value),hourly:c(o.value.hourly),stale:o.stale,fetchedAt:new Date(o.storedAt).toISOString()}}async function X(e,t){let i=l(`https://seasonal-api.open-meteo.com/v1/seasonal?${E(e,t)}&weekly=temperature_2m_anomaly,precipitation_anomaly,temperature_2m_anomaly_gt0,precipitation_anomaly_gt0,temperature_2m_efi,precipitation_efi,temperature_2m_mean,precipitation_mean`),o=await (0,r.Y)(`om:ec46:${(0,n.g)(e,t,.1)}`,21600,async()=>u(await (0,a.fetchJson)(i,{provider:d,timeoutMs:25e3}),"EC46 weekly"));return{weekly:c(o.value.weekly),stale:o.stale,fetchedAt:new Date(o.storedAt).toISOString()}}async function R(e,t){let i=l(`https://seasonal-api.open-meteo.com/v1/seasonal?${E(e,t)}&monthly=temperature_2m_anomaly,precipitation_anomaly,temperature_2m_mean,precipitation_mean`),o=await (0,r.Y)(`om:seas5:${(0,n.g)(e,t,.1)}`,43200,async()=>u(await (0,a.fetchJson)(i,{provider:d,timeoutMs:25e3}),"SEAS5 monthly"));return{monthly:c(o.value.monthly),stale:o.stale,fetchedAt:new Date(o.storedAt).toISOString()}}let U=["pm10","pm2_5","carbon_monoxide","nitrogen_dioxide","sulphur_dioxide","ozone","aerosol_optical_depth","dust","uv_index","uv_index_clear_sky","european_aqi","us_aqi"];async function b(e,t){let o=l(`${s("air-quality-api")}/v1/air-quality?${E(e,t)}&current=${U.join(",")}&hourly=${U.join(",")}&timezone=auto&timeformat=unixtime&forecast_days=5`),_=await (0,r.Y)(`om:aq:${(0,n.g)(e,t,.05)}`,3600,async()=>u(await (0,a.fetchJson)(o,{provider:d}),"air-quality")),m=_.value,p=m.current&&"number"==typeof m.current.time?{time:(0,i.r)(m.current.time),values:Object.fromEntries(U.map(e=>[e,Number.isFinite(m.current[e])?m.current[e]:null]))}:null;return{meta:T(m),current:p,hourly:c(m.hourly),stale:_.stale,fetchedAt:new Date(_.storedAt).toISOString()}}let C=["wave_height","wave_direction","wave_period","wind_wave_height","swell_wave_height","swell_wave_direction","swell_wave_period","sea_surface_temperature","ocean_current_velocity","ocean_current_direction","sea_level_height_msl"];async function x(e,t){let o=l(`${s("marine-api")}/v1/marine?${E(e,t)}&current=${C.join(",")}&hourly=${C.join(",")}&timezone=auto&timeformat=unixtime&forecast_days=7`),_=await (0,r.Y)(`om:marine:${(0,n.g)(e,t,.05)}`,3600,async()=>u(await (0,a.fetchJson)(o,{provider:d}),"marine")),m=_.value,p=m.current&&"number"==typeof m.current.time?{time:(0,i.r)(m.current.time),values:Object.fromEntries(C.map(e=>[e,Number.isFinite(m.current[e])?m.current[e]:null]))}:null;return{meta:T(m),current:p,hourly:c(m.hourly),stale:_.stale,fetchedAt:new Date(_.storedAt).toISOString()}}async function S(e,t){let i=l(`https://flood-api.open-meteo.com/v1/flood?${E(e,t)}&daily=river_discharge,river_discharge_mean,river_discharge_median,river_discharge_max,river_discharge_min,river_discharge_p25,river_discharge_p75&past_days=60&forecast_days=30&timeformat=unixtime`),o=await (0,r.Y)(`om:flood:${(0,n.g)(e,t,.05)}`,21600,async()=>u(await (0,a.fetchJson)(i,{provider:d,timeoutMs:25e3}),"flood"));return{meta:T(o.value),daily:c(o.value.daily),stale:o.stale,fetchedAt:new Date(o.storedAt).toISOString()}}async function I(e,t){let i=l(`https://flood-api.open-meteo.com/v1/flood?${E(e,t)}&daily=river_discharge&start_date=1991-01-01&end_date=2020-12-31&timeformat=unixtime`);return{daily:c((await (0,r.Y)(`om:floodclim:${(0,n.g)(e,t,.05)}`,7776e3,async()=>u(await (0,a.fetchJson)(i,{provider:d,timeoutMs:4e4}),"flood climatology"))).value.daily)}}async function D(e,t,i,o,_){let m=l(`${s("archive-api")}/v1/archive?${E(e,t)}&start_date=${i}&end_date=${o}&daily=${_.join(",")}&timezone=auto&timeformat=unixtime&models=era5`),p=await (0,r.Y)(`om:arch:${(0,n.g)(e,t,.1)}:${i}:${o}:${_.join(",")}`,259200,async()=>u(await (0,a.fetchJson)(m,{provider:d,timeoutMs:6e4,retries:1}),"archive"));return{meta:T(p.value),daily:c(p.value.daily),stale:p.stale,fetchedAt:new Date(p.storedAt).toISOString()}}async function $(e,t,i,n){if(0===e.length)return[];if(e.length>150)throw new a.UpstreamError(d,"too many grid points");let o=e.map(e=>e.lat.toFixed(2)).join(","),T=e.map(e=>e.lon.toFixed(2)).join(","),E=l(`${s("api")}/v1/forecast?latitude=${o}&longitude=${T}&hourly=${t.join(",")}&timeformat=unixtime&forecast_hours=${i}&models=ecmwf_ifs025&cell_selection=nearest`);return(await (0,r.Y)(n,3600,async()=>{let e=await (0,a.fetchJson)(E,{provider:d,timeoutMs:3e4}),t=Array.isArray(e)?e:[e];return t.forEach(e=>u(e,"grid")),t})).value.map(e=>({lat:e.latitude,lon:e.longitude,hourly:c(e.hourly)}))}e.s(["Y",0,N,"V",0,{temperature:{v:"temperature_2m",unit:"°C"},precipitation:{v:"precipitation",unit:"mm/h"},wind:{v:"wind_speed_10m",unit:"km/h"},pressure:{v:"pressure_msl",unit:"hPa"},cloud:{v:"cloud_cover",unit:"%"},wind850:{v:"wind_speed_850hPa",unit:"km/h"},wind500:{v:"wind_speed_500hPa",unit:"km/h"},wind250:{v:"wind_speed_250hPa",unit:"km/h"}},"g",0,y,"S",0,b,"b",0,D,"Q",0,w,"u",0,L,"c",0,_,"N",0,m,"W",0,$,"d",0,x,"A",0,O,"X",0,g,"P",0,v,"F",0,S,"v",0,I,"j",0,R,"k",0,X,"p",0,c,"G",0,A])},63194,e=>{var t=e.i(49570),a=e.i(51162),r=e.i(87750),i=e.i(84496);let n="1991-01-01",o=["temperature_2m_mean","temperature_2m_max","temperature_2m_min","precipitation_sum","et0_fao_evapotranspiration"],s=e=>e.toISOString().slice(0,10);function l(e,t){let a=e=>(.25*Math.round(e/.25)).toFixed(2);return`${a(e)},${a(t)}`}let d=globalThis,u=d.__era5Inflight??=new Map;async function c(e,d){let c=l(e,d),T=(0,t.r)().prepare("SELECT refreshed_at, last_complete_date FROM era5_locations WHERE location_key = ?").get(c);if(T&&Date.now()-new Date(T.refreshed_at).getTime()<864e5)return c;let E=u.get(c);if(E)return await E,c;let _=(async()=>{let e=new Date,l=T?s(new Date(new Date(T.last_complete_date).getTime()-3456e6)):n,d=s(e),[u,E]=c.split(",").map(Number),_=await (0,a.b)(u,E,l,d,o),m=_.daily;if(!m)throw Error("ERA5 response had no daily block");let p=m.time.length,f=T?.last_complete_date??l,h=(0,t.r)().prepare(`INSERT INTO era5_daily (location_key, date, tmean, tmax, tmin, precip, et0) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(location_key, date) DO UPDATE SET tmean=excluded.tmean, tmax=excluded.tmax, tmin=excluded.tmin, precip=excluded.precip, et0=excluded.et0`),N=e=>m[e],L=0;(0,t.O)((0,t.r)(),()=>{for(let e=0;e<p;e++){let t=N("precipitation_sum")[e];if(null===t)continue;let a=(0,i.M)(m.time[e],_.meta.timezone);h.run(c,a,N("temperature_2m_mean")[e],N("temperature_2m_max")[e],N("temperature_2m_min")[e],t,N("et0_fao_evapotranspiration")[e]),L++,a>f&&(f=a)}(0,t.r)().prepare(`INSERT INTO era5_locations (location_key, latitude, longitude, grid_latitude, grid_longitude, elevation, timezone, first_date, last_complete_date, refreshed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(location_key) DO UPDATE SET last_complete_date=excluded.last_complete_date, refreshed_at=excluded.refreshed_at,
             grid_latitude=excluded.grid_latitude, grid_longitude=excluded.grid_longitude`).run(c,u,E,_.meta.gridLatitude,_.meta.gridLongitude,_.meta.elevation,_.meta.timezone,n,f,(0,t.w)())}),r.d.info("era5.refreshed",{key:c,start:l,written:L,lastComplete:f})})().finally(()=>u.delete(c));u.set(c,_);try{await _}catch(e){if(T)return r.d.warn("era5.refresh_failed_serving_stored",{key:c,error:String(e)}),c;throw e}return c}async function T(e,a){let r=await c(e,a),i=(0,t.r)().prepare("SELECT * FROM era5_locations WHERE location_key = ?").get(r),n=(0,t.r)().prepare("SELECT date, tmean, tmax, tmin, precip, et0 FROM era5_daily WHERE location_key = ? ORDER BY date").all(r);return{locationKey:r,days:n,lastCompleteDate:i.last_complete_date,firstDate:i.first_date,gridLatitude:i.grid_latitude,gridLongitude:i.grid_longitude,refreshedAt:i.refreshed_at}}e.s(["v",0,l,"J",0,T,"a",0,function(e){let t=new Map;for(let a of e){let e=a.date.slice(0,7),r=t.get(e);r||t.set(e,r=[]),r.push(a)}let a=[];for(let[e,r]of t){let t=function(e){let[t,a]=e.split("-").map(Number);return new Date(Date.UTC(t,a,0)).getUTCDate()}(e),i=e=>r.map(t=>t[e]).filter(e=>null!==e),n=e=>{let t=i(e);return t.length===r.length?t.reduce((e,t)=>e+t,0):null},o=e=>{let t=i(e);return t.length?t.reduce((e,t)=>e+t,0)/t.length:null};a.push({ym:e,days:r.length,expectedDays:t,precip:n("precip"),et0:n("et0"),tmean:o("tmean"),tmax:o("tmax"),tmin:o("tmin"),complete:r.length===t})}return a.sort((e,t)=>e.ym.localeCompare(t.ym))}])}],41790,(e,t,a)=>{!function(){"use strict";var e={431:function(e){function t(e){if("string"!=typeof e)throw TypeError("Path must be a string. Received "+JSON.stringify(e))}function a(e,t){for(var a,r="",i=0,n=-1,o=0,s=0;s<=e.length;++s){if(s<e.length)a=e.charCodeAt(s);else if(47===a)break;else a=47;if(47===a){if(n===s-1||1===o);else if(n!==s-1&&2===o){if(r.length<2||2!==i||46!==r.charCodeAt(r.length-1)||46!==r.charCodeAt(r.length-2)){if(r.length>2){var l=r.lastIndexOf("/");if(l!==r.length-1){-1===l?(r="",i=0):i=(r=r.slice(0,l)).length-1-r.lastIndexOf("/"),n=s,o=0;continue}}else if(2===r.length||1===r.length){r="",i=0,n=s,o=0;continue}}t&&(r.length>0?r+="/..":r="..",i=2)}else r.length>0?r+="/"+e.slice(n+1,s):r=e.slice(n+1,s),i=s-n-1;n=s,o=0}else 46===a&&-1!==o?++o:o=-1}return r}var r={resolve:function(){for(var e,r,i="",n=!1,o=arguments.length-1;o>=-1&&!n;o--)o>=0?r=arguments[o]:(void 0===e&&(e=""),r=e),t(r),0!==r.length&&(i=r+"/"+i,n=47===r.charCodeAt(0));if(i=a(i,!n),n)if(i.length>0)return"/"+i;else return"/";return i.length>0?i:"."},normalize:function(e){if(t(e),0===e.length)return".";var r=47===e.charCodeAt(0),i=47===e.charCodeAt(e.length-1);return(0!==(e=a(e,!r)).length||r||(e="."),e.length>0&&i&&(e+="/"),r)?"/"+e:e},isAbsolute:function(e){return t(e),e.length>0&&47===e.charCodeAt(0)},join:function(){if(0==arguments.length)return".";for(var e,a=0;a<arguments.length;++a){var i=arguments[a];t(i),i.length>0&&(void 0===e?e=i:e+="/"+i)}return void 0===e?".":r.normalize(e)},relative:function(e,a){if(t(e),t(a),e===a||(e=r.resolve(e))===(a=r.resolve(a)))return"";for(var i=1;i<e.length&&47===e.charCodeAt(i);++i);for(var n=e.length,o=n-i,s=1;s<a.length&&47===a.charCodeAt(s);++s);for(var l=a.length-s,d=o<l?o:l,u=-1,c=0;c<=d;++c){if(c===d){if(l>d){if(47===a.charCodeAt(s+c))return a.slice(s+c+1);else if(0===c)return a.slice(s+c)}else o>d&&(47===e.charCodeAt(i+c)?u=c:0===c&&(u=0));break}var T=e.charCodeAt(i+c);if(T!==a.charCodeAt(s+c))break;47===T&&(u=c)}var E="";for(c=i+u+1;c<=n;++c)(c===n||47===e.charCodeAt(c))&&(0===E.length?E+="..":E+="/..");return E.length>0?E+a.slice(s+u):(s+=u,47===a.charCodeAt(s)&&++s,a.slice(s))},_makeLong:function(e){return e},dirname:function(e){if(t(e),0===e.length)return".";for(var a=e.charCodeAt(0),r=47===a,i=-1,n=!0,o=e.length-1;o>=1;--o)if(47===(a=e.charCodeAt(o))){if(!n){i=o;break}}else n=!1;return -1===i?r?"/":".":r&&1===i?"//":e.slice(0,i)},basename:function(e,a){if(void 0!==a&&"string"!=typeof a)throw TypeError('"ext" argument must be a string');t(e);var r,i=0,n=-1,o=!0;if(void 0!==a&&a.length>0&&a.length<=e.length){if(a.length===e.length&&a===e)return"";var s=a.length-1,l=-1;for(r=e.length-1;r>=0;--r){var d=e.charCodeAt(r);if(47===d){if(!o){i=r+1;break}}else -1===l&&(o=!1,l=r+1),s>=0&&(d===a.charCodeAt(s)?-1==--s&&(n=r):(s=-1,n=l))}return i===n?n=l:-1===n&&(n=e.length),e.slice(i,n)}for(r=e.length-1;r>=0;--r)if(47===e.charCodeAt(r)){if(!o){i=r+1;break}}else -1===n&&(o=!1,n=r+1);return -1===n?"":e.slice(i,n)},extname:function(e){t(e);for(var a=-1,r=0,i=-1,n=!0,o=0,s=e.length-1;s>=0;--s){var l=e.charCodeAt(s);if(47===l){if(!n){r=s+1;break}continue}-1===i&&(n=!1,i=s+1),46===l?-1===a?a=s:1!==o&&(o=1):-1!==a&&(o=-1)}return -1===a||-1===i||0===o||1===o&&a===i-1&&a===r+1?"":e.slice(a,i)},format:function(e){var t,a;if(null===e||"object"!=typeof e)throw TypeError('The "pathObject" argument must be of type Object. Received type '+typeof e);return t=e.dir||e.root,a=e.base||(e.name||"")+(e.ext||""),t?t===e.root?t+a:t+"/"+a:a},parse:function(e){t(e);var a,r={root:"",dir:"",base:"",ext:"",name:""};if(0===e.length)return r;var i=e.charCodeAt(0),n=47===i;n?(r.root="/",a=1):a=0;for(var o=-1,s=0,l=-1,d=!0,u=e.length-1,c=0;u>=a;--u){if(47===(i=e.charCodeAt(u))){if(!d){s=u+1;break}continue}-1===l&&(d=!1,l=u+1),46===i?-1===o?o=u:1!==c&&(c=1):-1!==o&&(c=-1)}return -1===o||-1===l||0===c||1===c&&o===l-1&&o===s+1?-1!==l&&(0===s&&n?r.base=r.name=e.slice(1,l):r.base=r.name=e.slice(s,l)):(0===s&&n?(r.name=e.slice(1,o),r.base=e.slice(1,l)):(r.name=e.slice(s,o),r.base=e.slice(s,l)),r.ext=e.slice(o,l)),s>0?r.dir=e.slice(0,s-1):n&&(r.dir="/"),r},sep:"/",delimiter:":",win32:null,posix:null};r.posix=r,e.exports=r}},a={};function r(t){var i=a[t];if(void 0!==i)return i.exports;var n=a[t]={exports:{}},o=!0;try{e[t](n,n.exports,r),o=!1}finally{o&&delete a[t]}return n.exports}r.ab="/ROOT/node_modules/next/dist/compiled/path-browserify/",t.exports=r(431)}()}]);