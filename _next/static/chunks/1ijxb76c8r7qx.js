(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,[80172,49570,e=>{var t=e.i(47167),a=e.i(3716);let i=function(){};var r=e.i(41790);let o=[{id:1,name:"initial",sql:`
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
`}];var n=e.i(87750);let s=globalThis;function l(){if(!s.__atmoDb){var e;let t;":memory:"!=(e="browser.db")&&i(r.default.dirname(e)),(t=new a.G(e)).exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;"),function(e){e.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)");let t=new Set(e.prepare("SELECT id FROM schema_migrations").all().map(e=>e.id));for(let a of o)if(!t.has(a.id)){e.exec("BEGIN");try{e.exec(a.sql),e.prepare("INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)").run(a.id,a.name,new Date().toISOString()),e.exec("COMMIT"),n.d.info("db.migrated",{id:a.id,name:a.name})}catch(t){throw e.exec("ROLLBACK"),t}}}(t),s.__atmoDb=t}return s.__atmoDb}e.s(["r",0,l,"w",0,()=>new Date().toISOString(),"O",0,function(e,t){e.exec("BEGIN");try{let a=t();return e.exec("COMMIT"),a}catch(t){throw e.exec("ROLLBACK"),t}}],49570);let d=globalThis,u=d.__atmoMem??=new Map,c=d.__atmoInflight??=new Map;function T(){return"0"!==t.default.env.CACHE_PERSIST}async function m(e,t,a){let i=Date.now(),r=u.get(e);if(!r&&(r=function(e){if(T())try{let t=l().prepare("SELECT value, stored_at, expires_at FROM cache WHERE key = ?").get(e);if(!t)return;return{value:JSON.parse(t.value),storedAt:t.stored_at,expiresAt:t.expires_at}}catch(t){n.d.warn("cache.read_failed",{key:e,error:(0,n.W)(t)})}}(e))&&u.set(e,r),r&&r.expiresAt>i)return{value:r.value,stale:!1,storedAt:r.storedAt};let o=c.get(e),s=o??(async()=>{try{let r=await a();var i={value:r,storedAt:Date.now(),expiresAt:Date.now()+1e3*t};if(u.size>=2e3){let e=u.keys().next().value;void 0!==e&&u.delete(e)}if(u.set(e,i),T())try{l().prepare("INSERT INTO cache (key, value, stored_at, expires_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, stored_at=excluded.stored_at, expires_at=excluded.expires_at").run(e,JSON.stringify(i.value),i.storedAt,i.expiresAt)}catch(t){n.d.warn("cache.write_failed",{key:e,error:(0,n.W)(t)})}return r}finally{c.delete(e)}})();o||c.set(e,s);try{return{value:await s,stale:!1,storedAt:Date.now()}}catch(t){if(r&&i-r.expiresAt<864e5)return n.d.warn("cache.serving_stale",{key:e,error:(0,n.W)(t)}),{value:r.value,stale:!0,storedAt:r.storedAt};throw t}}e.s(["Y",0,m,"G",0,function(e=864e5){try{l().prepare("DELETE FROM cache WHERE expires_at < ?").run(Date.now()-e)}catch{}}],80172)},49500,87750,44817,e=>{var t=e.i(47167);let a={debug:10,info:20,warn:30,error:40},i=a[t.default.env.LOG_LEVEL||"info"]??20;function r(e,t,r){if(a[e]<i)return;let o=JSON.stringify({t:new Date().toISOString(),level:e,msg:t,...r});"error"===e?console.error(o):"warn"===e?console.warn(o):console.log(o)}let o={debug:(e,t)=>r("debug",e,t),info:(e,t)=>r("info",e,t),warn:(e,t)=>r("warn",e,t),error:(e,t)=>r("error",e,t)};function n(e){return e instanceof Error?e.message:String(e)}e.s(["W",0,n,"d",0,o],87750);let s=[{url:"https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt",file:"cpc/oni.ascii.txt"},{url:"https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for",file:"cpc/wksst9120.for"},{url:"https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml",file:"cpc/ensodisc.shtml"},{url:"https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data",file:"psl/dmi.had.long.data"},{url:"https://psl.noaa.gov/mjo/mjoindex/romi.cpcolr.1x.txt",file:"psl/romi.cpcolr.1x.txt"},{url:"https://www.nhc.noaa.gov/CurrentStorms.json",file:"nhc/CurrentStorms.json"}],l=/^https:\/\/ozonewatch\.gsfc\.nasa\.gov\/meteorology\/figures\/ozone\/(to3areas|to3mins|omds)_(\d{4})_toms\+omi\+omps\.txt$/;function d(e){let t,a,i=s.find(t=>t.url===e);if(i)return i.file;let r=l.exec(e);return r?(t=r[1],a=Number(r[2]),`ozonewatch/${t}_${a}.txt`):null}e.s(["N",0,"awc/metars.json","m",0,d],44817);class u extends Error{provider;status;retryable;constructor(e,t,a,i=!1){super(`${e}: ${t}`),this.provider=e,this.status=a,this.retryable=i}}let c=globalThis,T=c.__atmoBreakers??=new Map;async function m(e,t){let a,i=new AbortController,r=setTimeout(()=>i.abort(),t.timeoutMs??15e3),o=(a=d(e))?`/sahrae-weather-app/relay/${a}`:e;try{let e=await (t.fetchImpl??fetch)(o,{signal:i.signal,headers:{Accept:"application/json, text/plain, */*",...t.headers},cache:"no-store"});if(!e.ok){let a=429===e.status||e.status>=500,i="";try{i=(await e.text()).slice(0,200)}catch{}throw new u(t.provider,`HTTP ${e.status} ${i}`.trim(),e.status,a)}return e}catch(a){if(a instanceof u)throw a;let e=a?.name==="AbortError";if(!e&&a instanceof TypeError)throw new u(t.provider,"this source could not be reached from your browser. You may be offline, or the source does not allow direct browser access (it works in the server version).",void 0,!1);throw new u(t.provider,e?"timeout":n(a),void 0,!0)}finally{clearTimeout(r)}}async function p(e,t){var a;let i,r,s=(a=t.provider,(r=T.get(a))||(r={failures:0,openedUntil:0,calls:0},T.set(a,r)),r);if(s.calls++,s.openedUntil>Date.now())throw new u(t.provider,"circuit open after repeated failures; retry shortly",void 0,!1);let l=t.retries??1;for(let a=0;a<=l;a++)try{let a=await m(e,t);return s.failures=0,s.lastSuccessAt=new Date().toISOString(),a}catch(e){if(i=e,!(e instanceof u&&e.retryable)||a===l)break;await new Promise(e=>setTimeout(e,400*2**a))}throw s.failures++,s.lastError=n(i),s.lastErrorAt=new Date().toISOString(),s.failures>=4&&(s.openedUntil=Date.now()+6e4,o.warn("circuit.open",{provider:t.provider,error:s.lastError})),i}async function _(e,t){let a=await p(e,t),i=await a.text();try{return JSON.parse(i)}catch{throw new u(t.provider,`invalid JSON (${i.slice(0,80)})`)}}async function E(e,t){return(await p(e,t)).text()}t.default.env.HTTP_USER_AGENT,e.s(["UpstreamError",0,u,"fetchJson",0,_,"fetchText",0,E,"providerHealth",0,function(){let e=Date.now();return[...T.entries()].map(([t,a])=>({provider:t,state:a.openedUntil>e?"open":a.failures>0?"degraded":"closed",consecutiveFailures:a.failures,calls:a.calls,lastError:a.lastError??null,lastErrorAt:a.lastErrorAt??null,lastSuccessAt:a.lastSuccessAt??null}))}],49500)},56203,e=>{var t=e.i(47167),a=e.i(49500),i=e.i(80172),r=e.i(46229),o=e.i(44817);let n="https://api.tidesandcurrents.noaa.gov";async function s(e){return(await (0,i.Y)(`coops:stations:${e}`,604800,async()=>(await (0,a.fetchJson)(`${n}/mdapi/prod/webapi/stations.json?type=${e}`,{provider:"noaa-coops",timeoutMs:4e4})).stations.map(e=>({id:e.id,name:e.name,lat:Number(e.lat),lng:Number(e.lng),state:e.state,type:e.type})))).value}async function l(e,t,a,i=100){let o=await s(a),n=null;for(let a of o){if(!Number.isFinite(a.lat)||!Number.isFinite(a.lng))continue;let o=(0,r._)(e,t,a.lat,a.lng);o<=i&&(!n||o<n.distanceKm)&&(n={...a,distanceKm:Math.round(o)})}return n}function d(e){if(e.error)throw Error(e.error.message);return(e.predictions??e.data??[]).map(e=>({t:new Date(e.t.replace(" ","T")+":00Z").toISOString(),v:parseFloat(e.v),type:e.type})).filter(e=>Number.isFinite(e.v))}async function u(e){if(!/^\d{7}$/.test(e))throw Error("invalid station");let t=new Date,r=e=>e.toISOString().slice(0,10).replace(/-/g,""),o=new Date(t.getTime()+2592e5),s=new Date(t.getTime()-864e5),l=`${n}/api/prod/datagetter?station=${e}&datum=MLLW&units=metric&time_zone=gmt&format=json&application=sahrae-weather`,[u,c,T]=await Promise.all([(0,i.Y)(`coops:hilo:${e}:${r(t)}`,21600,()=>(0,a.fetchJson)(`${l}&product=predictions&interval=hilo&begin_date=${r(s)}&end_date=${r(o)}`,{provider:"noaa-coops"})),(0,i.Y)(`coops:curve:${e}:${r(t)}`,21600,()=>(0,a.fetchJson)(`${l}&product=predictions&interval=h&begin_date=${r(s)}&end_date=${r(o)}`,{provider:"noaa-coops"})),(0,i.Y)(`coops:obs:${e}`,360,()=>(0,a.fetchJson)(`${l}&product=water_level&range=24`,{provider:"noaa-coops"})).catch(()=>null)]),m=[];try{m=T?d(T.value):[]}catch{m=[]}return{hilo:d(u.value),predicted:d(c.value),observed:m,datum:"MLLW",fetchedAt:new Date(u.storedAt).toISOString()}}async function c(e){if(!/^\d{7}$/.test(e))throw Error("invalid station");return d((await (0,i.Y)(`coops:obs:${e}`,360,()=>(0,a.fetchJson)(`${n}/api/prod/datagetter?station=${e}&datum=MLLW&units=metric&time_zone=gmt&format=json&product=water_level&range=24&application=sahrae-weather`,{provider:"noaa-coops"}))).value)}async function T(e){let t=await (0,i.Y)(`coops:slt:${e}`,2592e3,()=>(0,a.fetchJson)(`${n}/dpapi/prod/webapi/product/sealvltrends.json?station=${e}`,{provider:"noaa-coops"})).catch(()=>null),r=t?.value.SeaLvlTrends?.[0];if(!r)return null;let o=e=>r.trendUnits.includes("inches/decade")?25.4*e/10:e;return{mmPerYear:Math.round(100*o(r.trend))/100,errorMmPerYear:Math.round(100*o(r.trendError))/100,startDate:r.startDate??null,endDate:r.endDate??null,stationName:r.stationName}}async function m(e,t,n=75){(e-1).toFixed(2),(t-1).toFixed(2),(e+1).toFixed(2),(t+1).toFixed(2);let s=await (0,i.Y)("metar:relay",600,()=>(0,a.fetchJson)(`/sahrae-weather-app/relay/${o.N}`,{provider:"awc-metar",timeoutMs:2e4}));return(Array.isArray(s.value)?s.value:[]).map(a=>({...a,distanceKm:(0,r._)(e,t,a.lat,a.lon)})).filter(e=>e.distanceKm<=n).sort((e,t)=>e.distanceKm-t.distanceKm||t.obsTime-e.obsTime)[0]??null}async function p(e,r){let o=t.default.env.NOMINATIM_BASE_URL||"https://nominatim.openstreetmap.org";if("1"===t.default.env.NOMINATIM_DISABLED)return null;let n=`nom:${e.toFixed(3)},${r.toFixed(3)}`,s=await (0,i.Y)(n,2592e3,()=>(0,a.fetchJson)(`${o}/reverse?lat=${e.toFixed(5)}&lon=${r.toFixed(5)}&format=jsonv2&zoom=10&accept-language=en`,{provider:"osm-nominatim",timeoutMs:8e3,retries:0})).catch(()=>null);return!s||s.value.error?null:s.value}async function _(){let e=await (0,i.Y)("rainviewer:maps",300,()=>(0,a.fetchJson)("https://api.rainviewer.com/public/weather-maps.json",{provider:"rainviewer"})),t=e.value.host;return{frames:[...[...e.value.radar?.past??[]].map(e=>({time:new Date(1e3*e.time).toISOString(),tileUrl:`${t}${e.path}/256/{z}/{x}/{y}/2/1_1.png`,kind:"observation"})),...[...e.value.radar?.nowcast??[]].map(e=>({time:new Date(1e3*e.time).toISOString(),tileUrl:`${t}${e.path}/256/{z}/{x}/{y}/2/1_1.png`,kind:"forecast"}))],fetchedAt:new Date(e.storedAt).toISOString()}}let E=[{id:"VIIRS_NOAA20_CorrectedReflectance_TrueColor",daily:!0,title:"Satellite true colour (VIIRS NOAA-20)",matrix:"GoogleMapsCompatible_Level9",ext:"jpg",group:"satellite",maxNativeZoom:9,description:"Daily true-colour composite. Clouds, smoke, dust and snow are visible; swath gaps appear as black stripes."},{id:"IMERG_Precipitation_Rate_30min",title:"Rain from satellite, latest half-hour (GPM IMERG Early)",matrix:"GoogleMapsCompatible_Level6",ext:"png",group:"precipitation",legend:"https://gibs.earthdata.nasa.gov/legends/GPM_Precipitation_Rate_H.svg",units:"mm/h",maxNativeZoom:6,description:"Satellite-estimated rain rate for the most recent available half-hour (IMERG Early run, latency ~4–6 h). Global between 60°S and 60°N, including oceans and areas without radar."},{id:"IMERG_Precipitation_Rate",daily:!0,title:"Rain from satellite, daily (GPM IMERG)",matrix:"GoogleMapsCompatible_Level6",ext:"png",group:"precipitation",legend:"https://gibs.earthdata.nasa.gov/legends/GPM_Precipitation_Rate_H.svg",units:"mm/h",maxNativeZoom:6,description:"Satellite-estimated precipitation rate (multi-satellite, gauge-informed). Daily layer."},{id:"SMAP_L4_Analyzed_Root_Zone_Soil_Moisture",daily:!0,title:"Root-zone soil moisture (SMAP L4)",matrix:"GoogleMapsCompatible_Level6",ext:"png",group:"land",legend:"https://gibs.earthdata.nasa.gov/legends/SMAP_Analyzed_Soil_Moisture_H.svg",units:"m³/m³",maxNativeZoom:6,description:"SMAP Level-4 model–satellite assimilation of root-zone (0–100 cm) soil moisture. ~9 km."},{id:"VIIRS_NOAA20_NDVI_8Day",daily:!0,title:"Vegetation health (NDVI, 8-day)",matrix:"GoogleMapsCompatible_Level8",ext:"png",group:"land",legend:"https://gibs.earthdata.nasa.gov/legends/MODIS_NDVI_H.svg",units:"NDVI",maxNativeZoom:8,description:"Rolling 8-day Normalized Difference Vegetation Index. Higher = denser green vegetation. Not an anomaly product."},{id:"MODIS_Terra_Land_Surface_Temp_Day",daily:!0,title:"Land surface temperature (day, MODIS)",matrix:"GoogleMapsCompatible_Level7",ext:"png",group:"temperature",legend:"https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg",units:"K",maxNativeZoom:7,description:"Temperature of the ground surface itself (clear skies only). It runs hotter than the air temperature on sunny days."},{id:"GHRSST_L4_MUR_Sea_Surface_Temperature",daily:!0,title:"Sea surface temperature (GHRSST MUR)",matrix:"GoogleMapsCompatible_Level7",ext:"png",group:"ocean",legend:"https://gibs.earthdata.nasa.gov/legends/GHRSST_Sea_Surface_Temperature_H.svg",units:"°C",maxNativeZoom:7,description:"Gap-free daily SST analysis (~1 km). Analysis, not raw retrieval."},{id:"GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies",daily:!0,title:"SST anomaly (GHRSST MUR)",matrix:"GoogleMapsCompatible_Level7",ext:"png",group:"ocean",legend:"https://gibs.earthdata.nasa.gov/legends/GHRSST_Sea_Surface_Temperature_Anomalies_H.svg",units:"°C",maxNativeZoom:7,description:"Daily SST anomaly relative to the product's own SST climatology (see the PO.DAAC MUR documentation for the reference period)."},{id:"OMPS_Ozone_Total_Column",daily:!0,title:"Total-column ozone (OMPS)",matrix:"GoogleMapsCompatible_Level6",ext:"png",group:"atmosphere",legend:"https://gibs.earthdata.nasa.gov/legends/OMPS_Ozone_Total_Column_H.svg",units:"DU",maxNativeZoom:6,description:"Total ozone above each point, in Dobson Units. Mostly the protective ozone layer high up, not ground-level pollution."},{id:"MODIS_Terra_Aerosol_Optical_Depth_3km",daily:!0,title:"Aerosol optical depth (MODIS 3 km)",matrix:"GoogleMapsCompatible_Level6",ext:"png",group:"atmosphere",legend:"https://gibs.earthdata.nasa.gov/legends/MODIS_VIIRS_AOD_H.svg",units:"AOD",maxNativeZoom:6,description:"Column aerosol loading (dust, smoke, haze) at 550 nm, clear-sky retrievals only."},{id:"OMPS_Aerosol_Index",daily:!0,title:"UV aerosol index (OMPS)",matrix:"GoogleMapsCompatible_Level6",ext:"png",group:"atmosphere",legend:"https://gibs.earthdata.nasa.gov/legends/OMPS_Aerosol_Index_H.svg",units:"index",maxNativeZoom:6,description:"Absorbing aerosols (dust, smoke), works above clouds."},{id:"TROPOMI_L2_Nitrogen_Dioxide_Tropospheric_Column",daily:!0,title:"NO₂ tropospheric column (TROPOMI)",matrix:"GoogleMapsCompatible_Level6",ext:"png",group:"atmosphere",legend:"https://gibs.earthdata.nasa.gov/legends/OMI_Nitrogen_Dioxide_Tropo_Column_H.svg",units:"molecules/cm²",maxNativeZoom:6,description:"Nitrogen dioxide in the lower atmosphere from the Sentinel-5P satellite. Shows burning from traffic, industry and fires; not a ground-level reading."}],h=e=>`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${e}/default/{time}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`,f=e=>`https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.3.0&request=GetMap&layers=${e}&styles=&format=image/png&transparent=true&crs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}&time={time}`,g={ir:{title:"Infrared cloud-top (geostationary, 10.3–10.8 µm)",description:"Brightness temperature of cloud tops and surface. Bright/cold = high, deep cloud (storms, cyclone eyewalls); dark = warm surface or low cloud. Works day and night. Five satellites mosaicked; colour scales differ slightly between NASA and EUMETSAT renderings.",sources:[{id:"goes-w",satellite:"GOES-West",subLon:-137,provider:"NOAA via NASA GIBS",template:h("GOES-West_ABI_Band13_Clean_Infrared"),maxzoom:6,attribution:"GOES-West: NOAA/NASA GIBS"},{id:"goes-e",satellite:"GOES-East",subLon:-75,provider:"NOAA via NASA GIBS",template:h("GOES-East_ABI_Band13_Clean_Infrared"),maxzoom:6,attribution:"GOES-East: NOAA/NASA GIBS"},{id:"msg-0",satellite:"Meteosat 0°",subLon:0,provider:"EUMETSAT EUMETView",template:f("msg_fes:ir108"),maxzoom:8,attribution:"Meteosat © EUMETSAT"},{id:"msg-iodc",satellite:"Meteosat IODC (45.5°E)",subLon:45.5,provider:"EUMETSAT EUMETView",template:f("msg_iodc:ir108"),maxzoom:8,attribution:"Meteosat © EUMETSAT"},{id:"himawari",satellite:"Himawari",subLon:140.7,provider:"JMA via NASA GIBS",template:h("Himawari_AHI_Band13_Clean_Infrared"),maxzoom:6,attribution:"Himawari: JMA/NASA GIBS"}]},airmass:{title:"Air Mass RGB (geostationary)",description:"Multi-channel composite: red/orange = dry, ozone-rich stratospheric air (jet streams, potential-vorticity anomalies, rapid cyclogenesis); green = moist tropical air; blue/purple = cold polar air; white = deep cloud.",sources:[{id:"goes-w",satellite:"GOES-West",subLon:-137,provider:"NOAA via NASA GIBS",template:h("GOES-West_ABI_Air_Mass"),maxzoom:6,attribution:"GOES-West: NOAA/NASA GIBS"},{id:"goes-e",satellite:"GOES-East",subLon:-75,provider:"NOAA via NASA GIBS",template:h("GOES-East_ABI_Air_Mass"),maxzoom:6,attribution:"GOES-East: NOAA/NASA GIBS"},{id:"msg-0",satellite:"Meteosat 0°",subLon:0,provider:"EUMETSAT EUMETView",template:f("msg_fes:rgb_airmass"),maxzoom:8,attribution:"Meteosat © EUMETSAT"},{id:"msg-iodc",satellite:"Meteosat IODC (45.5°E)",subLon:45.5,provider:"EUMETSAT EUMETView",template:f("msg_iodc:rgb_airmass"),maxzoom:8,attribution:"Meteosat © EUMETSAT"},{id:"himawari",satellite:"Himawari",subLon:140.7,provider:"JMA via NASA GIBS",template:h("Himawari_AHI_Air_Mass"),maxzoom:6,attribution:"Himawari: JMA/NASA GIBS"}]}};async function v(){return(await (0,i.Y)(`gibs:dates:${E.map(e=>e.id).join(",")}`,3600,async()=>{let e=await (0,a.fetchText)("https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml",{provider:"nasa-gibs",timeoutMs:6e4}),t={};for(let a of E){let i=e.indexOf(`<ows:Identifier>${a.id}</ows:Identifier>`);if(i<0)continue;let r=e.slice(i,i+2e4),o=/<Default>([^<]+)<\/Default>/.exec(r)?.[1];o&&(t[a.id]=o)}return t}).catch(()=>({value:{}}))).value}e.s(["D",0,g,"E",0,E,"i",0,c,"j",0,T,"K",0,u,"x",0,function(e=new Date,t=8,a=30,i=60){let r=6e4*a,o=Math.floor((e.getTime()-6e4*i)/r)*r;return Array.from({length:t},(e,a)=>new Date(o-(t-1-a)*r).toISOString().replace(".000Z","Z"))},"L",0,v,"N",0,function(e,t){return`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${e.id}/default/${t}/${e.matrix}/{z}/{y}/{x}.${e.ext}`},"c",0,l,"o",0,m,"d",0,function(e){if(null==e)return null;if("number"==typeof e)return Math.round(1609.344*e);let t=/^(\d+(?:\.\d+)?)\+?$/.exec(e.trim());return t?Math.round(1609.344*parseFloat(t[1])):null},"e",0,_,"F",0,p])},51162,e=>{var t=e.i(47167),a=e.i(49500),i=e.i(80172),r=e.i(84496),o=e.i(46229);let n=t.default.env.OPEN_METEO_API_KEY;function s(e){return n?`https://customer-${e}.open-meteo.com`:`https://${e}.open-meteo.com`}function l(e){return n?`${e}&apikey=${encodeURIComponent(n)}`:e}let d="open-meteo";function u(e,t){if(e.error)throw new a.UpstreamError(d,`${t}: ${e.reason}`);if("number"!=typeof e.latitude)throw new a.UpstreamError(d,`${t}: malformed response`);return e}function c(e){if(!e||!Array.isArray(e.time))return null;let t=e.time.length,a={time:e.time.map(e=>"number"==typeof e?(0,r.r)(e):new Date(e+"T00:00:00Z").toISOString())};for(let[i,o]of Object.entries(e))"time"!==i&&Array.isArray(o)&&o.length===t&&("sunrise"===i||"sunset"===i?a[i]=o.map(e=>"number"==typeof e?(0,r.r)(e):""):a[i]=o.map(e=>"number"==typeof e&&Number.isFinite(e)?e:null));return a}function T(e){return{gridLatitude:e.latitude,gridLongitude:e.longitude,elevation:e.elevation??null,timezone:e.timezone||"UTC"}}let m=(e,t)=>`latitude=${e.toFixed(4)}&longitude=${t.toFixed(4)}`;async function p(e,t=10,r="en"){let o=e.trim().slice(0,100);if(o.length<2)return[];let n=l(`${s("geocoding-api")}/v1/search?name=${encodeURIComponent(o)}&count=${t}&language=${r}&format=json`);return((await (0,i.Y)(`om:geo:${r}:${t}:${o.toLowerCase()}`,604800,()=>(0,a.fetchJson)(n,{provider:d}))).value.results??[]).filter(e=>Number.isFinite(e.latitude)&&Number.isFinite(e.longitude))}async function _(e){let t=l(`${s("geocoding-api")}/v1/get?id=${e}`),r=await (0,i.Y)(`om:geoid:${e}`,2592e3,()=>(0,a.fetchJson)(t,{provider:d}));return r.value&&"number"==typeof r.value.latitude?r.value:null}let E=["temperature_2m","apparent_temperature","relative_humidity_2m","dew_point_2m","pressure_msl","surface_pressure","wind_speed_10m","wind_direction_10m","wind_gusts_10m","cloud_cover","precipitation","rain","showers","snowfall","weather_code","visibility","shortwave_radiation","uv_index","is_day"],h=["temperature_2m","apparent_temperature","relative_humidity_2m","dew_point_2m","precipitation_probability","precipitation","snowfall","weather_code","pressure_msl","cloud_cover","visibility","wind_speed_10m","wind_direction_10m","wind_gusts_10m","cape","uv_index","shortwave_radiation","soil_moisture_0_to_1cm","soil_moisture_3_to_9cm","soil_moisture_27_to_81cm","et0_fao_evapotranspiration"],f=["weather_code","temperature_2m_max","temperature_2m_min","apparent_temperature_max","apparent_temperature_min","precipitation_sum","precipitation_probability_max","precipitation_hours","snowfall_sum","wind_speed_10m_max","wind_gusts_10m_max","wind_direction_10m_dominant","sunrise","sunset","daylight_duration","uv_index_max","shortwave_radiation_sum","et0_fao_evapotranspiration"],g={best_match:"Open-Meteo best match (seamless blend of regional & global models)",ecmwf_ifs025:"ECMWF IFS 0.25°",gfs_seamless:"NOAA GFS (seamless)",icon_seamless:"DWD ICON (seamless)"};async function v(e,t,n="best_match",p=0){if(!g[n])throw new a.UpstreamError(d,`unsupported model ${n}`);let _=l(`${s("api")}/v1/forecast?${m(e,t)}&current=${E.join(",")}&hourly=${h.join(",")}&daily=${f.join(",")}&timezone=auto&timeformat=unixtime&forecast_days=16&past_days=${p}`+("best_match"!==n?`&models=${n}`:"")),N=`om:fc:${n}:${p}:${(0,o.g)(e,t)}`,L=await (0,i.Y)(N,900,async()=>u(await (0,a.fetchJson)(_,{provider:d}),"forecast")),A=L.value,y=null;if(A.current&&"number"==typeof A.current.time){let e={};for(let t of E)e[t]=Number.isFinite(A.current[t])?A.current[t]:null;y={time:(0,r.r)(A.current.time),intervalSec:A.current.interval??900,values:e}}return{meta:T(A),model:n,current:y,hourly:c(A.hourly),daily:c(A.daily),stale:L.stale,fetchedAt:new Date(L.storedAt).toISOString()}}async function N(e,t){let r=l(`${s("api")}/v1/forecast?${m(e,t)}&daily=precipitation_sum&timezone=auto&timeformat=unixtime&past_days=92&forecast_days=1`),n=await (0,i.Y)(`om:recentp:${(0,o.g)(e,t)}`,21600,async()=>u(await (0,a.fetchJson)(r,{provider:d}),"recent precipitation"));return{meta:T(n.value),daily:c(n.value.daily),stale:n.stale,fetchedAt:new Date(n.storedAt).toISOString()}}async function L(e,t){let r=["ecmwf_ifs025","gfs_seamless","icon_seamless"],n=l(`${s("api")}/v1/forecast?${m(e,t)}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&models=${r.join(",")}&timezone=auto&timeformat=unixtime&forecast_days=10`),T=await (0,i.Y)(`om:mm:${(0,o.g)(e,t)}`,1800,async()=>u(await (0,a.fetchJson)(n,{provider:d}),"multi-model"));return{models:r,daily:c(T.value.daily),stale:T.stale,fetchedAt:new Date(T.storedAt).toISOString()}}let A=[850,700,500,250];async function y(e,t){let r=A.flatMap(e=>[`wind_speed_${e}hPa`,`wind_direction_${e}hPa`,`geopotential_height_${e}hPa`]),n=l(`${s("api")}/v1/forecast?${m(e,t)}&hourly=${r.join(",")},pressure_msl,wind_speed_10m,wind_direction_10m&timezone=auto&timeformat=unixtime&forecast_days=7&models=ecmwf_ifs025`),p=await (0,i.Y)(`om:ua:${(0,o.g)(e,t)}`,3600,async()=>u(await (0,a.fetchJson)(n,{provider:d}),"upper-air"));return{meta:T(p.value),hourly:c(p.value.hourly),stale:p.stale,fetchedAt:new Date(p.storedAt).toISOString()}}async function w(e){let t=`https://api.open-meteo.com/data/${e}/static/meta.json`,o=(await (0,i.Y)(`om:meta:${e}`,1800,()=>(0,a.fetchJson)(t,{provider:d,retries:0,timeoutMs:8e3}))).value;return{initialisedAt:o.last_run_initialisation_time?(0,r.r)(o.last_run_initialisation_time):null,availableAt:o.last_run_availability_time?(0,r.r)(o.last_run_availability_time):null,updateIntervalSec:o.update_interval_seconds??null}}async function O(e,t){let r=l(`https://ensemble-api.open-meteo.com/v1/ensemble?${m(e,t)}&hourly=temperature_2m,precipitation&models=ecmwf_ifs025&timezone=auto&timeformat=unixtime&forecast_days=15`),n=await (0,i.Y)(`om:ens:${(0,o.g)(e,t,.05)}`,7200,async()=>u(await (0,a.fetchJson)(r,{provider:d,timeoutMs:25e3}),"ensemble"));return{meta:T(n.value),hourly:c(n.value.hourly),stale:n.stale,fetchedAt:new Date(n.storedAt).toISOString()}}async function S(e,t){let r=l(`https://seasonal-api.open-meteo.com/v1/seasonal?${m(e,t)}&weekly=temperature_2m_anomaly,precipitation_anomaly,temperature_2m_anomaly_gt0,precipitation_anomaly_gt0,temperature_2m_efi,precipitation_efi,temperature_2m_mean,precipitation_mean`),n=await (0,i.Y)(`om:ec46:${(0,o.g)(e,t,.1)}`,21600,async()=>u(await (0,a.fetchJson)(r,{provider:d,timeoutMs:25e3}),"EC46 weekly"));return{weekly:c(n.value.weekly),stale:n.stale,fetchedAt:new Date(n.storedAt).toISOString()}}async function R(e,t){let r=l(`https://seasonal-api.open-meteo.com/v1/seasonal?${m(e,t)}&monthly=temperature_2m_anomaly,precipitation_anomaly,temperature_2m_mean,precipitation_mean`),n=await (0,i.Y)(`om:seas5:${(0,o.g)(e,t,.1)}`,43200,async()=>u(await (0,a.fetchJson)(r,{provider:d,timeoutMs:25e3}),"SEAS5 monthly"));return{monthly:c(n.value.monthly),stale:n.stale,fetchedAt:new Date(n.storedAt).toISOString()}}let b=["pm10","pm2_5","carbon_monoxide","nitrogen_dioxide","sulphur_dioxide","ozone","aerosol_optical_depth","dust","uv_index","uv_index_clear_sky","european_aqi","us_aqi"];async function X(e,t){let n=l(`${s("air-quality-api")}/v1/air-quality?${m(e,t)}&current=${b.join(",")}&hourly=${b.join(",")}&timezone=auto&timeformat=unixtime&forecast_days=5`),p=await (0,i.Y)(`om:aq:${(0,o.g)(e,t,.05)}`,3600,async()=>u(await (0,a.fetchJson)(n,{provider:d}),"air-quality")),_=p.value,E=_.current&&"number"==typeof _.current.time?{time:(0,r.r)(_.current.time),values:Object.fromEntries(b.map(e=>[e,Number.isFinite(_.current[e])?_.current[e]:null]))}:null;return{meta:T(_),current:E,hourly:c(_.hourly),stale:p.stale,fetchedAt:new Date(p.storedAt).toISOString()}}let U=["wave_height","wave_direction","wave_period","wind_wave_height","swell_wave_height","swell_wave_direction","swell_wave_period","sea_surface_temperature","ocean_current_velocity","ocean_current_direction","sea_level_height_msl"];async function x(e,t){let n=l(`${s("marine-api")}/v1/marine?${m(e,t)}&current=${U.join(",")}&hourly=${U.join(",")}&timezone=auto&timeformat=unixtime&forecast_days=7`),p=await (0,i.Y)(`om:marine:${(0,o.g)(e,t,.05)}`,3600,async()=>u(await (0,a.fetchJson)(n,{provider:d}),"marine")),_=p.value,E=_.current&&"number"==typeof _.current.time?{time:(0,r.r)(_.current.time),values:Object.fromEntries(U.map(e=>[e,Number.isFinite(_.current[e])?_.current[e]:null]))}:null;return{meta:T(_),current:E,hourly:c(_.hourly),stale:p.stale,fetchedAt:new Date(p.storedAt).toISOString()}}async function I(e,t){let r=l(`https://flood-api.open-meteo.com/v1/flood?${m(e,t)}&daily=river_discharge,river_discharge_mean,river_discharge_median,river_discharge_max,river_discharge_min,river_discharge_p25,river_discharge_p75&past_days=60&forecast_days=30&timeformat=unixtime`),n=await (0,i.Y)(`om:flood:${(0,o.g)(e,t,.05)}`,21600,async()=>u(await (0,a.fetchJson)(r,{provider:d,timeoutMs:25e3}),"flood"));return{meta:T(n.value),daily:c(n.value.daily),stale:n.stale,fetchedAt:new Date(n.storedAt).toISOString()}}async function M(e,t){let r=l(`https://flood-api.open-meteo.com/v1/flood?${m(e,t)}&daily=river_discharge&start_date=1991-01-01&end_date=2020-12-31&timeformat=unixtime`);return{daily:c((await (0,i.Y)(`om:floodclim:${(0,o.g)(e,t,.05)}`,7776e3,async()=>u(await (0,a.fetchJson)(r,{provider:d,timeoutMs:4e4}),"flood climatology"))).value.daily)}}async function C(e,t,r,n,p){let _=l(`${s("archive-api")}/v1/archive?${m(e,t)}&start_date=${r}&end_date=${n}&daily=${p.join(",")}&timezone=auto&timeformat=unixtime&models=era5`),E=await (0,i.Y)(`om:arch:${(0,o.g)(e,t,.1)}:${r}:${n}:${p.join(",")}`,259200,async()=>u(await (0,a.fetchJson)(_,{provider:d,timeoutMs:6e4,retries:1}),"archive"));return{meta:T(E.value),daily:c(E.value.daily),stale:E.stale,fetchedAt:new Date(E.storedAt).toISOString()}}async function $(e,t,r,o){if(0===e.length)return[];if(e.length>150)throw new a.UpstreamError(d,"too many grid points");let n=e.map(e=>e.lat.toFixed(2)).join(","),T=e.map(e=>e.lon.toFixed(2)).join(","),m=l(`${s("api")}/v1/forecast?latitude=${n}&longitude=${T}&hourly=${t.join(",")}&timeformat=unixtime&forecast_hours=${r}&models=ecmwf_ifs025&cell_selection=nearest`);return(await (0,i.Y)(o,3600,async()=>{let e=await (0,a.fetchJson)(m,{provider:d,timeoutMs:3e4}),t=Array.isArray(e)?e:[e];return t.forEach(e=>u(e,"grid")),t})).value.map(e=>({lat:e.latitude,lon:e.longitude,hourly:c(e.hourly)}))}e.s(["Y",0,g,"V",0,{temperature:{v:"temperature_2m",unit:"°C"},precipitation:{v:"precipitation",unit:"mm/h"},wind:{v:"wind_speed_10m",unit:"km/h"},pressure:{v:"pressure_msl",unit:"hPa"},cloud:{v:"cloud_cover",unit:"%"},wind850:{v:"wind_speed_850hPa",unit:"km/h"},wind500:{v:"wind_speed_500hPa",unit:"km/h"},wind250:{v:"wind_speed_250hPa",unit:"km/h"}},"g",0,A,"S",0,X,"b",0,C,"Q",0,O,"u",0,v,"c",0,p,"N",0,_,"W",0,$,"d",0,x,"A",0,w,"X",0,L,"P",0,N,"F",0,I,"v",0,M,"j",0,R,"k",0,S,"p",0,c,"G",0,y])}],41790,(e,t,a)=>{!function(){"use strict";var e={431:function(e){function t(e){if("string"!=typeof e)throw TypeError("Path must be a string. Received "+JSON.stringify(e))}function a(e,t){for(var a,i="",r=0,o=-1,n=0,s=0;s<=e.length;++s){if(s<e.length)a=e.charCodeAt(s);else if(47===a)break;else a=47;if(47===a){if(o===s-1||1===n);else if(o!==s-1&&2===n){if(i.length<2||2!==r||46!==i.charCodeAt(i.length-1)||46!==i.charCodeAt(i.length-2)){if(i.length>2){var l=i.lastIndexOf("/");if(l!==i.length-1){-1===l?(i="",r=0):r=(i=i.slice(0,l)).length-1-i.lastIndexOf("/"),o=s,n=0;continue}}else if(2===i.length||1===i.length){i="",r=0,o=s,n=0;continue}}t&&(i.length>0?i+="/..":i="..",r=2)}else i.length>0?i+="/"+e.slice(o+1,s):i=e.slice(o+1,s),r=s-o-1;o=s,n=0}else 46===a&&-1!==n?++n:n=-1}return i}var i={resolve:function(){for(var e,i,r="",o=!1,n=arguments.length-1;n>=-1&&!o;n--)n>=0?i=arguments[n]:(void 0===e&&(e=""),i=e),t(i),0!==i.length&&(r=i+"/"+r,o=47===i.charCodeAt(0));if(r=a(r,!o),o)if(r.length>0)return"/"+r;else return"/";return r.length>0?r:"."},normalize:function(e){if(t(e),0===e.length)return".";var i=47===e.charCodeAt(0),r=47===e.charCodeAt(e.length-1);return(0!==(e=a(e,!i)).length||i||(e="."),e.length>0&&r&&(e+="/"),i)?"/"+e:e},isAbsolute:function(e){return t(e),e.length>0&&47===e.charCodeAt(0)},join:function(){if(0==arguments.length)return".";for(var e,a=0;a<arguments.length;++a){var r=arguments[a];t(r),r.length>0&&(void 0===e?e=r:e+="/"+r)}return void 0===e?".":i.normalize(e)},relative:function(e,a){if(t(e),t(a),e===a||(e=i.resolve(e))===(a=i.resolve(a)))return"";for(var r=1;r<e.length&&47===e.charCodeAt(r);++r);for(var o=e.length,n=o-r,s=1;s<a.length&&47===a.charCodeAt(s);++s);for(var l=a.length-s,d=n<l?n:l,u=-1,c=0;c<=d;++c){if(c===d){if(l>d){if(47===a.charCodeAt(s+c))return a.slice(s+c+1);else if(0===c)return a.slice(s+c)}else n>d&&(47===e.charCodeAt(r+c)?u=c:0===c&&(u=0));break}var T=e.charCodeAt(r+c);if(T!==a.charCodeAt(s+c))break;47===T&&(u=c)}var m="";for(c=r+u+1;c<=o;++c)(c===o||47===e.charCodeAt(c))&&(0===m.length?m+="..":m+="/..");return m.length>0?m+a.slice(s+u):(s+=u,47===a.charCodeAt(s)&&++s,a.slice(s))},_makeLong:function(e){return e},dirname:function(e){if(t(e),0===e.length)return".";for(var a=e.charCodeAt(0),i=47===a,r=-1,o=!0,n=e.length-1;n>=1;--n)if(47===(a=e.charCodeAt(n))){if(!o){r=n;break}}else o=!1;return -1===r?i?"/":".":i&&1===r?"//":e.slice(0,r)},basename:function(e,a){if(void 0!==a&&"string"!=typeof a)throw TypeError('"ext" argument must be a string');t(e);var i,r=0,o=-1,n=!0;if(void 0!==a&&a.length>0&&a.length<=e.length){if(a.length===e.length&&a===e)return"";var s=a.length-1,l=-1;for(i=e.length-1;i>=0;--i){var d=e.charCodeAt(i);if(47===d){if(!n){r=i+1;break}}else -1===l&&(n=!1,l=i+1),s>=0&&(d===a.charCodeAt(s)?-1==--s&&(o=i):(s=-1,o=l))}return r===o?o=l:-1===o&&(o=e.length),e.slice(r,o)}for(i=e.length-1;i>=0;--i)if(47===e.charCodeAt(i)){if(!n){r=i+1;break}}else -1===o&&(n=!1,o=i+1);return -1===o?"":e.slice(r,o)},extname:function(e){t(e);for(var a=-1,i=0,r=-1,o=!0,n=0,s=e.length-1;s>=0;--s){var l=e.charCodeAt(s);if(47===l){if(!o){i=s+1;break}continue}-1===r&&(o=!1,r=s+1),46===l?-1===a?a=s:1!==n&&(n=1):-1!==a&&(n=-1)}return -1===a||-1===r||0===n||1===n&&a===r-1&&a===i+1?"":e.slice(a,r)},format:function(e){var t,a;if(null===e||"object"!=typeof e)throw TypeError('The "pathObject" argument must be of type Object. Received type '+typeof e);return t=e.dir||e.root,a=e.base||(e.name||"")+(e.ext||""),t?t===e.root?t+a:t+"/"+a:a},parse:function(e){t(e);var a,i={root:"",dir:"",base:"",ext:"",name:""};if(0===e.length)return i;var r=e.charCodeAt(0),o=47===r;o?(i.root="/",a=1):a=0;for(var n=-1,s=0,l=-1,d=!0,u=e.length-1,c=0;u>=a;--u){if(47===(r=e.charCodeAt(u))){if(!d){s=u+1;break}continue}-1===l&&(d=!1,l=u+1),46===r?-1===n?n=u:1!==c&&(c=1):-1!==n&&(c=-1)}return -1===n||-1===l||0===c||1===c&&n===l-1&&n===s+1?-1!==l&&(0===s&&o?i.base=i.name=e.slice(1,l):i.base=i.name=e.slice(s,l)):(0===s&&o?(i.name=e.slice(1,n),i.base=e.slice(1,l)):(i.name=e.slice(s,n),i.base=e.slice(s,l)),i.ext=e.slice(n,l)),s>0?i.dir=e.slice(0,s-1):o&&(i.dir="/"),i},sep:"/",delimiter:":",win32:null,posix:null};i.posix=i,e.exports=i}},a={};function i(t){var r=a[t];if(void 0!==r)return r.exports;var o=a[t]={exports:{}},n=!0;try{e[t](o,o.exports,i),n=!1}finally{n&&delete a[t]}return o.exports}i.ab="/ROOT/node_modules/next/dist/compiled/path-browserify/",t.exports=i(431)}()}]);